// ============================================================
// LLM PROVIDER - Abstracción para llamar a Anthropic u OpenRouter
// Soporta streaming para ambos proveedores
// ============================================================

import { getModel } from "./llmModels";

/**
 * Llama al LLM seleccionado y devuelve un Response con streaming.
 *
 * @param {Object} options
 * @param {string} options.modelId - ID del modelo (de llmModels.js)
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Array de { role, content }
 * @param {number} [options.maxTokens=4096] - Max tokens de salida
 * @returns {{ response: Response, provider: string }} - Response del fetch con streaming
 */
export async function callLLM({ modelId, systemPrompt, messages, maxTokens }) {
  const model = getModel(modelId);
  maxTokens = maxTokens || model.maxTokens || 4096;

  if (model.provider === "anthropic") {
    return callAnthropic({ model, systemPrompt, messages, maxTokens });
  } else if (model.provider === "openrouter") {
    return callOpenRouter({ model, systemPrompt, messages, maxTokens });
  } else {
    throw new Error(`Provider desconocido: ${model.provider}`);
  }
}

// ── ANTHROPIC (API directa) ──
async function callAnthropic({ model, systemPrompt, messages, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes("credit balance is too low")) {
      throw new LLMError("Sin créditos en Anthropic. Recargá en console.anthropic.com → Plans & Billing.", 402);
    }
    throw new LLMError(`Error Anthropic API: ${response.status}`, response.status, errorText);
  }

  return { response, provider: "anthropic" };
}

// ── OPENROUTER (formato OpenAI-compatible) ──
async function callOpenRouter({ model, systemPrompt, messages, maxTokens }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada. Creá una en openrouter.ai/keys");

  // OpenRouter usa formato OpenAI: system va como primer mensaje
  const openAIMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
      "X-Title": "MedUBA Study",
    },
    body: JSON.stringify({
      model: model.model,
      messages: openAIMessages,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes("credits") || errorText.includes("insufficient")) {
      throw new LLMError("Sin créditos en OpenRouter. Recargá en openrouter.ai/credits.", 402);
    }
    if (response.status === 429) {
      throw new LLMError("Rate limit alcanzado. Esperá un momento o cambiá a un modelo pago.", 429);
    }
    throw new LLMError(`Error OpenRouter API: ${response.status}`, response.status, errorText);
  }

  return { response, provider: "openrouter" };
}

/**
 * Convierte el streaming response en un ReadableStream de texto plano.
 * Maneja ambos formatos: Anthropic SSE y OpenAI SSE.
 *
 * @param {Response} response - Response del fetch
 * @param {string} provider - "anthropic" o "openrouter"
 * @param {Object} metadata - Metadata para enviar al inicio del stream
 * @returns {ReadableStream}
 */
export function createTextStream(response, provider, metadata = null) {
  return new ReadableStream({
    async start(controller) {
      // Enviar metadata primero si hay
      if (metadata) {
        const metaStr = JSON.stringify(metadata);
        controller.enqueue(new TextEncoder().encode(metaStr + "\n\n---\n\n"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Mantener última línea incompleta

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6); // quitar "data: "
          if (dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);
            let text = "";

            if (provider === "anthropic") {
              // Anthropic SSE: { type: "content_block_delta", delta: { text: "..." } }
              if (data.type === "content_block_delta" && data.delta?.text) {
                text = data.delta.text;
              }
            } else {
              // OpenAI SSE: { choices: [{ delta: { content: "..." } }] }
              if (data.choices?.[0]?.delta?.content) {
                text = data.choices[0].delta.content;
              }
            }

            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          } catch {
            // Ignorar líneas que no son JSON válido
          }
        }
      }

      controller.close();
    },
  });
}

// Error personalizado con status HTTP
export class LLMError extends Error {
  constructor(message, status = 500, details = "") {
    super(message);
    this.status = status;
    this.details = details;
  }
}
