// ============================================================
// API ROUTE - /api/chat
// Este archivo conecta tu web con Claude (la IA)
// El usuario NO ve este archivo, corre en el servidor
// ============================================================

import { NextResponse } from "next/server";
import { buildSystemPrompt, buildQueryPrompt } from "@/lib/systemPrompt";
import { getMateria, CURRICULUM } from "@/lib/curriculum";

export async function POST(request) {
  try {
    const { message, year, materia: materiaKey, history } = await request.json();

    // Verificar que la API key está configurada
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

    // Construir el system prompt
    const systemPrompt = buildSystemPrompt({
      materia: materia.name,
      año: yearData.name,
      libros: materia.libros,
      material: "", // Acá se va a inyectar el material cargado cuando implementemos la base de datos
    });

    // Construir el historial de mensajes para Claude
    const claudeMessages = [];

    // Agregar historial previo (últimos mensajes)
    if (history && history.length > 0) {
      history.forEach((msg) => {
        claudeMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Agregar el mensaje actual
    claudeMessages.push({
      role: "user",
      content: buildQueryPrompt(message, ""), // El segundo parámetro será el contexto del material cargado
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
        max_tokens: 4096,
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

    // Extraer el texto de la respuesta
    const responseText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ response: responseText });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}