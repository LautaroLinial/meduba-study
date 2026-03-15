// ============================================================
// LLM MODELS - Configuración de modelos disponibles
// ============================================================

export const LLM_MODELS = {
  // ── Anthropic (directo) ──
  "claude-haiku": {
    id: "claude-haiku",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    inputCost: 1.00,   // por 1M tokens
    outputCost: 5.00,
    maxTokens: 4096,
    quality: 5,
    description: "Máxima calidad en español médico. El más caro.",
    badge: "Premium",
  },

  // ── OpenRouter models ──
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3.2",
    provider: "openrouter",
    model: "deepseek/deepseek-chat-v3-0324",
    inputCost: 0.14,
    outputCost: 0.28,
    maxTokens: 4096,
    quality: 4,
    description: "Mejor relación calidad/precio. 17x más barato que Haiku. Percentil 99 en MIR.",
    badge: "Recomendado",
  },
  "minimax-m2.5": {
    id: "minimax-m2.5",
    name: "MiniMax M2.5",
    provider: "openrouter",
    model: "minimax/minimax-m2.5",
    inputCost: 0.25,
    outputCost: 1.20,
    maxTokens: 4096,
    quality: 4,
    description: "Modelo potente, contexto de 196K tokens. Buena relación calidad/precio.",
    badge: "Económico",
  },
  "gemini-flash": {
    id: "gemini-flash",
    name: "Gemini 2.5 Flash",
    provider: "openrouter",
    model: "google/gemini-2.5-flash-preview",
    inputCost: 0.15,
    outputCost: 0.60,
    maxTokens: 4096,
    quality: 4,
    description: "Rápido y económico. Buen español.",
    badge: "Económico",
  },

  // ── Modelos GRATUITOS (con rate limit: 20 req/min, 200 req/día) ──
  "kimi-k2.5-free": {
    id: "kimi-k2.5-free",
    name: "Kimi K2.5",
    provider: "openrouter",
    model: "moonshotai/kimi-k2.5:free",
    inputCost: 0,
    outputCost: 0,
    maxTokens: 4096,
    quality: 3,
    description: "Gratis. Multimodal con buen razonamiento. Límite: 200 req/día.",
    badge: "Gratis",
  },
  "glm-4.5-free": {
    id: "glm-4.5-free",
    name: "GLM 4.5 Air",
    provider: "openrouter",
    model: "zai/glm-4.5-air-0125:free",
    inputCost: 0,
    outputCost: 0,
    maxTokens: 4096,
    quality: 3,
    description: "Gratis. Bueno para tareas generales. Límite: 200 req/día.",
    badge: "Gratis",
  },
};

// Modelo por defecto
export const DEFAULT_MODEL = "deepseek-v3";

// Obtener modelo por ID
export function getModel(modelId) {
  return LLM_MODELS[modelId] || LLM_MODELS[DEFAULT_MODEL];
}

// Listar modelos para el frontend
export function listModels() {
  return Object.values(LLM_MODELS).map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    inputCost: m.inputCost,
    outputCost: m.outputCost,
    quality: m.quality,
    description: m.description,
    badge: m.badge,
  }));
}
