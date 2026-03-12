import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as mupdf from "mupdf";

// ============================================================
// RENDER-PAGE API
// Renderiza una página de PDF con mupdf en el servidor
// y la guarda como JPEG en R2 para carga instantánea futura.
//
// Capas de cache (de más rápida a más lenta):
//   1. memoryCache (Set)  → imagen ya renderizada en esta sesión → ~0ms
//   2. R2 HEAD check      → imagen en CDN de otra sesión        → ~1s
//   3. docCache (Map)     → PDF ya descargado en esta sesión    → ~200ms render
//   4. Descarga + render  → primera vez, PDF descargado de R2   → lento (1 vez)
// ============================================================

export const dynamic = "force-dynamic";

// Cache de imágenes ya renderizadas — evita HEAD request a R2
const memoryCache = new Set();

// Cache del documento mupdf — evita re-descargar el PDF (163MB) para cada página
// Clave: pdfKey  |  Valor: { doc: mupdf.Document, totalPages: number }
const docCache = new Map();

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function safeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year    = searchParams.get("year");
  const materia = searchParams.get("materia");
  const libro   = searchParams.get("libro");
  const page    = parseInt(searchParams.get("page"));

  if (!year || !materia || !libro || !page || isNaN(page)) {
    return Response.json({ error: "Faltan parámetros: year, materia, libro, page" }, { status: 400 });
  }

  const libroSafe = safeFileName(libro);
  const pdfKey    = `${year}_${materia}_${libroSafe}.pdf`;
  const imageKey  = `cache/${year}_${materia}_${libroSafe}_p${page}.jpg`;

  const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
  const imageUrl  = `${publicUrl}/${imageKey}`;

  // ── 1. Cache en memoria (instantáneo) ─────────────────────────
  if (memoryCache.has(imageKey)) {
    return Response.json({ imageUrl, cached: true });
  }

  // ── 2. Cache en R2 (HEAD request ~1s) ─────────────────────────
  try {
    const cacheCheck = await fetch(imageUrl, { method: "HEAD" });
    if (cacheCheck.ok) {
      memoryCache.add(imageKey);
      return Response.json({ imageUrl, cached: true });
    }
  } catch {
    // Cache miss — continuar con render
  }

  // ── 3. Obtener documento mupdf (de cache o descargando) ────────
  let doc;
  let totalPages;

  if (docCache.has(pdfKey)) {
    // PDF ya cargado en esta sesión del servidor — solo renderizar (~200ms)
    ({ doc, totalPages } = docCache.get(pdfKey));
  } else {
    // Descargar PDF completo desde R2 (lento la primera vez)
    const pdfUrl = `${publicUrl}/${pdfKey}`;
    let pdfBuffer;
    try {
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        return Response.json(
          { error: `PDF no encontrado en R2: ${pdfKey} (${pdfResponse.status})` },
          { status: 404 }
        );
      }
      pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    } catch (err) {
      return Response.json(
        { error: "Error descargando PDF: " + err.message },
        { status: 500 }
      );
    }

    try {
      doc        = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
      totalPages = doc.countPages();
      docCache.set(pdfKey, { doc, totalPages });
    } catch (err) {
      return Response.json(
        { error: "Error abriendo PDF con mupdf: " + err.message },
        { status: 500 }
      );
    }
  }

  // ── 4. Renderizar página con mupdf (~200ms) ────────────────────
  if (page < 1 || page > totalPages) {
    return Response.json(
      { error: `Página ${page} fuera de rango (1-${totalPages})` },
      { status: 400 }
    );
  }

  let jpegBuffer;
  try {
    const mupdfPage = doc.loadPage(page - 1); // mupdf usa índice 0
    // Escala 2.0 ≈ 144 DPI — alta calidad para textos médicos
    const matrix  = mupdf.Matrix.scale(2.0, 2.0);
    const pixmap  = mupdfPage.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    jpegBuffer    = Buffer.from(pixmap.asJPEG(85, false));
  } catch (err) {
    return Response.json(
      { error: "Error renderizando página: " + err.message },
      { status: 500 }
    );
  }

  // ── 5. Subir JPEG al cache de R2 ────────────────────────────────
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: imageKey,
      Body: jpegBuffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } catch (err) {
    // Error de cache no es crítico — la imagen se devuelve igual
    console.error("Advertencia: no se pudo guardar en cache R2:", err.message);
  }

  memoryCache.add(imageKey);
  return Response.json({ imageUrl, cached: false });
}
