// ============================================================
// CURRICULUM - Plan de estudios de Medicina UBA
// Acá se definen todos los años, materias, libros y temas
// Podés agregar o modificar lo que necesites
// ============================================================

export const CURRICULUM = {
  1: {
    name: "Primer Año",
    materias: {
      anatomia: {
        name: "Anatomía",
        icon: "🦴",
        color: "#3b82f6",
        libros: [
          "Latarjet & Ruiz Liard - Anatomía Humana",
          "Rouvière & Delmas - Anatomía Humana",
          "Testut & Latarjet - Tratado de Anatomía Humana",
          "Netter - Atlas de Anatomía Humana",
          "Prometheus - Atlas de Anatomía"
        ],
        temas: [
          "Generalidades y Osteología",
          "Miembro Superior",
          "Miembro Inferior",
          "Tronco (Columna, Tórax, Abdomen)",
          "Cabeza y Cuello",
          "Neuroanatomía",
          "Esplacnología",
          "Aparato Circulatorio",
          "Sistema Nervioso Periférico"
        ]
      },
      histologia: {
        name: "Histología y Embriología",
        icon: "🔬",
        color: "#8b5cf6",
        libros: [
          "Ross & Pawlina - Histología",
          "Junqueira - Histología Básica",
          "Geneser - Histología",
          "Langman - Embriología Médica",
          "Moore - Embriología Clínica"
        ],
        temas: [
          "Tejido Epitelial",
          "Tejido Conectivo",
          "Tejido Muscular",
          "Tejido Nervioso",
          "Sangre y Hematopoyesis",
          "Sistema Cardiovascular",
          "Aparato Respiratorio",
          "Aparato Digestivo",
          "Embriología General",
          "Embriología Especial"
        ]
      },
      biofisica: {
        name: "Biofísica",
        icon: "⚡",
        color: "#f59e0b",
        libros: [
          "Cicardo - Biofísica",
          "Frumento - Biofísica",
          "Parisi - Biofísica"
        ],
        temas: [
          "Termodinámica",
          "Bioelectricidad",
          "Potencial de Membrana",
          "Óptica y Visión",
          "Acústica y Audición",
          "Mecánica de Fluidos",
          "Radiaciones",
          "Biomecánica"
        ]
      },
      quimica: {
        name: "Química Biológica",
        icon: "🧬",
        color: "#10b981",
        libros: [
          "Lehninger - Principios de Bioquímica",
          "Stryer - Bioquímica",
          "Harper - Bioquímica Ilustrada",
          "Blanco - Química Biológica"
        ],
        temas: [
          "Aminoácidos y Proteínas",
          "Enzimas",
          "Metabolismo de Carbohidratos",
          "Glucólisis y Ciclo de Krebs",
          "Cadena Respiratoria",
          "Metabolismo de Lípidos",
          "Metabolismo de Aminoácidos",
          "Ácidos Nucleicos y Replicación",
          "Transcripción y Traducción",
          "Biología Molecular"
        ]
      }
    }
  },
  2: {
    name: "Segundo Año",
    materias: {
      fisiologia: {
        name: "Fisiología",
        icon: "❤️",
        color: "#ef4444",
        libros: [
          "Guyton & Hall - Tratado de Fisiología Médica",
          "Ganong - Fisiología Médica",
          "Cingolani & Houssay - Fisiología Humana",
          "Boron & Boulpaep - Fisiología Médica"
        ],
        temas: [
          "Fisiología Celular",
          "Neurofisiología",
          "Fisiología Cardiovascular",
          "Fisiología Respiratoria",
          "Fisiología Renal",
          "Fisiología Digestiva",
          "Sistema Endocrino",
          "Fisiología del Ejercicio",
          "Medio Interno"
        ]
      },
      microbiologia: {
        name: "Microbiología",
        icon: "🦠",
        color: "#06b6d4",
        libros: [
          "Murray - Microbiología Médica",
          "Jawetz - Microbiología Médica",
          "Basualdo - Microbiología Biomédica"
        ],
        temas: [
          "Bacteriología General",
          "Bacteriología Especial",
          "Virología",
          "Micología",
          "Parasitología",
          "Inmunología Básica",
          "Inmunología Clínica",
          "Antimicrobianos"
        ]
      },
      patologia: {
        name: "Anatomía Patológica",
        icon: "🏥",
        color: "#f43f5e",
        libros: [
          "Robbins - Patología Estructural y Funcional",
          "Rubin - Patología",
          "Kumar - Robbins Patología Humana"
        ],
        temas: [
          "Lesión y Muerte Celular",
          "Inflamación Aguda y Crónica",
          "Reparación Tisular",
          "Trastornos Hemodinámicos",
          "Neoplasias",
          "Patología Genética",
          "Inmunopatología",
          "Patología Ambiental"
        ]
      }
    }
  },
  3: {
    name: "Tercer Año",
    materias: {
      farmacologia: {
        name: "Farmacología",
        icon: "💊",
        color: "#a855f7",
        libros: [
          "Goodman & Gilman - Las Bases Farmacológicas de la Terapéutica",
          "Katzung - Farmacología Básica y Clínica",
          "Velázquez - Farmacología Básica y Clínica",
          "Florez - Farmacología Humana"
        ],
        temas: [
          "Farmacocinética",
          "Farmacodinamia",
          "Sistema Nervioso Autónomo",
          "Farmacología del SNC",
          "Analgésicos y Antiinflamatorios",
          "Farmacología Cardiovascular",
          "Quimioterapia Antimicrobiana",
          "Farmacología Endocrina",
          "Quimioterapia Antineoplásica"
        ]
      },
      semiologia: {
        name: "Semiología",
        icon: "🩺",
        color: "#0ea5e9",
        libros: [
          "Argente & Álvarez - Semiología Médica",
          "Cossio - Medicina Interna",
          "Surós - Semiología Médica y Técnica Exploratoria"
        ],
        temas: [
          "Anamnesis y Relación Médico-Paciente",
          "Examen Físico General",
          "Semiología Cardiovascular",
          "Semiología Respiratoria",
          "Semiología Abdominal",
          "Semiología Neurológica",
          "Semiología del Aparato Locomotor",
          "Métodos Complementarios"
        ]
      }
    }
  }
};

// Función helper para obtener la lista de años
export function getYears() {
  return Object.entries(CURRICULUM).map(([num, data]) => ({
    number: parseInt(num),
    name: data.name,
    materiaCount: Object.keys(data.materias).length
  }));
}

// Función helper para obtener las materias de un año
export function getMaterias(year) {
  const yearData = CURRICULUM[year];
  if (!yearData) return [];
  return Object.entries(yearData.materias).map(([key, data]) => ({
    key,
    ...data
  }));
}

// Función helper para obtener una materia específica
export function getMateria(year, materiaKey) {
  return CURRICULUM[year]?.materias[materiaKey] || null;
}