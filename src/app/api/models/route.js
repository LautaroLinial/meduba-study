// ============================================================
// API ROUTE - /api/models (Lista modelos disponibles)
// ============================================================

import { listModels, DEFAULT_MODEL } from "@/lib/llmModels";

export async function GET() {
  return Response.json({
    models: listModels(),
    default: DEFAULT_MODEL,
  });
}
