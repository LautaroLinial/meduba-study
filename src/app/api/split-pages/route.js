// ============================================================
// API ROUTE - /api/split-pages
// Migración: splitea un libro ya subido en páginas individuales.
// POST { year, materia, libro }
// ============================================================

import { NextResponse } from "next/server";
import { splitAndUploadPages, safeFileName } from "@/lib/pdfPageSplitter";
import * as mupdf from "mupdf";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { year, materia, libro } = await request.json();

    if (!year || !materia || !libro) {
      return NextResponse.json(
        { error: "Faltan parámetros: year, materia, libro" },
        { status: 400 }
      );
    }

    const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
    if (!publicUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_R2_URL no configurada" },
        { status: 500 }
      );
    }

    const libroSafe = safeFileName(libro);
    const pdfKey = `${year}_${materia}_${libroSafe}.pdf`;
    const pdfKeyBase = pdfKey.replace(".pdf", "");
    const pdfUrl = `${publicUrl}/${pdfKey}`;

    // Descargar el PDF completo desde R2
    console.log(`[split-pages] Descargando ${pdfKey} desde R2...`);
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `PDF no encontrado en R2: ${pdfKey}` },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Contar páginas con mupdf
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    const totalPages = doc.countPages();

    // Lanzar split en background y responder inmediatamente
    splitAndUploadPages(buffer, pdfKeyBase, totalPages).catch((err) =>
      console.error("[split-pages] Error fatal:", err.message)
    );

    return NextResponse.json({
      success: true,
      message: `Spliteo iniciado: ${totalPages} páginas de ${libro}. Procesando en segundo plano.`,
      totalPages,
    });
  } catch (error) {
    console.error("[split-pages] Error:", error);
    return NextResponse.json(
      { error: "Error interno: " + error.message },
      { status: 500 }
    );
  }
}
