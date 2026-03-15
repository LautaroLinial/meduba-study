// ============================================================
// QUERY EXPANDER - Expansión inteligente de queries con LLM
// Usa OpenRouter (modelos gratuitos) con fallback a diccionario estático
// ============================================================

import { expandQuery as expandQueryStatic } from "./materialStore";

// Cache para evitar llamadas repetidas a la API
const queryCache = new Map();
const MAX_CACHE = 100;
let _aiDisabled = false; // Se activa si la API falla repetidamente
let _failCount = 0;      // Contador de fallos consecutivos

/**
 * Expande una query médica con sinónimos usando OpenRouter (GLM 4.5 Air gratis).
 * Si falla o tarda más de 10s, cae al diccionario estático.
 *
 * @param {string} query - La pregunta del usuario
 * @param {string} [_apiKey] - Deprecated, se usa OPENROUTER_API_KEY del env
 * @returns {string[]} - Lista de palabras expandidas (sin duplicados)
 */
export async function expandQueryWithAI(query, _apiKey) {
  // Si la AI fue desactivada por fallos repetidos, ir directo al fallback
  if (_aiDisabled) {
    return expandQueryStatic(query);
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
        "X-Title": "MedUBA Study",
      },
      body: JSON.stringify({
        model: "z-ai/glm-4.5-air:free",
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
      console.warn("[queryExpander] API error, falling back to static:", response.status, errorBody.slice(0, 200));
      _failCount++;
      if (_failCount >= 3) {
        console.warn("[queryExpander] 3 fallos consecutivos — desactivando AI expansion para esta sesión");
        _aiDisabled = true;
      }
      return expandQueryStatic(query);
    }

    // Reset fail counter on success
    _failCount = 0;

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Si el modelo no devolvió nada útil, fallback
    if (!text || text.length < 5) {
      console.warn("[queryExpander] Respuesta vacía del modelo, fallback a estático");
      return expandQueryStatic(query);
    }

    console.log(`[queryExpander] AI raw response (${text.length} chars): ${text.slice(0, 200)}`);

    // Parsear la respuesta: esperamos palabras/frases separadas por coma
    const aiWords = text
      .split(/[,\n;]+/)
      .map((w) => w.trim().toLowerCase().replace(/^[-•\d.]+\s*/, ""))
      .filter((w) => w.length > 2 && w.length < 60)
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
    _failCount++;
    if (_failCount >= 3) {
      console.warn("[queryExpander] 3 fallos consecutivos — desactivando AI expansion");
      _aiDisabled = true;
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
