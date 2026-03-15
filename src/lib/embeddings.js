// ============================================================
// EMBEDDINGS - Búsqueda semántica local
// Usa transformers.js para generar embeddings sin API externa
// ============================================================

import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";

const EMBEDDINGS_DIR = path.join(process.cwd(), "data", "embeddings");

let embeddingPipeline = null;

// Cache de embeddings en memoria para evitar leer JSON de 22MB en cada búsqueda
const embeddingsCache = new Map(); // key: "year_materiaKey" → { embeddings, mtime }

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Cargar embeddings con cache en memoria (invalida si el archivo cambió)
function loadEmbeddingsCached(year, materiaKey) {
  const cacheKey = `${year}_${materiaKey}`;
  const filePath = getEmbeddingsPath(year, materiaKey);

  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  const cached = embeddingsCache.get(cacheKey);

  if (cached && cached.mtime >= stat.mtimeMs) {
    return cached.data;
  }

  // Leer y cachear
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  embeddingsCache.set(cacheKey, { data, mtime: stat.mtimeMs });
  console.log(`[embeddings] Cacheado en memoria: ${data.embeddings?.length || 0} vectores para ${cacheKey}`);
  return data;
}

// Inicializar el modelo (se carga una sola vez)
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log("Cargando modelo de embeddings (primera vez tarda ~30s)...");
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Modelo de embeddings cargado.");
  }
  return embeddingPipeline;
}

// Generar embedding para un texto
async function generateEmbedding(text) {
  const pipe = await getEmbeddingPipeline();
  // Truncar texto largo para el modelo
  const truncated = text.substring(0, 1024);
  const output = await pipe(truncated, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Calcular similitud coseno entre dos vectores
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ruta del archivo de embeddings para una materia
function getEmbeddingsPath(year, materiaKey) {
  return path.join(EMBEDDINGS_DIR, `${year}_${materiaKey}_embeddings.json`);
}

// ============================================================
// GENERAR EMBEDDINGS PARA TODOS LOS FRAGMENTOS
// Se ejecuta una vez al subir el PDF
// ============================================================

export async function generateEmbeddingsForMaterial(year, materiaKey, fragments) {
  ensureDir(EMBEDDINGS_DIR);
  const filePath = getEmbeddingsPath(year, materiaKey);

  // Cargar existentes si hay
  let data = { embeddings: [] };
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  }

  const pipe = await getEmbeddingPipeline();
  const newEmbeddings = [];

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    const truncated = frag.text.substring(0, 1024);
    const output = await pipe(truncated, { pooling: "mean", normalize: true });
    const vector = Array.from(output.data);

    newEmbeddings.push({
      id: frag.id,
      page: frag.page,
      libro: frag.libro,
      vector: vector,
    });

    if ((i + 1) % 50 === 0) {
      console.log(`Embeddings: ${i + 1}/${fragments.length}`);
    }
  }

  data.embeddings = [...data.embeddings, ...newEmbeddings];
  fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");

  // Invalidar cache para que la próxima búsqueda use los nuevos
  embeddingsCache.delete(`${year}_${materiaKey}`);

  console.log(`Embeddings guardados: ${newEmbeddings.length} nuevos, ${data.embeddings.length} total`);
  return newEmbeddings.length;
}

// ============================================================
// BUSCAR FRAGMENTOS POR SIMILITUD SEMÁNTICA
// ============================================================

export async function semanticSearch(year, materiaKey, query, topK = 8) {
  const data = loadEmbeddingsCached(year, materiaKey);

  if (!data?.embeddings || data.embeddings.length === 0) {
    return [];
  }

  // Generar embedding de la pregunta
  const queryEmbedding = await generateEmbedding(query);

  // Calcular similitud con cada fragmento
  const scored = data.embeddings.map((emb) => ({
    id: emb.id,
    page: emb.page,
    libro: emb.libro,
    score: cosineSimilarity(queryEmbedding, emb.vector),
  }));

  // Devolver los más similares
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ============================================================
// VERIFICAR SI HAY EMBEDDINGS PARA UNA MATERIA
// ============================================================

export function hasEmbeddings(year, materiaKey) {
  const data = loadEmbeddingsCached(year, materiaKey);
  return data?.embeddings && data.embeddings.length > 0;
}