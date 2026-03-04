// ============================================================
// MATERIAL STORE - Almacenamiento y búsqueda de material
// Guarda los fragmentos de texto de los PDFs y permite buscarlos
// ============================================================

import fs from "fs";
import path from "path";

// Carpeta donde se guardan los datos
const DATA_DIR = path.join(process.cwd(), "data", "materiales");

// Asegurarse de que la carpeta existe
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Generar la ruta del archivo JSON para una materia
function getMateriaPath(year, materiaKey) {
  return path.join(DATA_DIR, `${year}_${materiaKey}.json`);
}

// ============================================================
// GUARDAR MATERIAL
// ============================================================

export function saveMaterial({ year, materia, libro, fragments }) {
  ensureDir(DATA_DIR);
  const filePath = getMateriaPath(year, materia);

  // Cargar datos existentes o crear nuevos
  let data = { fragments: [] };
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  }

  // Agregar los nuevos fragmentos
  const newFragments = fragments.map((text, index) => ({
    id: `${Date.now()}_${index}`,
    text: text,
    libro: libro,
    fechaCarga: new Date().toISOString(),
  }));

  data.fragments = [...data.fragments, ...newFragments];

  // Guardar
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  return {
    added: newFragments.length,
    total: data.fragments.length,
  };
}

// ============================================================
// BUSCAR MATERIAL RELEVANTE
// ============================================================

export function searchMaterial(year, materiaKey, query) {
  const filePath = getMateriaPath(year, materiaKey);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (!data.fragments || data.fragments.length === 0) {
    return [];
  }

  // Búsqueda por palabras clave (simple pero efectiva)
  const queryWords = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos para mejor matching
    .split(/\s+/)
    .filter((w) => w.length > 2); // Ignorar palabras muy cortas

  const scored = data.fragments.map((fragment) => {
    const text = fragment.text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let score = 0;
    queryWords.forEach((word) => {
      // Contar cuántas veces aparece cada palabra
      const regex = new RegExp(word, "g");
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });

    return { ...fragment, score };
  });

  // Devolver los fragmentos más relevantes (máximo 5)
  return scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ============================================================
// OBTENER ESTADÍSTICAS DE UNA MATERIA
// ============================================================

export function getMaterialStats(year, materiaKey) {
  const filePath = getMateriaPath(year, materiaKey);

  if (!fs.existsSync(filePath)) {
    return { totalFragments: 0, libros: [], lastUpdate: null };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const libros = [...new Set(data.fragments.map((f) => f.libro))];
  const lastUpdate = data.fragments.length > 0
    ? data.fragments[data.fragments.length - 1].fechaCarga
    : null;

  return {
    totalFragments: data.fragments.length,
    libros,
    lastUpdate,
  };
}

// ============================================================
// LISTAR TODO EL MATERIAL CARGADO
// ============================================================

export function listAllMaterial() {
  ensureDir(DATA_DIR);

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const results = [];

  files.forEach((file) => {
    const [year, materiaKey] = file.replace(".json", "").split("_");
    const stats = getMaterialStats(year, materiaKey);
    results.push({
      year: parseInt(year),
      materia: materiaKey,
      ...stats,
    });
  });

  return results;
}

// ============================================================
// BORRAR MATERIAL DE UNA MATERIA
// ============================================================

export function deleteMaterial(year, materiaKey) {
  const filePath = getMateriaPath(year, materiaKey);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}