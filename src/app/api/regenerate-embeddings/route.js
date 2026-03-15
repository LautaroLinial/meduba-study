// ============================================================
// API ROUTE - /api/regenerate-embeddings
// Regenera embeddings para todos los fragmentos de una materia
// ============================================================

import { generateEmbeddingsForMaterial } from "@/lib/embeddings";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { year, materia } = await request.json();

    if (!year || !materia) {
      return new Response(JSON.stringify({ error: "year y materia son requeridos" }), { status: 400 });
    }

    const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materia}.json`);
    if (!fs.existsSync(materialesPath)) {
      return new Response(JSON.stringify({ error: "No hay materiales para esta materia" }), { status: 404 });
    }

    const raw = fs.readFileSync(materialesPath, "utf-8");
    const { fragments } = JSON.parse(raw);

    if (!fragments || fragments.length === 0) {
      return new Response(JSON.stringify({ error: "No hay fragmentos" }), { status: 404 });
    }

    // Borrar embeddings viejos para empezar de cero
    const embeddingsDir = path.join(process.cwd(), "data", "embeddings");
    const embPath = path.join(embeddingsDir, `${year}_${materia}_embeddings.json`);
    if (fs.existsSync(embPath)) {
      fs.unlinkSync(embPath);
      console.log(`[embeddings] Borrados embeddings viejos: ${embPath}`);
    }

    console.log(`[embeddings] Regenerando embeddings para ${fragments.length} fragmentos...`);
    const startTime = Date.now();

    // Procesar en lotes para no saturar la memoria
    const BATCH_SIZE = 100;
    let totalGenerated = 0;

    for (let i = 0; i < fragments.length; i += BATCH_SIZE) {
      const batch = fragments.slice(i, i + BATCH_SIZE);
      const count = await generateEmbeddingsForMaterial(year, materia, batch);
      totalGenerated += count;
      console.log(`[embeddings] Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${totalGenerated}/${fragments.length} completados`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[embeddings] ✅ Completado: ${totalGenerated} embeddings en ${elapsed}s`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regenerados ${totalGenerated} embeddings en ${elapsed}s`,
        total: totalGenerated,
        elapsed: `${elapsed}s`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[embeddings] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
