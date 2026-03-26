import { NextResponse } from "next/server";
import { saveMaterialWithPages, saveTOC } from "@/lib/materialStore";
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

/**
 * Auto-detecta el offset entre el índice PDF (0-based) y el número de página impresa.
 * Escanea varias páginas del PDF buscando números de página al inicio/final del texto.
 * Retorna el offset más probable: printedPage = pdfIndex + 1 + offset
 */
function autoDetectPageOffset(doc, totalPages) {
  const candidates = [];
  // Muestrear páginas en diferentes zonas del libro (saltar las primeras 5 que suelen ser portada/índice)
  const samplesToTry = [];
  for (let i = 5; i < Math.min(totalPages, 80); i += 3) samplesToTry.push(i);

  for (const pdfIdx of samplesToTry) {
    try {
      const page = doc.loadPage(pdfIdx);
      const text = page.toStructuredText("preserve-whitespace").asText().trim();
      if (text.length < 50) continue;

      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 3) continue;

      // Buscar número de página al inicio (primera línea) o al final (última línea)
      // Los libros de texto médicos suelen poner el número solo o con el título del capítulo
      const checkLines = [
        lines[0],                    // primera línea
        lines[lines.length - 1],     // última línea
        lines[1],                    // segunda línea (a veces la primera es header)
        lines[lines.length - 2],     // penúltima
      ];

      for (const line of checkLines) {
        // Patrón: línea que es solo un número, o empieza/termina con un número de 1-4 dígitos
        const numOnlyMatch = line.match(/^(\d{1,4})$/);
        const numStartMatch = line.match(/^(\d{1,4})\s+[A-ZÁÉÍÓÚ]/);
        const numEndMatch = line.match(/[a-záéíóú.]\s+(\d{1,4})$/);

        let printedPage = null;
        if (numOnlyMatch) printedPage = parseInt(numOnlyMatch[1]);
        else if (numStartMatch) printedPage = parseInt(numStartMatch[1]);
        else if (numEndMatch) printedPage = parseInt(numEndMatch[1]);

        if (printedPage !== null && printedPage > 0 && printedPage < 5000) {
          const offset = printedPage - (pdfIdx + 1);
          // Offset razonable: entre -200 y +200
          if (Math.abs(offset) < 200) {
            candidates.push(offset);
            break; // una detección por página es suficiente
          }
        }
      }
    } catch (e) { continue; }
  }

  if (candidates.length < 3) {
    console.log(`[auto-offset] No se pudo detectar offset (solo ${candidates.length} muestras). Usando 0.`);
    return 0;
  }

  // Encontrar el offset más frecuente (moda)
  const freq = {};
  candidates.forEach(o => { freq[o] = (freq[o] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const bestOffset = parseInt(sorted[0][0]);
  const confidence = sorted[0][1] / candidates.length;

  console.log(`[auto-offset] Offset detectado: ${bestOffset} (confianza: ${(confidence * 100).toFixed(0)}%, ${candidates.length} muestras)`);
  console.log(`[auto-offset] Distribución:`, JSON.stringify(freq));

  return bestOffset;
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

// ============================================================
// EXTRAER TOC EN BACKGROUND
// Toma los fragmentos de las primeras páginas y usa Claude
// para identificar la tabla de contenidos del libro.
// ============================================================
async function extractTOCInBackground(fragments, year, materia, libro) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[extract-toc] No hay API key, saltando extracción de TOC");
    return;
  }

  // Tomar las primeras ~30 páginas
  const tocFragments = fragments
    .filter((f) => f.page && f.page <= 30)
    .sort((a, b) => a.page - b.page);

  if (tocFragments.length < 3) {
    console.warn("[extract-toc] Muy pocos fragmentos iniciales, saltando TOC");
    return;
  }

  const tocText = tocFragments
    .map((f) => `[Página ${f.page}]\n${f.text}`)
    .join("\n\n---\n\n")
    .substring(0, 15000);

  console.log(`[extract-toc] Extrayendo TOC de "${libro}" (${tocFragments.length} fragmentos)`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Analizá este texto de las primeras páginas de un libro de medicina. Extraé la TABLA DE CONTENIDOS con capítulos, secciones y sus páginas.

Respondé SOLO con un JSON array:
[{"title": "Nombre", "page": 123, "level": 1}, ...]

level 1 = capítulo, level 2 = sección, level 3 = subsección

TEXTO:
${tocText}

JSON:`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[extract-toc] Error API:", response.status);
      return;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error("[extract-toc] No se encontró JSON en la respuesta");
      return;
    }

    const entries = JSON.parse(jsonMatch[0])
      .filter((e) => e.title && typeof e.page === "number")
      .map((e) => ({ title: e.title.trim(), page: e.page, level: e.level || 1 }));

    saveTOC(year, materia, libro, entries);
    console.log(`[extract-toc] ✅ TOC extraído: ${entries.length} entradas para "${libro}"`);
  } catch (error) {
    console.error("[extract-toc] Error:", error.message);
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file      = formData.get("file");
    const year      = formData.get("year");
    const materia   = formData.get("materia");
    const libro     = formData.get("libro");
    const manualOffset = formData.get("pageOffset");

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

    // Auto-detectar offset si el usuario no lo especificó
    const pageOffset = (manualOffset !== null && manualOffset !== "")
      ? parseInt(manualOffset)
      : autoDetectPageOffset(doc, totalPages);

    console.log(`[upload] Usando offset: ${pageOffset} (${manualOffset ? "manual" : "auto-detectado"})`);

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

    // ── PASO 6: Extraer TOC en background ────────────────────────
    // Usa Claude para extraer el índice del libro automáticamente
    extractTOCInBackground(fragments, parseInt(year), materia, libro).catch((err) =>
      console.error("[extract-toc] Error fatal:", err.message)
    );

    return NextResponse.json({
      success: true,
      message: `¡Libro en la nube! ${totalPages} páginas procesadas (offset: ${pageOffset >= 0 ? "+" : ""}${pageOffset}, ${manualOffset ? "manual" : "auto-detectado"}). Las imágenes se están generando en segundo plano.`,
      pageOffset,
      offsetSource: manualOffset ? "manual" : "auto",
    });

  } catch (error) {
    console.error("Error fatal en el upload:", error);
    return NextResponse.json({ error: "Error en el servidor: " + error.message }, { status: 500 });
  }
}
