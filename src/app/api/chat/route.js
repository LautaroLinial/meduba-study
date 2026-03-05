// ============================================================
// API ROUTE - /api/chat
// BÚSQUEDA HÍBRIDA con filtro por libros activos
// ============================================================

import { NextResponse } from "next/server";
import { buildSystemPrompt, buildQueryPrompt } from "@/lib/systemPrompt";
import { getMateria, CURRICULUM, getAllLibros } from "@/lib/curriculum";
import { searchMaterial } from "@/lib/materialStore";
import { semanticSearch, hasEmbeddings } from "@/lib/embeddings";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const { message, year, materia: materiaKey, history, activeLibros } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key no configurada." }, { status: 500 });
    }

    const materia = getMateria(year, materiaKey);
    if (!materia) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 400 });
    }

    const yearData = CURRICULUM[year];

    const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materiaKey}.json`);
    let allFragments = [];
    if (fs.existsSync(materialesPath)) {
      const raw = fs.readFileSync(materialesPath, "utf-8");
      allFragments = JSON.parse(raw).fragments || [];
    }

    // Filtrar fragmentos por libros activos si se especificaron
    if (activeLibros && activeLibros.length > 0) {
      allFragments = allFragments.filter(f => activeLibros.includes(f.libro));
    }

    // Limpiar query
    const stopWords = ["que", "es", "el", "la", "los", "las", "un", "una", "de", "del", "en", "por", "para", "como", "donde", "cual", "cuales", "me", "te", "se", "con", "sin", "sobre", "entre", "hacia", "desde", "hay", "son", "tiene", "puede", "hacer", "ser", "estar", "tener", "haber", "esto", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella", "describí", "describi", "describime", "explicame", "explica", "contame", "decime", "qué", "cómo", "cuál", "dónde", "quiero", "saber", "conocer"];
    
    const queryWords = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[?¿!¡.,;:]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    const queryPhrase = queryWords.join(" ");
    console.log("Query:", message);
    console.log("Palabras clave:", queryWords);
    if (activeLibros) console.log("Libros activos:", activeLibros);

    // Búsqueda exacta
    const exactMatches = allFragments
      .filter(f => {
        const textLower = f.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        const allWordsMatch = queryWords.every(w => textLower.includes(w));
        const phraseMatch = textLower.includes(queryPhrase);
        return allWordsMatch || phraseMatch;
      })
      .map(f => {
        const textLower = f.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        const phraseMatch = textLower.includes(queryPhrase);
        return { id: f.id, page: f.page, libro: f.libro, score: phraseMatch ? 100 : 70 };
      });

    // Búsqueda en títulos
    const titleMatches = allFragments
      .filter(f => {
        const lines = f.text.split("\n").slice(0, 5);
        return lines.some(line => {
          const lineLower = line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
          return queryWords.every(w => lineLower.includes(w)) && line.length < 200;
        });
      })
      .map(f => ({ id: f.id, page: f.page, libro: f.libro, score: 80 }));

    // Keywords
    const keywordResults = searchMaterial(year, materiaKey, message);
    // Filtrar keywords por libros activos
    const filteredKeywords = activeLibros && activeLibros.length > 0
      ? keywordResults.filter(f => activeLibros.includes(f.libro))
      : keywordResults;

    // Semántica
    let semanticResults = [];
    if (hasEmbeddings(year, materiaKey)) {
      console.log("Búsqueda híbrida: keywords + semántica");
      semanticResults = await semanticSearch(year, materiaKey, message, 15);
      // Filtrar semántica por libros activos
      if (activeLibros && activeLibros.length > 0) {
        semanticResults = semanticResults.filter(r => {
          const frag = allFragments.find(f => f.id === r.id);
          return frag && activeLibros.includes(frag.libro);
        });
      }
    }

    // Combinar y rankear
    const scoreMap = new Map();

    exactMatches.forEach(r => {
      const current = scoreMap.get(r.id) || { id: r.id, page: r.page, libro: r.libro, score: 0 };
      current.score += r.score;
      scoreMap.set(r.id, current);
    });

    titleMatches.forEach(r => {
      const current = scoreMap.get(r.id) || { id: r.id, page: r.page, libro: r.libro, score: 0 };
      current.score += 80;
      scoreMap.set(r.id, current);
    });

    filteredKeywords.forEach((r, i) => {
      const current = scoreMap.get(r.id) || { id: r.id, page: r.page, libro: r.libro, score: 0 };
      current.score += 50 - (i * 5);
      scoreMap.set(r.id, current);
    });

    semanticResults.forEach((r) => {
      const current = scoreMap.get(r.id) || { id: r.id, page: r.page, libro: r.libro, score: 0 };
      current.score += 30 * r.score;
      scoreMap.set(r.id, current);
    });

    const rankedIds = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const relevantFragments = rankedIds
      .map(r => {
        const frag = allFragments.find(f => f.id === r.id);
        if (frag) return { ...frag, combinedScore: r.score };
        return null;
      })
      .filter(Boolean);

    console.log("Fragmentos:", relevantFragments.map(f => `pag ${f.page} (${f.combinedScore.toFixed(1)})`).join(", "));

    // Construir contexto
    let materialContext = "";
    if (relevantFragments.length > 0) {
      materialContext = relevantFragments
        .map((f, i) => {
          const pageInfo = f.page ? ` (Página ${f.page})` : "";
          return `--- Fragmento ${i + 1}: ${f.libro}${pageInfo} [ID:${f.id}] ---\n${f.text.substring(0, 1500)}`;
        })
        .join("\n\n");
    }

    // Usar todos los libros de todas las cátedras para el prompt
    const allLibros = getAllLibros(year, materiaKey);

    const systemPrompt = buildSystemPrompt({
      materia: materia.name,
      año: yearData.name,
      libros: allLibros.length > 0 ? allLibros : (activeLibros || []),
      material: materialContext,
    });

    const claudeMessages = [];
    if (history && history.length > 0) {
      history.forEach((msg) => {
        claudeMessages.push({ role: msg.role, content: msg.content });
      });
    }

    claudeMessages.push({
      role: "user",
      content: buildQueryPrompt(message, materialContext),
    });

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
        { error: `Error de la API: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    const responseText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const usedFragments = relevantFragments.map((f) => ({
      page: f.page,
      libro: f.libro,
      text: f.text.substring(0, 1500),
    }));

    return NextResponse.json({
      response: responseText,
      sources: [],
      usedFragments: usedFragments,
    });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}