// ============================================================
// API ROUTE - /api/chat
// Recibe la pregunta, busca material relevante, y le pide
// a Claude que responda basándose en ese material
// ============================================================

import { NextResponse } from "next/server";
import { buildSystemPrompt, buildQueryPrompt } from "@/lib/systemPrompt";
import { getMateria, CURRICULUM } from "@/lib/curriculum";
import { searchMaterial } from "@/lib/materialStore";

export async function POST(request) {
  try {
    const { message, year, materia: materiaKey, history } = await request.json();

    // Verificar API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key no configurada. Revisá tu archivo .env.local" },
        { status: 500 }
      );
    }

    // Obtener datos de la materia
    const materia = getMateria(year, materiaKey);
    if (!materia) {
      return NextResponse.json(
        { error: "Materia no encontrada" },
        { status: 400 }
      );
    }

    const yearData = CURRICULUM[year];

    // ============================================================
    // BUSCAR MATERIAL RELEVANTE
    // ============================================================
    const relevantFragments = searchMaterial(year, materiaKey, message);

    let materialContext = "";
    if (relevantFragments.length > 0) {
      materialContext = relevantFragments
        .map((f, i) => `--- Fragmento ${i + 1} (${f.libro}) ---\n${f.text.substring(0, 1500)}`)
        .join("\n\n");
    }

    // Construir el system prompt con el material encontrado
    const systemPrompt = buildSystemPrompt({
      materia: materia.name,
      año: yearData.name,
      libros: materia.libros,
      material: materialContext,
    });

    // Construir el historial de mensajes para Claude
    const claudeMessages = [];

    if (history && history.length > 0) {
      history.forEach((msg) => {
        claudeMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Agregar el mensaje actual con el contexto del material
    claudeMessages.push({
      role: "user",
      content: buildQueryPrompt(message, materialContext),
    });

    // Llamar a la API de Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error de API de Claude:", errorData);
      return NextResponse.json(
        {
          error: `Error de la API: ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const responseText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Agregar info sobre las fuentes usadas
    let sourcesNote = "";
    if (relevantFragments.length > 0) {
      const librosUsados = [...new Set(relevantFragments.map((f) => f.libro))];
      sourcesNote = `\n\n---\n📚 *Fuentes consultadas: ${librosUsados.join(", ")}*`;
    }

    return NextResponse.json({
      response: responseText + sourcesNote,
      sourcesUsed: relevantFragments.length,
    });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}