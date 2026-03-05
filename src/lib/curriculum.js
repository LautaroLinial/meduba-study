// ============================================================
// CURRICULUM - Plan de estudios de Medicina UBA
// ============================================================

export const CURRICULUM = {
  1: {
    name: "Primer Año",
    materias: {
      anatomia: {
        name: "Anatomía",
        icon: "🦴",
        color: "rgba(59,130,246,0.12)",
        libros: [],
        temas: [
          "Osteología general",
          "Artrología general",
          "Miología general",
          "Miembro superior",
          "Miembro inferior",
          "Tronco y columna vertebral",
          "Cabeza y cuello",
          "Neuroanatomía",
          "Aparato circulatorio",
          "Aparato respiratorio",
          "Aparato digestivo",
          "Aparato urogenital",
        ],
      },
      histologia: {
        name: "Histología",
        icon: "🔬",
        color: "rgba(139,92,246,0.12)",
        libros: [],
        temas: [
          "Tejido epitelial",
          "Tejido conectivo",
          "Tejido cartilaginoso y óseo",
          "Tejido muscular",
          "Tejido nervioso",
          "Sangre y hematopoyesis",
          "Sistema cardiovascular",
          "Sistema linfático",
          "Sistema respiratorio",
          "Sistema digestivo",
          "Sistema urinario",
          "Sistema endocrino",
          "Piel y anexos",
        ],
      },
      biologia_celular: {
        name: "Biología Celular",
        icon: "🧬",
        color: "rgba(16,185,129,0.12)",
        libros: [],
        temas: [
          "Estructura celular",
          "Membrana plasmática y transporte",
          "Sistema de endomembranas",
          "Mitocondrias y metabolismo energético",
          "Citoesqueleto",
          "Núcleo y cromatina",
          "Ciclo celular",
          "Mitosis y meiosis",
          "Señalización celular",
          "Muerte celular",
        ],
      },
      embriologia: {
        name: "Embriología",
        icon: "🧫",
        color: "rgba(245,158,11,0.12)",
        libros: [],
        temas: [
          "Gametogénesis",
          "Fecundación e implantación",
          "Gastrulación y neurulación",
          "Desarrollo del sistema nervioso",
          "Desarrollo del aparato cardiovascular",
          "Desarrollo del aparato digestivo",
          "Desarrollo del aparato urogenital",
          "Desarrollo del aparato respiratorio",
          "Anomalías congénitas",
        ],
      },
      genetica: {
        name: "Genética",
        icon: "🧪",
        color: "rgba(236,72,153,0.12)",
        libros: [],
        temas: [
          "Genética mendeliana",
          "Herencia ligada al sexo",
          "Herencia multifactorial",
          "Mutaciones génicas",
          "Aberraciones cromosómicas",
          "Genética molecular",
          "Técnicas de biología molecular",
          "Genética de poblaciones",
          "Consejo genético",
        ],
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
        libros: [],
        temas: [
          "Fisiología celular y de membrana",
          "Fisiología cardiovascular",
          "Fisiología respiratoria",
          "Fisiología renal",
          "Fisiología digestiva",
          "Fisiología del sistema nervioso",
          "Fisiología endocrina",
          "Fisiología muscular",
          "Medio interno y homeostasis",
          "Equilibrio ácido-base",
        ],
      },
      bioquimica: {
        name: "Bioquímica",
        icon: "⚗️",
        color: "rgba(6,182,212,0.12)",
        libros: [],
        temas: [
          "Aminoácidos y proteínas",
          "Enzimas y cinética enzimática",
          "Glucólisis y gluconeogénesis",
          "Ciclo de Krebs",
          "Cadena respiratoria y fosforilación oxidativa",
          "Metabolismo de lípidos",
          "Metabolismo de aminoácidos",
          "Biología molecular del gen",
          "Replicación del ADN",
          "Transcripción y traducción",
          "Regulación de la expresión génica",
          "Vitaminas y coenzimas",
        ],
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
        libros: [],
        temas: [
          "Lesión y muerte celular",
          "Inflamación aguda y crónica",
          "Reparación tisular",
          "Trastornos hemodinámicos",
          "Neoplasias: generalidades",
          "Neoplasias: nomenclatura y clasificación",
          "Patología vascular",
          "Patología cardíaca",
          "Patología pulmonar",
          "Patología del aparato digestivo",
          "Inmunopatología",
        ],
      },
      farmacologia: {
        name: "Farmacología I",
        icon: "💊",
        color: "rgba(168,85,247,0.12)",
        libros: [],
        temas: [
          "Farmacocinética",
          "Farmacodinamia",
          "Sistema nervioso autónomo",
          "Analgésicos y antiinflamatorios",
          "Antibióticos: generalidades",
          "Antibióticos: betalactámicos",
          "Antibióticos: macrólidos y quinolonas",
          "Antifúngicos y antivirales",
          "Farmacología cardiovascular",
          "Farmacología del SNC",
        ],
      },
      microbiologia: {
        name: "Microbiología I",
        icon: "🦠",
        color: "rgba(34,197,94,0.12)",
        libros: [],
        temas: [
          "Bacteriología general",
          "Cocos gram positivos",
          "Cocos gram negativos",
          "Bacilos gram positivos",
          "Bacilos gram negativos",
          "Micobacterias",
          "Virología general",
          "Virus respiratorios",
          "Virus hepatotrópicos",
          "VIH y retrovirus",
          "Parasitología general",
          "Micología general",
        ],
      },
      inmunologia: {
        name: "Inmunología",
        icon: "🛡️",
        color: "rgba(251,146,60,0.12)",
        libros: [],
        temas: [
          "Inmunidad innata",
          "Inmunidad adaptativa",
          "Antígenos y anticuerpos",
          "Sistema del complemento",
          "Complejo mayor de histocompatibilidad",
          "Linfocitos T y B",
          "Respuesta inmune humoral",
          "Respuesta inmune celular",
          "Hipersensibilidad",
          "Autoinmunidad",
          "Inmunodeficiencias",
          "Vacunas e inmunización",
        ],
      },
    },
  },
};

export function getYears() {
  return Object.entries(CURRICULUM).map(([num, data]) => ({
    num,
    ...data,
  }));
}

export function getMaterias(year) {
  if (!CURRICULUM[year]) return [];
  return Object.entries(CURRICULUM[year].materias).map(([key, data]) => ({
    key,
    ...data,
  }));
}

export function getMateria(year, materiaKey) {
  if (!CURRICULUM[year] || !CURRICULUM[year].materias[materiaKey]) return null;
  return CURRICULUM[year].materias[materiaKey];
}