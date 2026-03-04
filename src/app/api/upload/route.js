// ============================================================
// API ROUTE - /api/upload
// Recibe PDFs, extrae el texto y lo guarda como fragmentos
// ============================================================

import { NextResponse } from "next/server";
import { saveMaterial } from "@/lib/materialStore";
import { extractText } from "unpdf";

// Dividir texto en fragmentos de ~500 palabras
function splitIntoFragments(text, maxWords = 500) {
  const cleanText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = cleanText.split(/\n\n+/);

  const fragments = [];
  let currentFragment = "";
  let currentWordCount = 0;

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return;

    const wordCount = trimmed.split(/\s+/).length;

    if (currentWordCount + wordCount > maxWords && currentFragment) {
      fragments.push(currentFragment.trim());
      currentFragment = trimmed;
      currentWordCount = wordCount;
    } else {
      currentFragment += (currentFragment ? "\n\n" : "") + trimmed;
      currentWordCount += wordCount;
    }
  });

  if (currentFragment.trim()) {
    fragments.push(currentFragment.trim());
  }

  return fragments;
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const year = formData.get("year");
    const materia = formData.get("materia");
    const libro = formData.get("libro");

    if (!file || !year || !materia || !libro) {
      return NextResponse.json(
        { error: "Faltan datos. Se necesita: file, year, materia, libro" },
        { status: 400 }
      );
    }

    let extractedText = "";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
      try {
        const uint8Array = new Uint8Array(buffer);
        const result = await extractText(uint8Array);
        
        // unpdf puede devolver el texto de varias formas
        if (typeof result === "string") {
          extractedText = result;
        } else if (result && typeof result.text === "string") {
          extractedText = result.text;
        } else if (result && Array.isArray(result.pages)) {
          extractedText = result.pages.join("\n\n");
        } else if (result && typeof result === "object") {
          // Intentar convertir a string cualquier resultado
          extractedText = JSON.stringify(result);
          // Si es un array de strings
          if (Array.isArray(result)) {
            extractedText = result.join("\n\n");
          }
        }

        // Asegurar que sea string
        extractedText = String(extractedText || "");

      } catch (pdfError) {
        console.error("Error al leer PDF:", pdfError);
        return NextResponse.json(
          { error: "No se pudo leer el PDF. Error: " + pdfError.message },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      extractedText = buffer.toString("utf-8");
    } else if (fileName.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (docError) {
        console.error("Error al leer DOCX:", docError);
        return NextResponse.json(
          { error: "No se pudo leer el archivo Word." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Formato no soportado. Usá PDF, TXT, MD o DOCX." },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: "No se pudo extraer suficiente texto del archivo. Puede ser un PDF escaneado (imagen). Probá con un PDF que tenga texto seleccionable." },
        { status: 400 }
      );
    }

    const fragments = splitIntoFragments(extractedText);

    const result = saveMaterial({
      year: parseInt(year),
      materia,
      libro,
      fragments,
    });

    return NextResponse.json({
      success: true,
      message: `Se cargaron ${result.added} fragmentos del libro "${libro}"`,
      fragmentsAdded: result.added,
      totalFragments: result.total,
      textLength: extractedText.length,
    });

  } catch (error) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el archivo: " + error.message },
      { status: 500 }
    );
  }
}