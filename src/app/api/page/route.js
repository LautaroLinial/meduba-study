// ============================================================
// API ROUTE - /api/page
// Devuelve la URL pública de R2 para mostrar el PDF en el iframe.
// Usa NEXT_PUBLIC_R2_URL (dominio público de Cloudflare) que no
// tiene restricciones CORS y funciona perfecto en iframes.
// ============================================================

import { NextResponse } from "next/server";

function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");
    const libro = searchParams.get("libro");
    const pageStr = searchParams.get("page");

    if (!year || !materia || !libro || !pageStr) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const libroSafe = safeFileName(libro);
    const pdfKey = `${year}_${materia}_${libroSafe}.pdf`;
    const baseUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");

    if (!baseUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_R2_URL no configurada" }, { status: 500 });
    }

    // URL pública directa — sin CORS, funciona en iframe, soporta range requests
    const signedUrl = `${baseUrl}/${pdfKey}`;

    return NextResponse.json({ signedUrl, page: parseInt(pageStr, 10) });
  } catch (error) {
    console.error("❌ ERROR EN API/PAGE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
