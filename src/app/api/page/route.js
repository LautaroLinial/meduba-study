// ============================================================
// API ROUTE - /api/page
// Renderiza UNA SOLA página del PDF como imagen JPEG.
// Caché local en data/page-cache/ para que la 2da carga sea instantánea.
// Si no hay PDF local, lo descarga de R2 automáticamente.
// ============================================================

import fs from "fs";
import path from "path";
import * as mupdf from "mupdf";

const PAGE_CACHE_DIR = path.join(process.cwd(), "data", "page-cache");
const LOCAL_PDF_DIR  = path.join(process.cwd(), "data", "cache_libros");

function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year    = searchParams.get("year");
    const materia = searchParams.get("materia");
    const libro   = searchParams.get("libro");
    const pageStr = searchParams.get("page");

    if (!year || !materia || !libro || !pageStr) {
      return new Response("Faltan parámetros", { status: 400 });
    }

    const pageNum    = parseInt(pageStr, 10);
    const libroSafe  = safeFileName(libro);
    const pdfKey     = `${year}_${materia}_${libroSafe}.pdf`;
    const cacheFile  = path.join(PAGE_CACHE_DIR, `${libroSafe}_page_${pageNum}.jpg`);

    // ─── 1. Servir desde caché si existe ───────────────────────────────────
    if (fs.existsSync(cacheFile)) {
      const img = fs.readFileSync(cacheFile);
      return new Response(img, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" },
      });
    }

    // ─── 2. Obtener el PDF (local o desde R2) ──────────────────────────────
    let pdfBuffer;

    const localPath = path.join(LOCAL_PDF_DIR, pdfKey);
    if (fs.existsSync(localPath)) {
      pdfBuffer = fs.readFileSync(localPath);
    } else {
      // Descargar de R2 (solo la primera vez — después queda en caché)
      const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
      if (!publicUrl) return new Response("NEXT_PUBLIC_R2_URL no configurada", { status: 500 });

      const res = await fetch(`${publicUrl}/${pdfKey}`);
      if (!res.ok) return new Response("PDF no encontrado en R2", { status: 404 });
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    }

    // ─── 3. Renderizar la página con mupdf ─────────────────────────────────
    const doc      = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
    const total    = doc.countPages();
    const pageIdx  = Math.max(0, Math.min(pageNum - 1, total - 1)); // 0-indexed

    const page     = doc.loadPage(pageIdx);
    const scale    = 1.8; // resolución cómoda para leer
    const matrix   = mupdf.Matrix.scale(scale, scale);
    const pixmap   = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const jpegData = pixmap.asJPEG(88, false);

    // ─── 4. Guardar en caché ───────────────────────────────────────────────
    ensureDir(PAGE_CACHE_DIR);
    fs.writeFileSync(cacheFile, jpegData);

    return new Response(jpegData, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" },
    });

  } catch (error) {
    console.error("❌ ERROR EN API/PAGE:", error);
    return new Response(error.message, { status: 500 });
  }
}
