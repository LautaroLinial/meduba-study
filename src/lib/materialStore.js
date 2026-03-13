// ============================================================
// MATERIAL STORE - Almacenamiento y búsqueda MEJORADA
// Búsqueda más inteligente con sinónimos y matching parcial
// ============================================================

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "materiales");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getMateriaPath(year, materiaKey) {
  return path.join(DATA_DIR, `${year}_${materiaKey}.json`);
}

// ============================================================
// SINÓNIMOS MÉDICOS para mejorar la búsqueda
// ============================================================

const MEDICAL_SYNONYMS = {
  // Estructuras generales
  "hueso": ["óseo", "oseo", "esqueleto", "esquelético", "osteología", "osteologia"],
  "músculo": ["musculo", "muscular", "miología", "miologia", "miocito"],
  "nervio": ["nervioso", "neural", "inervación", "inervacion", "neurología", "neurologia"],
  "arteria": ["arterial", "vascular", "vaso", "irrigación", "irrigacion"],
  "vena": ["venoso", "venosa", "drenaje", "flebitis"],
  // Paquetes y haces vasculonerviosos
  "paquete": ["paquete vasculonervioso", "pedículo", "pediculo", "haz vasculonervioso", "paquete vascular", "eje vasculonervioso"],
  "vascular": ["vasculo", "vasculonervioso", "vasos", "angiovascular"],
  // Regiones del miembro superior
  "muñeca": ["muneca", "carpo", "radiocarpiana", "region carpiana", "articulacion radiocarpiana"],
  "hombro": ["glenohumeral", "escapulohumeral", "deltoides", "manguito rotador", "escapular"],
  "codo": ["articulacion del codo", "olécranon", "olecranon", "epicóndilo", "epicondilo", "cubital"],
  "axila": ["axilar", "fosa axilar", "hueco axilar", "cavidad axilar"],
  "antebrazo": ["antebraquial", "region antebraquial"],
  // Plexos y nervios específicos
  "plexo": ["plexo braquial", "plexo cervical", "plexo lumbar", "plexo sacro", "plexo lumbosacro"],
  "mediano": ["nervio mediano", "n. mediano"],
  "cubital": ["nervio cubital", "n. cubital", "nervio ulnar", "ulnar"],
  "radial": ["nervio radial", "n. radial"],
  // Espacios y canales
  "túnel carpiano": ["tunel carpiano", "canal del carpo", "conducto carpiano", "retináculo flexor", "retinaculo flexor"],
  "canal": ["conducto", "túnel", "tunel", "surco", "corredera", "gotera"],
  "fosa": ["fosa cubital", "fosa poplítea", "fosa axilar", "fosa temporal", "hueco popliteo"],
  // Tejidos conectivos
  "ligamento": ["ligamentoso", "ligamentario"],
  "tendón": ["tendon", "tendinoso", "aponeurosis", "aponeurótico", "aponeurotco"],
  "fascia": ["fascial", "aponeurosis", "vaina"],
  "articulación": ["articulacion", "articular", "sinovial", "diartrosis"],
  // Sistema linfático
  "ganglio": ["ganglionar", "linfonodo", "nódulo linfático", "nodulo linfatico", "linfadenopatia"],
  // Vasos específicos
  "tronco": ["tronco arterial", "tronco venoso", "tronco nervioso"],
  "rama": ["ramo", "colateral", "terminal", "ramas"],
  // Órganos
  "corazón": ["corazon", "cardíaco", "cardiaco", "miocardio", "pericardio"],
  "pulmón": ["pulmon", "pulmonar", "respiratorio", "bronquio", "alveolo"],
  "riñón": ["rinon", "renal", "nefrona", "nefron", "glomerulo"],
  "hígado": ["higado", "hepático", "hepatico", "hepatocito"],
  "estómago": ["estomago", "gástrico", "gastrico"],
  "intestino": ["entérico", "enterico", "duodeno", "yeyuno", "íleon", "ileon", "colon"],
  "cerebro": ["cerebral", "encéfalo", "encefalo", "encefálico", "encefalico", "corteza"],
  "médula": ["medula", "medular", "espinal"],
  // Regiones corporales
  "columna": ["vertebral", "raquis", "raquídeo", "raquideo", "vértebra", "vertebra"],
  "brazo": ["braquial", "miembro superior", "humeral", "húmero", "humero"],
  "pierna": ["crural", "miembro inferior", "femoral", "fémur", "femur", "tibial", "tibia"],
  "mano": ["manual", "palmar", "carpo", "metacarpo", "falange", "volar"],
  "pie": ["podal", "plantar", "tarso", "metatarso"],
  "cabeza": ["cefálico", "cefalico", "craneal", "cráneo", "craneo"],
  "cuello": ["cervical", "cervicales"],
  "tórax": ["torax", "torácico", "toracico", "pectoral", "pecho"],
  "abdomen": ["abdominal", "peritoneo", "peritoneal"],
  "pelvis": ["pélvico", "pelvico", "pelviano"],
  "dorso": ["dorsal", "espalda", "posterior"],
  "palma": ["palmar", "volar"],
  // Movimientos
  "flexor": ["flexión", "flexion", "flexora"],
  "extensor": ["extensión", "extension", "extensora"],
  "aductor": ["aducción", "aduccion"],
  "abductor": ["abducción", "abduccion"],
  // Histología y citología
  "célula": ["celula", "celular", "citoplasma", "citoplasmático"],
  "tejido": ["tisular", "histológico", "histologico"],
  "sangre": ["hemático", "hematico", "sanguíneo", "sanguineo", "hematológico"],
  // Patología
  "inflamación": ["inflamacion", "inflamatorio", "flogosis"],
  "tumor": ["tumoral", "neoplasia", "neoplásico", "neoplasico", "cáncer", "cancer"],
  "fractura": ["ósea", "osea"],
  // Orientación espacial
  "anterior": ["ventral"],
  "posterior": ["dorsal"],
  "superior": ["craneal", "cefálico"],
  "inferior": ["caudal"],
  "lateral": ["externo"],
  "medial": ["interno"],
  "proximal": ["cercano", "próximo"],
  "distal": ["lejano", "alejado"],
};

