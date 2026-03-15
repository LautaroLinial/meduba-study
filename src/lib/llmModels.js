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

  // ── OpenRouter models (pagos baratos) ──
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3.2",
    provider: "openrouter",
    model: "deepseek/deepseek-v3.2",
    inputCost: 0.26,
    outputCost: 0.38,
    maxTokens: 4096,
    quality: 4,
    description: "Mejor relación calidad/precio. Percentil 99 en MIR español.",
    badge: "Recomendado",
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
  "glm-4.7-flash": {
    id: "glm-4.7-flash",
    name: "GLM 4.7 Flash",
    provider: "openrouter",
    model: "z-ai/glm-4.7-flash",
    inputCost: 0.06,
    outputCost: 0.40,
    maxTokens: 4096,
    quality: 3,
    description: "Ultra económico. Bueno para consultas simples.",
    badge: "Económico",
  },

  // ── Modelos GRATUITOS (con rate limit: 20 req/min, 200 req/día) ──
  "minimax-free": {
    id: "minimax-free",
    name: "MiniMax M2.5",
    provider: "openrouter",
    model: "minimax/minimax-m2.5:free",
    inputCost: 0,
    outputCost: 0,
    maxTokens: 4096,
    quality: 4,
    description: "Gratis. Modelo potente, contexto de 196K. Límite: 200 req/día.",
    badge: "Gratis",
  },
  "glm-4.5-free": {
    id: "glm-4.5-free",
    name: "GLM 4.5 Air",
    provider: "openrouter",
    model: "z-ai/glm-4.5-air:free",
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
