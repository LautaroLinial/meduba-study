// ============================================================
// API ROUTE - /api/page
// Extrae UNA página del PDF y la cachea en disco
// Primera vez: ~10s. Después: instantáneo.
// ============================================================

import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

const PDF_DIR = path.join(process.cwd(), "data", "pdfs");
const CACHE_DIR = path.join(process.cwd(), "data", "page-cache");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

function findPdf(year, materia, libro) {
  const metaPath = path.join(PDF_DIR, `${year}_${materia}_${safeFileName(libro)}_meta.json`);

  if (!fs.existsSync(metaPath)) {
    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith("_meta.json"));
    for (const file of files) {
      const meta = JSON.parse(fs.readFileSync(path.join(PDF_DIR, file), "utf-8"));
      if (meta.libro && libro.toLowerCase().includes(meta.libro.toLowerCase().split(" - ")[0].split("&")[0].trim().split(" ")[0].toLowerCase())) {
        return meta;
      }
    }
    return null;
  }

  return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");
    const libro = searchParams.get("libro");
    const bookPage = parseInt(searchParams.get("page"));

    if (!year || !materia || !libro || isNaN(bookPage)) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const meta = findPdf(year, materia, libro);
    if (!meta) {
      return NextResponse.json({ error: "PDF no encontrado" }, { status: 404 });
    }

    const pdfPath = path.join(PDF_DIR, meta.fileName);
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: "Archivo PDF no encontrado" }, { status: 404 });
    }

    const pdfPage = bookPage - meta.pageOffset;

    // Verificar si ya está en caché
    ensureDir(CACHE_DIR);
    const cacheFileName = `${safeFileName(meta.libro)}_page_${pdfPage}.pdf`;
    const cachePath = path.join(CACHE_DIR, cacheFileName);

    let singlePageBytes;

    if (fs.existsSync(cachePath)) {
      // Cargar desde caché (instantáneo)
      singlePageBytes = fs.readFileSync(cachePath);
    } else {
      // Extraer la página y guardar en caché
      const pdfBytes = fs.readFileSync(pdfPath);
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      if (pdfPage < 1 || pdfPage > totalPages) {
        return NextResponse.json({ error: `Página fuera de rango` }, { status: 404 });
      }

      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pdfPage - 1]);
      newDoc.addPage(copiedPage);

      singlePageBytes = await newDoc.save();

      // Guardar en caché para la próxima vez
      fs.writeFileSync(cachePath, Buffer.from(singlePageBytes));
    }

    return new NextResponse(singlePageBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": "inline",
      },
    });

  } catch (error) {
    console.error("Error en /api/page:", error);
    return NextResponse.json({ error: "Error: " + error.message }, { status: 500 });
  }
}