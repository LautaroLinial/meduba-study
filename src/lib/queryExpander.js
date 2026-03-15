// ============================================================
// QUERY EXPANDER - Expansión inteligente de queries con Claude
// Reemplaza el diccionario estático de sinónimos con AI
// ============================================================

import { expandQuery as expandQueryStatic } from "./materialStore";

// Cache para evitar llamadas repetidas a la API
const queryCache = new Map();
const MAX_CACHE = 100;
let _aiDisabled = false; // Se activa si la API no tiene créditos

/**
 * Expande una query médica con sinónimos usando Claude Haiku.
 * Si falla o tarda más de 10s, cae al diccionario estático.
 *
 * @param {string} query - La pregunta del usuario
 * @param {string} apiKey - API key de Anthropic
 * @returns {string[]} - Lista de palabras expandidas (sin duplicados)
 */
export async function expandQueryWithAI(query, apiKey) {
  // Si la AI fue desactivada (sin créditos), ir directo al fallback
  if (_aiDisabled) {
    return expandQueryStatic(query);
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (queryCache.has(cacheKey)) {
    console.log(`[queryExpander] Cache hit for: ${query}`);
    return queryCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s max

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: buildExpansionPrompt(query),
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.warn("[queryExpander] API error, falling back to static:", response.status);
      // Si no hay créditos, desactivar llamadas futuras para no perder 10s por request
      if (errorBody.includes("credit balance is too low")) {
        console.warn("[queryExpander] No credits — desactivando AI expansion para esta sesión");
        _aiDisabled = true;
      }
      return expandQueryStatic(query);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parsear la respuesta: esperamos palabras/frases separadas por coma
    const aiWords = text
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 2)
      .map((w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    // Combinar con las palabras originales del query
    const queryWords = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[?¿!¡.,;:]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Deduplicar y combinar
    const allWords = [...new Set([...queryWords, ...aiWords])];

    // También extraer palabras individuales de frases multi-palabra
    const expanded = new Set(allWords);
    allWords.forEach((phrase) => {
      phrase.split(/\s+/).forEach((word) => {
        if (word.length > 2) expanded.add(word);
      });
    });

    const result = Array.from(expanded);
    console.log(`[queryExpander] AI expansion: ${query} → ${expanded.size} términos`);

    // Save to cache
    if (queryCache.size >= MAX_CACHE) {
      const firstKey = queryCache.keys().next().value;
      queryCache.delete(firstKey);
    }
    queryCache.set(cacheKey, result);

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("[queryExpander] Timeout (10s), falling back to static");
    } else {
      console.warn("[queryExpander] Error, falling back to static:", error.message);
    }
    return expandQueryStatic(query);
  }
}

/**
 * Construye el prompt para que Claude expanda la query con sinónimos médicos.
 */
function buildExpansionPrompt(query) {
  return `Sos un experto en terminología médica y anatómica en español.
Dado este término o pregunta médica, generá una lista de 15-20 sinónimos, términos anatómicos relacionados, y variaciones ortográficas (con/sin acento, latín/español).

IMPORTANTE:
- Incluí el nombre formal (Nómina Anatómica) y el nombre coloquial
- Incluí variaciones sin acento (ej: "articulacion" además de "articulación")
- Incluí términos en latín si existen
- Si es una región, incluí las estructuras principales que contiene
- Si es una estructura, incluí la región donde se encuentra
- NO incluyas explicaciones, SOLO las palabras/frases separadas por coma

Término: "${query}"

Sinónimos y términos relacionados:`;
}
