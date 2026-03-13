// ============================================================
// API ROUTE - /api/extract-toc
// Extrae el índice/tabla de contenidos de un libro usando Claude
// Soporta: migración de libros existentes + extracción on-demand
// ============================================================

import { NextResponse } from "next/server";
import { saveTOC, loadTOC } from "@/lib/materialStore";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // La extracción puede tardar

/**
 * POST /api/extract-toc
 * Body: { year, materia, libro, force? }
 *
 * Lee los fragmentos ya guardados (primeras ~30 páginas) y usa Claude
 * para extraer el índice estructurado del libro.
 */
export async function POST(request) {
  try {
    const { year, materia, libro, force } = await request.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API key no configurada" }, { status: 500 });
    }
    if (!year || !materia || !libro) {
      return NextResponse.json({ error: "Faltan year, materia o libro" }, { status: 400 });
    }

    // Verificar si ya existe un TOC (salvo force=true)
    if (!force) {
      const existing = loadTOC(year, materia, libro);
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "TOC ya existe. Usá force=true para re-extraer.",
          entries: existing.entries.length,
          toc: existing,
        });
      }
    }

    // Cargar fragmentos del libro
    const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materia}.json`);
    if (!fs.existsSync(materialesPath)) {
      return NextResponse.json({ error: "No hay material cargado para esta materia" }, { status: 404 });
    }

    const raw = fs.readFileSync(materialesPath, "utf-8");
    const data = JSON.parse(raw);
    const bookFragments = data.fragments.filter((f) => f.libro === libro);

    if (bookFragments.length === 0) {
      return NextResponse.json({ error: `No se encontraron fragmentos del libro "${libro}"` }, { status: 404 });
    }

    // Tomar texto de las primeras ~30 páginas (donde suele estar el índice)
    const tocPages = bookFragments
      .filter((f) => f.page && f.page <= 30)
      .sort((a, b) => a.page - b.page);

    // Si no hay suficientes páginas iniciales, tomar las primeras por orden
    const fragments = tocPages.length >= 5 ? tocPages : bookFragments.slice(0, 30);
    const tocText = fragments.map((f) => `[Página ${f.page}]\n${f.text}`).join("\n\n---\n\n");

    // También buscar si hay un índice analítico al final del libro
    const lastPages = bookFragments
      .filter((f) => f.page)
      .sort((a, b) => b.page - a.page)
      .slice(0, 10);

    // Verificar si las últimas páginas parecen un índice analítico
    const lastPagesText = lastPages
      .filter((f) => {
        const text = f.text.toLowerCase();
        return text.includes("índice") || text.includes("indice") ||
               text.includes("contenido") || text.includes("capítulo") ||
               text.includes("capitulo") || text.includes("sección") ||
               text.includes("seccion");
      })
      .map((f) => `[Página ${f.page}]\n${f.text}`)
      .join("\n\n---\n\n");

    const fullText = lastPagesText
      ? `PRIMERAS PÁGINAS:\n${tocText}\n\n===\n\nÚLTIMAS PÁGINAS (posible índice analítico):\n${lastPagesText}`
      : tocText;

    // Truncar si es muy largo (max ~15000 chars para no exceder contexto)
    const truncated = fullText.substring(0, 15000);

    // Enviar a Claude para extraer el TOC
    console.log(`[extract-toc] Extrayendo TOC de "${libro}" (${fragments.length} fragmentos, ${truncated.length} chars)`);

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
            content: buildTOCExtractionPrompt(truncated),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[extract-toc] Error API:", errorText);
      return NextResponse.json({ error: "Error al extraer TOC", details: errorText }, { status: 500 });
    }

    const result = await response.json();
    const responseText = result.content?.[0]?.text || "";

    // Parsear el JSON del response
    let entries;
    try {
      // Buscar el JSON en la respuesta (puede estar envuelto en ```json...```)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No se encontró JSON array en la respuesta");
      }
      entries = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[extract-toc] Error parseando respuesta:", parseError.message);
      console.error("[extract-toc] Respuesta raw:", responseText.substring(0, 500));
      return NextResponse.json({
        error: "Error parseando el TOC extraído",
        details: parseError.message,
        rawResponse: responseText.substring(0, 1000),
      }, { status: 500 });
    }

    // Validar y limpiar entries
    const cleanEntries = entries
      .filter((e) => e.title && typeof e.page === "number")
      .map((e) => ({
        title: e.title.trim(),
        page: e.page,
        level: e.level || 1,
      }));

    if (cleanEntries.length === 0) {
      return NextResponse.json({ error: "No se pudieron extraer entradas del TOC" }, { status: 500 });
    }

    // Guardar TOC
    const toc = saveTOC(year, materia, libro, cleanEntries);

    return NextResponse.json({
      success: true,
      message: `TOC extraído: ${cleanEntries.length} entradas`,
      entries: cleanEntries.length,
      toc,
    });
  } catch (error) {
    console.error("[extract-toc] Error fatal:", error);
    return NextResponse.json({ error: "Error interno", details: error.message }, { status: 500 });
  }
}

function buildTOCExtractionPrompt(text) {
  return `Analizá este texto extraído de las primeras y últimas páginas de un libro de medicina (anatomía). Tu tarea es extraer la TABLA DE CONTENIDOS / ÍNDICE del libro.

INSTRUCCIONES:
1. Identificá los capítulos, secciones y subsecciones con sus números de página
2. Incluí TODOS los temas que encuentres, especialmente:
   - Capítulos principales (level: 1)
   - Secciones dentro de capítulos (level: 2)
   - Subsecciones importantes (level: 3)
3. Los números de página deben ser los que aparecen en el texto original
4. Si hay un "Índice analítico" o "Índice alfabético", extraé las entradas principales también

FORMATO DE RESPUESTA: Respondé SOLO con un JSON array, sin texto adicional:
[
  {"title": "Nombre del capítulo o sección", "page": 123, "level": 1},
  {"title": "Subsección", "page": 125, "level": 2},
  ...
]

level 1 = capítulo principal
level 2 = sección dentro de un capítulo
level 3 = subsección

TEXTO DEL LIBRO:
${text}

JSON:`;
}
