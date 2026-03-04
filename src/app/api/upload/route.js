// ============================================================
// API ROUTE - /api/upload
// Extrae texto + pre-genera PDF individual por página
// Upload tarda más pero las páginas cargan instantáneo
// ============================================================

import { NextResponse } from "next/server";
import { saveMaterialWithPages } from "@/lib/materialStore";
import { PDFDocument } from "pdf-lib";
import * as mupdf from "mupdf";
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

function splitPageText(text, maxWords = 400) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const fragments = [];
  let current = [];

  words.forEach((word) => {
    current.push(word);
    if (current.length >= maxWords) {
      fragments.push(current.join(" "));
      current = [];
    }
  });

  if (current.length > 0) fragments.push(current.join(" "));
  return fragments;
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const year = formData.get("year");
    const materia = formData.get("materia");
    const libro = formData.get("libro");
    const pageOffset = parseInt(formData.get("pageOffset") || "0");

    if (!file || !year || !materia || !libro) {
      return NextResponse.json(
        { error: "Faltan datos." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    let fragments = [];
    let totalPages = 0;

    if (fileName.endsWith(".pdf")) {
      try {
        ensureDir(PDF_DIR);
        ensureDir(CACHE_DIR);

        // Guardar PDF original
        const pdfFileName = `${year}_${materia}_${safeFileName(libro)}.pdf`;
        const pdfPath = path.join(PDF_DIR, pdfFileName);
        fs.writeFileSync(pdfPath, buffer);

        // Guardar metadata
        const metaPath = path.join(PDF_DIR, `${year}_${materia}_${safeFileName(libro)}_meta.json`);
        fs.writeFileSync(metaPath, JSON.stringify({
          libro, pageOffset, fileName: pdfFileName,
          year: parseInt(year), materia
        }));

        // === PASO 1: Extraer texto con mupdf ===
        const doc = mupdf.Document.openDocument(buffer, "application/pdf");
        totalPages = doc.countPages();
        console.log(`PDF: ${totalPages} páginas, offset: ${pageOffset}`);

        for (let i = 0; i < totalPages; i++) {
          const page = doc.loadPage(i);
          const pageText = page.toStructuredText("preserve-whitespace").asText();
          const pdfPage = i + 1;
          const bookPage = pdfPage + pageOffset;

          if (pageText.trim().length < 20) continue;

          const subFragments = splitPageText(pageText.trim());
          subFragments.forEach((fragText) => {
            fragments.push({ text: fragText, page: bookPage });
          });

          if (pdfPage % 100 === 0) console.log(`Texto: ${pdfPage}/${totalPages}`);
        }

        console.log(`Texto extraído: ${fragments.length} fragmentos`);

        // === PASO 2: Pre-extraer cada página como PDF individual ===
        console.log("Pre-generando páginas individuales...");
        const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const libroSafe = safeFileName(libro);

        for (let i = 0; i < totalPages; i++) {
          const pdfPage = i + 1;
          const cacheFileName = `${libroSafe}_page_${pdfPage}.pdf`;
          const cachePath = path.join(CACHE_DIR, cacheFileName);

          // Solo generar si no existe
          if (!fs.existsSync(cachePath)) {
            const newDoc = await PDFDocument.create();
            const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
            newDoc.addPage(copiedPage);
            const pageBytes = await newDoc.save();
            fs.writeFileSync(cachePath, Buffer.from(pageBytes));
          }

          if (pdfPage % 100 === 0) console.log(`Páginas PDF: ${pdfPage}/${totalPages}`);
        }

        console.log(`Pre-generación completa: ${totalPages} páginas`);

      } catch (pdfError) {
        console.error("Error al procesar PDF:", pdfError);
        return NextResponse.json(
          { error: "No se pudo procesar el PDF. Error: " + pdfError.message },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      const text = buffer.toString("utf-8");
      if (text.trim().length < 50) {
        return NextResponse.json({ error: "Archivo sin suficiente texto." }, { status: 400 });
      }
      const textFragments = splitPageText(text.trim());
      fragments = textFragments.map((t) => ({ text: t, page: null }));
    } else if (fileName.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        if (result.value.trim().length < 50) {
          return NextResponse.json({ error: "Archivo Word sin suficiente texto." }, { status: 400 });
        }
        const textFragments = splitPageText(result.value.trim());
        fragments = textFragments.map((t) => ({ text: t, page: null }));
      } catch (docError) {
        return NextResponse.json({ error: "No se pudo leer el Word." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Formato no soportado." }, { status: 400 });
    }

    if (fragments.length === 0) {
      return NextResponse.json({ error: "No se extrajo texto." }, { status: 400 });
    }

    const result = saveMaterialWithPages({
      year: parseInt(year), materia, libro, fragments,
    });

    return NextResponse.json({
      success: true,
      message: `Se cargaron ${result.added} fragmentos del libro "${libro}" (${totalPages} páginas pre-generadas para vista rápida)`,
      fragmentsAdded: result.added,
      totalFragments: result.total,
      totalPages: totalPages,
    });

  } catch (error) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json(
      { error: "Error interno: " + error.message },
      { status: 500 }
    );
  }
}