// Expandir query con sinónimos
export function expandQuery(query) {
  const words = query.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const expandedWords = [...words];

  // Buscar sinónimos para cada palabra
  words.forEach((word) => {
    Object.entries(MEDICAL_SYNONYMS).forEach(([key, synonyms]) => {
      const keyClean = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const allTerms = [keyClean, ...synonyms.map(s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())];
      
      if (allTerms.some((term) => term.includes(word) || word.includes(term))) {
        allTerms.forEach((term) => {
          if (!expandedWords.includes(term)) {
            expandedWords.push(term);
          }
        });
      }
    });
  });

  // También buscar la frase completa
  const fullPhrase = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  Object.entries(MEDICAL_SYNONYMS).forEach(([key, synonyms]) => {
    const keyClean = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const allTerms = [keyClean, ...synonyms.map(s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())];

    if (allTerms.some((term) => fullPhrase.includes(term))) {
      allTerms.forEach((term) => {
        term.split(/\s+/).forEach((t) => {
          if (t.length > 2 && !expandedWords.includes(t)) {
            expandedWords.push(t);
          }
        });
      });
    }
  });

  return expandedWords;
}

// ============================================================
// GUARDAR MATERIAL CON PÁGINAS
// ============================================================

export function saveMaterialWithPages({ year, materia, libro, fragments }) {
  ensureDir(DATA_DIR);
  const filePath = getMateriaPath(year, materia);

  let data = { fragments: [] };
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  }

  const newFragments = fragments.map((frag, index) => ({
    id: `${Date.now()}_${index}`,
    text: frag.text,
    page: frag.page,
    libro: libro,
    fechaCarga: new Date().toISOString(),
  }));

  data.fragments = [...data.fragments, ...newFragments];

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  const pages = [...new Set(newFragments.map((f) => f.page).filter(Boolean))];

  return {
    added: newFragments.length,
    total: data.fragments.length,
    totalPages: pages.length,
  };
}

export function saveMaterial({ year, materia, libro, fragments }) {
  return saveMaterialWithPages({
    year,
    materia,
    libro,
    fragments: fragments.map((text) => ({ text, page: null })),
  });
}

// ============================================================
// BUSCAR MATERIAL RELEVANTE (MEJORADA)
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

  // Expandir la query con sinónimos
  const expandedWords = expandQuery(query);

  const scored = data.fragments.map((fragment) => {
    const text = fragment.text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let score = 0;

    expandedWords.forEach((word) => {
      // Búsqueda de palabra completa
      const regex = new RegExp(word, "g");
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 2;
      }

      // Búsqueda parcial (la palabra está contenida)
      if (text.includes(word)) {
        score += 1;
      }
    });

    // Bonus si la frase exacta de la query aparece en el texto
    const queryClean = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (text.includes(queryClean)) {
      score += 10;
    }

    return { ...fragment, score };
  });

  return scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ============================================================
// OBTENER FRAGMENTO POR ID
// ============================================================

export function getFragmentById(year, materiaKey, fragmentId) {
  const filePath = getMateriaPath(year, materiaKey);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  return data.fragments.find((f) => f.id === fragmentId) || null;
}

// ============================================================
// OBTENER TODOS LOS FRAGMENTOS DE UNA PÁGINA
// ============================================================

export function getPageFragments(year, materiaKey, libro, page) {
  const filePath = getMateriaPath(year, materiaKey);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  return data.fragments.filter(
    (f) => f.libro === libro && f.page === page
  );
}

// ============================================================
// ESTADÍSTICAS
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

export function deleteMaterial(year, materiaKey) {
  const filePath = getMateriaPath(year, materiaKey);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// ============================================================
// BORRAR UN LIBRO ESPECÍFICO (Y SUS FRAGMENTOS)
// ============================================================

export function deleteMaterialWithPages(year, materiaKey, libroName) {
  const filePath = getMateriaPath(year, materiaKey);

  if (!fs.existsSync(filePath)) {
    return false; // El archivo de la materia no existe
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  // Filtramos para quedarnos con todos los fragmentos MENOS los del libro que queremos borrar
  const initialLength = data.fragments.length;
  data.fragments = data.fragments.filter((f) => f.libro !== libroName);
  const finalLength = data.fragments.length;

  // Si no se borró nada, devolvemos false
  if (initialLength === finalLength) {
    return false;
  }

  // Guardamos el JSON actualizado
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return true;
}