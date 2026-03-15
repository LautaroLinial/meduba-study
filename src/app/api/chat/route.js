// ============================================================
// API ROUTE - /api/chat (STREAMING + FIX DE HISTORIAL)
// ============================================================

import { buildSystemPrompt, buildQueryPrompt } from "@/lib/systemPrompt";
import { getMateria, CURRICULUM, getAllLibros } from "@/lib/curriculum";
import { searchMaterial, expandQuery, loadTOC, getChapterForPage } from "@/lib/materialStore";
import { semanticSearch, hasEmbeddings } from "@/lib/embeddings";
import { expandQueryWithAI } from "@/lib/queryExpander";
import { callLLM, createTextStream, LLMError } from "@/lib/llmProvider";
import { DEFAULT_MODEL } from "@/lib/llmModels";
import fs from "fs";
import path from "path";

// Helper: normalizar texto una sola vez (lowercase + sin acentos + espacios normalizados)
function normalizeText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

// Cache de fragmentos pre-normalizados en memoria
const fragmentsCache = new Map(); // key: "year_materiaKey" → { fragments, mtime }

function loadFragmentsCached(year, materiaKey, activeLibros) {
  const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materiaKey}.json`);
  if (!fs.existsSync(materialesPath)) return [];

  const cacheKey = `${year}_${materiaKey}`;
  const stat = fs.statSync(materialesPath);
  const cached = fragmentsCache.get(cacheKey);

  let allFragments;
  if (cached && cached.mtime >= stat.mtimeMs) {
    allFragments = cached.fragments;
  } else {
    const raw = fs.readFileSync(materialesPath, "utf-8");
    allFragments = (JSON.parse(raw).fragments || []).map(f => ({
      ...f,
      _normalized: normalizeText(f.text),
      _head120: normalizeText(f.text.substring(0, 120)),
      _head150: normalizeText(f.text.substring(0, 150)),
      _lineCount: f.text.split("\n").length,
    }));
    fragmentsCache.set(cacheKey, { fragments: allFragments, mtime: stat.mtimeMs });
    console.log(`[cache] Pre-normalizado ${allFragments.length} fragmentos para ${cacheKey}`);
  }

  if (activeLibros && activeLibros.length > 0) {
    return allFragments.filter(f => activeLibros.includes(f.libro));
  }
  return allFragments;
}

// Workaround: cargar .env.local manualmente si Next.js no lo hizo
if (!process.env.ANTHROPIC_API_KEY) {
  const envPaths = [
    path.join(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../../.env.local"),       // worktree → repo root
    path.resolve(process.cwd(), "../../../.env.local"),
    path.resolve(process.cwd(), "../../../../.env.local"),
    path.resolve(process.cwd(), "../../../../../.env.local"),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq > 0) {
          const k = t.slice(0, eq).trim();
          const v = t.slice(eq + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
      break;
    }
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    // Support both { message: "..." } and { messages: [...] } formats
    const message = body.message || (Array.isArray(body.messages) && body.messages.length > 0 ? body.messages[body.messages.length - 1].content : null);
    const { year, materia: materiaKey, history, activeLibros } = body;
    const modelId = body.modelId || DEFAULT_MODEL;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Mensaje no proporcionado o formato inválido." }), { status: 400 });
    }

    // Validar que haya al menos una API key configurada
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey && !openrouterKey) {
      return new Response(JSON.stringify({ error: "Ninguna API key configurada. Agregá ANTHROPIC_API_KEY o OPENROUTER_API_KEY en .env.local" }), { status: 500 });
    }

    const materia = getMateria(year, materiaKey);
    if (!materia) {
      return new Response(JSON.stringify({ error: "Materia no encontrada" }), { status: 400 });
    }

    const yearData = CURRICULUM[year];
    const allFragments = loadFragmentsCached(year, materiaKey, activeLibros);

    const stopWords = [
      // Artículos, preposiciones, pronombres
      "que", "es", "el", "la", "los", "las", "un", "una", "de", "del", "en", "por", "para", "como", "donde", "cual", "cuales", "me", "te", "se", "con", "sin", "sobre", "entre", "hacia", "desde", "hay", "son", "tiene", "puede", "hacer", "ser", "estar", "tener", "haber", "esto", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella",
      // Verbos de pregunta / imperativo (cómo pregunta el alumno)
      "describí", "describi", "describime", "explicame", "explica", "contame", "decime", "qué", "cómo", "cuál", "dónde", "quiero", "saber", "conocer",
      // Palabras estructurales de pregunta (no aportan al tema médico)
      "elementos", "componen", "compone", "componentes", "forman", "forma", "formas", "partes", "parte", "tipos", "tipo", "cuantos", "cuantas", "cuanto", "cuanta", "cuales", "funcion", "función", "funciones", "caracteristicas", "características", "relacion", "relaciones", "diferencia", "diferencias", "importancia", "principal", "principales", "denomina", "define", "definicion", "nombre", "nombres", "llama", "cual", "como", "cuando", "donde", "porque", "sino", "tambien", "ademas", "cada", "todo", "toda", "todos", "todas", "otro", "otra", "otros", "otras", "mas", "menos", "muy", "bien", "mal", "aqui", "ahi", "alla",
    ];

    const queryWords = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[?¿!¡.,;:]/g, "").split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    const queryPhrase = queryWords.join(" ");

    // Expandir query con sinónimos usando Claude AI (fallback a diccionario estático)
    const expandedWords = await expandQueryWithAI(message, apiKey);

    // Helper: stem matching — "vasculo" matchea "vascular", "vasculonervioso", etc.
    function stemMatch(word, text) {
      if (text.includes(word)) return true;
      if (word.length >= 5) {
        const stem = word.substring(0, Math.ceil(word.length * 0.75));
        return text.includes(stem);
      }
      return false;
    }

    // Exact matches con scoring que prioriza query words originales
    const exactMatches = [];
    const searchWords = [...new Set([...queryWords, ...expandedWords])];
    const expandedOnly = searchWords.filter(w => !queryWords.includes(w));

    // Helper: detectar si la frase en posición X es un heading (no body text)
    // Un heading tiene antes solo número de página + nombre de sección: "270 Sistema nervioso central"
    // Body text tiene conectores de oración: "a la vascularización de la pared y de la"
    function isHeadingContext(text, phrasePos) {
      if (phrasePos < 0 || phrasePos >= 120) return false;
      const before = text.substring(0, phrasePos);
      const sentenceMarkers = [" de la ", " del ", " y de ", " por ", " en la ", " que ", " con el ", " con la ", " a la ", " en el "];
      return !sentenceMarkers.some(m => before.includes(m));
    }

    allFragments.forEach(f => {
      const textLower = f._normalized;

      // Frase completa
      if (textLower.includes(queryPhrase)) {
        const phrasePos = textLower.indexOf(queryPhrase);
        const headingBonus = isHeadingContext(textLower, phrasePos) ? 80 : 0;
        exactMatches.push({ id: f.id, page: f.page, libro: f.libro, score: 100 + headingBonus });
        return;
      }

      // Scoring ponderado: query words valen mucho más que sinónimos expandidos
      const queryHits = queryWords.filter(w => stemMatch(w, textLower)).length;
      const expandedHits = expandedOnly.filter(w => stemMatch(w, textLower)).length;
      const totalHits = queryHits + expandedHits;

      if (totalHits >= 2) {
        let score = (queryHits * 30) + Math.min(expandedHits * 3, 30);
        // Heading bonus: todos los queryWords en los primeros 120 chars + contexto de heading
        const headText = f._head120;
        if (queryWords.length >= 2 && queryWords.every(w => stemMatch(w, headText))) {
          const sentenceMarkers = [" de la ", " del ", " y de ", " por ", " en la ", " que "];
          if (!sentenceMarkers.some(m => headText.includes(m))) {
            score += 60;
          }
        }
        exactMatches.push({ id: f.id, page: f.page, libro: f.libro, score });
      }
    });

    // Title matches: buscar en primeras líneas O en los primeros 200 chars del texto
    const titleMatches = [];
    allFragments.forEach(f => {
      // Estrategia 1: primeras líneas cortas (para fragmentos con newlines)
      const lines = f.text.split("\n").slice(0, 5);
      for (const line of lines) {
        if (line.length >= 200) continue;
        const lineLower = normalizeText(line);
        const queryHits = queryWords.filter(w => stemMatch(w, lineLower)).length;
        const expandedHits = expandedOnly.filter(w => stemMatch(w, lineLower)).length;
        const totalHits = queryHits + expandedHits;
        if (totalHits >= 2) {
          const score = (queryHits * 35) + Math.min(expandedHits * 3, 25);
          titleMatches.push({ id: f.id, page: f.page, libro: f.libro, score });
          return; // ya encontró título, salir
        }
      }
      // Estrategia 2: primeros 150 chars (para fragmentos de 1 sola línea larga)
      if (f._lineCount <= 2) {
        const headText = f._head150;
        const queryHits = queryWords.filter(w => stemMatch(w, headText)).length;
        const expandedHits = expandedOnly.filter(w => stemMatch(w, headText)).length;
        if (queryHits + expandedHits >= 2 && isHeadingContext(headText, headText.indexOf(queryWords[0]))) {
          const score = (queryHits * 35) + Math.min(expandedHits * 3, 25);
          titleMatches.push({ id: f.id, page: f.page, libro: f.libro, score });
        }
      }
    });

    const keywordResults = searchMaterial(year, materiaKey, message);
    const filteredKeywords = activeLibros && activeLibros.length > 0 ? keywordResults.filter(f => activeLibros.includes(f.libro)) : keywordResults;

    let semanticResults = [];
    if (hasEmbeddings(year, materiaKey)) {
      semanticResults = await semanticSearch(year, materiaKey, message, 20);
      if (activeLibros && activeLibros.length > 0) {
        semanticResults = semanticResults.filter(r => {
          // Buscar por ID primero, luego por libro directamente del embedding
          const frag = allFragments.find(f => f.id === r.id);
          if (frag) return activeLibros.includes(frag.libro);
          // Si no hay match de ID, el embedding puede tener libro propio
          return r.libro ? activeLibros.includes(r.libro) : true;
        });
      }
    }

    // ── TOC PRIORITY: Boost para páginas que son el tema principal ──
    const tocBoost = new Map(); // page → boost score
    const librosInFragments = [...new Set(allFragments.map(f => f.libro))];
    for (const libroName of librosInFragments) {
      const toc = loadTOC(year, materiaKey, libroName);
      if (!toc || !toc.entries) continue;

      for (const entry of toc.entries) {
        const titleNorm = normalizeText(entry.title);

        // ── Dos niveles de TOC boost ──
        const queryMatchCount = queryWords.filter(w => stemMatch(w, titleNorm)).length;
        const queryRatio = queryMatchCount / Math.max(queryWords.length, 1);

        // STRONG: TODOS los query words matchean el título (ej: "plexo braquial" → "Plexo braquial")
        // MODERATE: la mayoría de las palabras del TÍTULO están cubiertas por nuestros search terms
        //   Esto captura casos como query "glandula mamaria" → TOC "Mama" (porque "mama" está en expanded)
        //   pero NO matchea "Articulaciones de la cabeza" para query "articulacion del hombro"
        //   (porque "cabeza" NO está en los search terms)
        const allSearchTerms = [...new Set([...queryWords, ...expandedWords])];
        const significantTitleWords = titleNorm.split(/\s+/).filter(w =>
          w.length > 3 && !["capitulo", "capitulos"].includes(w) && !/^\d+[:.]?$/.test(w)
        );
        const titleCoverage = significantTitleWords.length > 0
          ? significantTitleWords.filter(tw =>
              allSearchTerms.some(s => stemMatch(s, tw) || stemMatch(tw, s))
            ).length / significantTitleWords.length
          : 0;

        let boost = 0;
        if (queryRatio >= 1.0 && queryMatchCount >= 2) {
          boost = 150; // STRONG
        } else if (titleCoverage >= 0.7 && significantTitleWords.length >= 1) {
          boost = 80; // MODERATE — el título del capítulo está bien cubierto por los search terms
        }

        if (boost > 0) {
          const page = entry.page;
          // Boost para la página del TOC y las ~5 siguientes (un capítulo suele abarcar varias)
          for (let p = page; p <= page + 5; p++) {
            const currentBoost = tocBoost.get(`${libroName}_${p}`) || 0;
            const pageBoost = p === page ? boost : Math.round(boost * 0.6);
            tocBoost.set(`${libroName}_${p}`, Math.max(currentBoost, pageBoost));
          }
        }
      }
    }

    // ── RECIPROCAL RANK FUSION (RRF) ──
    // Combina rankings de diferentes métodos de búsqueda con pesos.
    // Fórmula: score = Σ peso × 1/(rank + k), donde k=60
    const k = 60;
    const rrfScores = new Map(); // id → { id, page, libro, score }

    function addRRFScores(rankedList, weight) {
      rankedList.forEach((item, rank) => {
        const current = rrfScores.get(item.id) || { id: item.id, page: item.page, libro: item.libro, score: 0 };
        current.score += weight * (1 / (rank + k));
        rrfScores.set(item.id, current);
      });
    }

    // Ordenar cada lista por su propio score antes de RRF
    const sortedExact = [...exactMatches].sort((a, b) => b.score - a.score);
    const sortedTitle = [...titleMatches].sort((a, b) => b.score - a.score);
    const sortedKeyword = filteredKeywords; // ya viene ordenado
    const sortedSemantic = [...semanticResults].sort((a, b) => b.score - a.score);

    // TOC boost: crear lista ordenada de fragmentos que recibieron boost
    const tocBoostedFragments = [];
    if (tocBoost.size > 0) {
      allFragments.forEach(f => {
        const boost = tocBoost.get(`${f.libro}_${f.page}`);
        if (boost) tocBoostedFragments.push({ id: f.id, page: f.page, libro: f.libro, score: boost });
      });
      tocBoostedFragments.sort((a, b) => b.score - a.score);
    }

    // Aplicar RRF con pesos por método
    addRRFScores(sortedExact, 2.0);     // Exact match: señal más fuerte
    addRRFScores(sortedTitle, 1.5);     // Title/heading match
    addRRFScores(tocBoostedFragments, 1.5); // TOC boost
    addRRFScores(sortedKeyword, 1.0);   // Keyword search
    addRRFScores(sortedSemantic, 1.0);  // Semantic search

    // Ranking final
    let rankedIds = Array.from(rrfScores.values()).sort((a, b) => b.score - a.score).slice(0, 12);

    // ── EXPANSIÓN POR PÁGINAS VECINAS ──
    // Si encontramos pág. 270, incluir pág. 271 si tiene algún score (mismo tema, distinta terminología)
    const rankedPageSet = new Set(rankedIds.map(r => `${r.libro}_${r.page}`));
    const neighbors = [];
    rankedIds.forEach(r => {
      for (const delta of [-1, 1]) {
        const neighborPage = r.page + delta;
        const neighborKey = `${r.libro}_${neighborPage}`;
        if (!rankedPageSet.has(neighborKey)) {
          // Buscar fragmentos de la página vecina que tengan ALGÚN score en RRF
          const neighborFrags = allFragments.filter(f => f.page === neighborPage && f.libro === r.libro);
          neighborFrags.forEach(nf => {
            const nfScore = rrfScores.get(nf.id);
            if (nfScore && nfScore.score > 0) {
              neighbors.push(nfScore);
              rankedPageSet.add(neighborKey);
            }
          });
        }
      }
    });
    // Agregar vecinos al final, mantener top 15
    rankedIds = [...rankedIds, ...neighbors].sort((a, b) => b.score - a.score).slice(0, 15);

    const relevantFragments = rankedIds.map(r => {
        const frag = allFragments.find(f => f.id === r.id);
        return frag ? { ...frag, combinedScore: r.score } : null;
      }).filter(Boolean);

    let materialContext = "";
    if (relevantFragments.length > 0) {
      // Cargar TOC para enriquecer fragmentos con contexto de capítulo
      const tocCache = new Map();
      materialContext = relevantFragments.map((f) => {
          const pageInfo = f.page ? `, pág. ${f.page}` : "";
          // Agregar contexto de capítulo si hay TOC disponible
          let chapterCtx = "";
          if (f.libro && f.page) {
            if (!tocCache.has(f.libro)) {
              const toc = loadTOC(year, materiaKey, f.libro);
              tocCache.set(f.libro, toc?.entries || []);
            }
            const chapter = getChapterForPage(f.page, tocCache.get(f.libro));
            if (chapter) chapterCtx = `[${chapter}] `;
          }
          return `--- ${f.libro}${pageInfo} ---\n${chapterCtx}${f.text.substring(0, 1500)}`;
        }).join("\n\n");
    }

    // Log de búsqueda
    console.log(`[search] "${message}" → words:[${queryWords.join(",")}] exact:${sortedExact.length} title:${sortedTitle.length} kw:${filteredKeywords.length} sem:${sortedSemantic.length} toc:${tocBoostedFragments.length} → ${rankedIds.length} results [${rankedIds.slice(0,5).map(r => `p.${r.page}`).join(",")}]`);

    const allLibros = getAllLibros(year, materiaKey);
    const systemPrompt = buildSystemPrompt({
      materia: materia.name,
      año: yearData.name,
      libros: allLibros.length > 0 ? allLibros : (activeLibros || []),
      material: materialContext,
    });

    // 🔴 NUEVO FIX: Historial perfecto para Anthropic
    const rawHistory = history ? history.map(msg => ({ role: msg.role, content: msg.content })) : [];
    const validHistory = [];
    
    // Esperamos que el último mensaje anterior haya sido del asistente, para alternar bien
    let expectedRole = "assistant"; 

    // Recorremos de atrás para adelante para armar la cadena perfecta
    for (let i = rawHistory.length - 1; i >= 0; i--) {
      const msg = rawHistory[i];
      // Ignorar mensajes vacíos que hacen enojar a la API
      if (!msg.content || msg.content.trim() === "") continue; 
      
      if (msg.role === expectedRole) {
        validHistory.unshift(msg); // Lo ponemos al principio
        expectedRole = expectedRole === "assistant" ? "user" : "assistant";
      }
    }

    const claudeMessages = [...validHistory];
    
    // Finalmente, añadimos la nueva pregunta del usuario
    claudeMessages.push({ role: "user", content: buildQueryPrompt(message, materialContext) });

    const usedFragments = relevantFragments.map((f) => ({
      page: f.page,
      libro: f.libro,
      text: f.text.substring(0, 1500),
    }));

    // ── Llamar al LLM seleccionado (Anthropic o OpenRouter) ──
    const { response, provider } = await callLLM({
      modelId,
      systemPrompt,
      messages: claudeMessages,
    });

    console.log(`[llm] Usando modelo: ${modelId} (${provider})`);

    // Crear stream de texto con metadata
    const metadata = { type: "metadata", usedFragments, modelId };
    const stream = createTextStream(response, provider, metadata);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("Error en /api/chat:", error.message);
    if (error instanceof LLMError) {
      return new Response(JSON.stringify({ error: error.message, details: error.details }), { status: error.status });
    }
    return new Response(JSON.stringify({ error: "Error interno del servidor", details: error.message }), { status: 500 });
  }
}