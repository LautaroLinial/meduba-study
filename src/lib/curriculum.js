// ============================================================
// CURRICULUM - Plan de estudios de Medicina UBA
// Con sistema de cátedras
// ============================================================

export const CURRICULUM = {
  1: {
    name: "Primer Año",
    materias: {
      anatomia: {
        name: "Anatomía",
        icon: "🦴",
        color: "rgba(59,130,246,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
          3: { name: "Cátedra 3", libros: [] },
        },
      },
      histologia: {
        name: "Histología",
        icon: "🔬",
        color: "rgba(139,92,246,0.12)",
        catedras: {
          1: { name: "Cátedra Única", libros: [] },
        },
      },
      embriologia: {
        name: "Embriología",
        icon: "🧫",
        color: "rgba(245,158,11,0.12)",
        catedras: {
          1: { name: "Cátedra Única", libros: [] },
        },
      },
      biologia_celular_genetica: {
        name: "Biología Celular y Genética",
        icon: "🧬",
        color: "rgba(16,185,129,0.12)",
        catedras: {
          1: { name: "Cátedra Única", libros: [] },
        },
      },
    },
  },
  2: {
    name: "Segundo Año",
    materias: {
      fisiologia: {
        name: "Fisiología",
        icon: "💓",
        color: "rgba(239,68,68,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
        },
      },
      bioquimica: {
        name: "Bioquímica",
        icon: "⚗️",
        color: "rgba(6,182,212,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
        },
      },
    },
  },
  3: {
    name: "Tercer Año",
    materias: {
      patologia: {
        name: "Patología I",
        icon: "🩺",
        color: "rgba(244,63,94,0.12)",
        catedras: {
          1: { name: "Cátedra Única", libros: [] },
        },
      },
      farmacologia: {
        name: "Farmacología I",
        icon: "💊",
        color: "rgba(168,85,247,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
          3: { name: "Cátedra 3", libros: [] },
        },
      },
      microbiologia: {
        name: "Microbiología I",
        icon: "🦠",
        color: "rgba(34,197,94,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
        },
      },
      inmunologia: {
        name: "Inmunología",
        icon: "🛡️",
        color: "rgba(251,146,60,0.12)",
        catedras: {
          1: { name: "Cátedra 1", libros: [] },
          2: { name: "Cátedra 2", libros: [] },
        },
      },
    },
  },
};

export function getYears() {
  return Object.entries(CURRICULUM).map(([num, data]) => ({ num, ...data }));
}

export function getMaterias(year) {
  if (!CURRICULUM[year]) return [];
  return Object.entries(CURRICULUM[year].materias).map(([key, data]) => ({ key, ...data }));
}

export function getMateria(year, materiaKey) {
  if (!CURRICULUM[year] || !CURRICULUM[year].materias[materiaKey]) return null;
  return CURRICULUM[year].materias[materiaKey];
}

export function getCatedraLibros(year, materiaKey, catedraNum) {
  const materia = getMateria(year, materiaKey);
  if (!materia || !materia.catedras[catedraNum]) return [];
  return materia.catedras[catedraNum].libros;
}

export function hasMultipleCatedras(year, materiaKey) {
  const materia = getMateria(year, materiaKey);
  if (!materia) return false;
  return Object.keys(materia.catedras).length > 1;
}

export function getCatedras(year, materiaKey) {
  const materia = getMateria(year, materiaKey);
  if (!materia) return [];
  return Object.entries(materia.catedras).map(([num, data]) => ({ num, ...data }));
}

export function getAllLibros(year, materiaKey) {
  const materia = getMateria(year, materiaKey);
  if (!materia) return [];
  const allLibros = new Set();
  Object.values(materia.catedras).forEach(cat => {
    cat.libros.forEach(libro => allLibros.add(libro));
  });
  return Array.from(allLibros);
}