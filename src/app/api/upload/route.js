import { NextResponse } from "next/server";
import { saveMaterialWithPages } from "@/lib/materialStore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as mupdf from "mupdf";
import { pdfDocCache } from "@/lib/pdfDocCache";
import { splitAndUploadPages } from "@/lib/pdfPageSplitter";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function safeFileName(libro) {
  return libro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 80);
}

function splitPageText(text, maxWords = 400) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const fragments = []; let current = [];
  words.forEach((word) => { current.push(word); if (current.length >= maxWords) { fragments.push(current.join(" ")); current = []; } });
  if (current.length > 0) fragments.push(current.join(" "));
  return fragments;
}

// ============================================================
// PRE-RENDER EN BACKGROUND
// Usa el doc ya cargado en memoria (sin re-descargar el PDF)
// para renderizar todas las páginas y subirlas a R2 como JPEG.
// Se ejecuta en segundo plano — el upload ya respondió al admin.
//
// Resultado: todos los alumnos ven carga instantánea en R2.
// ============================================================
async function preRenderAllPages(doc, totalPages, pdfKeyBase) {
  const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
  const BATCH = 3; // páginas en paralelo (balancear CPU y red)
  let rendered = 0;
  let skipped  = 0;

  console.log(`[pre-render] Iniciando: ${totalPages} páginas de ${pdfKeyBase}`);

  for (let i = 0; i < totalPages; i += BATCH) {
    const batch = Array.from({ length: Math.min(BATCH, totalPages - i) }, (_, j) => i + j);

    await Promise.all(batch.map(async (pageIdx) => {
      const pageNum  = pageIdx + 1;
      const imageKey = `cache/${pdfKeyBase}_p${pageNum}.jpg`;
      const imageUrl = `${publicUrl}/${imageKey}`;

      // Saltar si ya está cacheada en R2
      try {
        const check = await fetch(imageUrl, { method: "HEAD" });
        if (check.ok) { skipped++; return; }
      } catch {}

      // Renderizar con mupdf (~200ms)
      try {
        const page    = doc.loadPage(pageIdx);
        const pixmap  = page.toPixmap(mupdf.Matrix.scale(2.0, 2.0), mupdf.ColorSpace.DeviceRGB, false, true);
        const jpeg    = Buffer.from(pixmap.asJPEG(85, false));

        // Subir JPEG a R2
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: imageKey,
          Body: jpeg,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        }));
        rendered++;
      } catch (err) {
        console.error(`[pre-render] Error en página ${pageNum}: ${err.message}`);
      }
    }));

    // Log de progreso cada 50 páginas
    if ((i + BATCH) % 50 < BATCH) {
      console.log(`[pre-render] ${i + BATCH}/${totalPages} páginas procesadas (${rendered} nuevas, ${skipped} ya existían)`);
    }
  }

  console.log(`[pre-render] ✅ Completado: ${rendered} páginas nuevas, ${skipped} ya estaban en R2`);
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file      = formData.get("file");
    const year      = formData.get("year");
    const materia   = formData.get("materia");
    const libro     = formData.get("libro");
    const pageOffset = parseInt(formData.get("pageOffset") || "0");

    if (!file || !year || !materia || !libro) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    const bytes       = await file.arrayBuffer();
    const buffer      = Buffer.from(bytes);
    const pdfFileName = `${year}_${materia}_${safeFileName(libro)}.pdf`;
    const pdfKeyBase  = pdfFileName.replace(".pdf", "");

    // ── PASO 1: Subir PDF a R2 ────────────────────────────────────
    console.log(`Subiendo ${pdfFileName} a Cloudflare R2...`);
    await new Upload({
      client: s3Client,
      params: { Bucket: process.env.R2_BUCKET_NAME, Key: pdfFileName, Body: buffer, ContentType: "application/pdf" },
    }).done();
    console.log("¡Subida completada!");

    // ── PASO 2: Extraer texto con mupdf ──────────────────────────
    const doc        = mupdf.Document.openDocument(buffer, "application/pdf");
    const totalPages = doc.countPages();
    let fragments    = [];

    for (let i = 0; i < totalPages; i++) {
      const page     = doc.loadPage(i);
      const pageText = page.toStructuredText("preserve-whitespace").asText();
      if (pageText.trim().length < 20) continue;

      splitPageText(pageText.trim()).forEach((fragText) => {
        fragments.push({ text: fragText, page: i + 1 + pageOffset });
      });
    }

    saveMaterialWithPages({ year: parseInt(year), materia, libro, fragments });

    // ── PASO 3: Guardar doc en cache compartido ───────────────────
    // render-page lo usará sin re-descargar el PDF
    pdfDocCache.set(pdfFileName, { doc, totalPages });
    console.log(`[upload] PDF guardado en pdfDocCache: ${pdfFileName}`);

    // ── PASO 4: Pre-render de todas las páginas en background ─────
    // No awaiteamos — el admin recibe la respuesta de inmediato
    // y el render ocurre en segundo plano usando el doc en memoria
    preRenderAllPages(doc, totalPages, pdfKeyBase).catch((err) =>
      console.error("[pre-render] Error fatal:", err.message)
    );

    // ── PASO 5: Split de páginas individuales en background ─────
    // Cada página se guarda como PDF individual en R2 para carga instantánea
    splitAndUploadPages(buffer, pdfKeyBase, totalPages).catch((err) =>
      console.error("[split-pages] Error fatal:", err.message)
    );

    return NextResponse.json({
      success: true,
      message: `¡Libro en la nube! ${totalPages} páginas procesadas. Las imágenes se están generando en segundo plano.`,
    });

  } catch (error) {
    console.error("Error fatal en el upload:", error);
    return NextResponse.json({ error: "Error en el servidor: " + error.message }, { status: 500 });
  }
}
