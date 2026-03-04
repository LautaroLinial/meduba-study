"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM, getYears, getMaterias } from "@/lib/curriculum";

export default function HomePage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(null);
  const [hoveredYear, setHoveredYear] = useState(null);
  const [hoveredMateria, setHoveredMateria] = useState(null);

  const years = getYears();

  const handleMateriaSelect = (materiaKey) => {
    router.push(`/chat?year=${selectedYear}&materia=${materiaKey}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 h-16 flex items-center justify-between sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-sky-500/20">
            M
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide">MedUBA Study</div>
            <div className="text-[11px] text-sky-400 tracking-widest uppercase">
              Facultad de Medicina
            </div>
          </div>
        </div>
        {selectedYear && (
          <button
            onClick={() => setSelectedYear(null)}
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          >
            ← Volver
          </button>
        )}
      </header>

      {/* Contenido principal */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
        {!selectedYear ? (
          /* ===== SELECCIÓN DE AÑO ===== */
          <>
            <div className="text-center mb-12">
              <p className="text-sky-400 text-sm tracking-[3px] uppercase mb-3 font-medium">
                Bienvenido/a
              </p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                ¿En qué año estás?
              </h1>
              <p className="text-slate-500 text-lg max-w-lg mx-auto">
                Seleccioná tu año de cursada para acceder al material de estudio
                y al asistente inteligente.
              </p>
            </div>

            <div className="flex gap-6 flex-wrap justify-center">
              {years.map((year) => (
                <button
                  key={year.number}
                  onClick={() => setSelectedYear(year.number)}
                  onMouseEnter={() => setHoveredYear(year.number)}
                  onMouseLeave={() => setHoveredYear(null)}
                  className={`w-52 p-8 rounded-2xl border transition-all duration-300 text-center
                    ${
                      hoveredYear === year.number
                        ? "bg-sky-500/10 border-sky-500/40 -translate-y-1 shadow-xl shadow-sky-500/10"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                    }`}
                >
                  <div
                    className={`text-5xl font-extrabold mb-2 bg-clip-text text-transparent transition-all duration-300
                    ${
                      hoveredYear === year.number
                        ? "bg-gradient-to-br from-sky-400 to-indigo-400"
                        : "bg-gradient-to-br from-slate-500 to-slate-600"
                    }`}
                  >
                    {year.number}°
                  </div>
                  <div
                    className={`text-base font-medium mb-1 transition-colors ${
                      hoveredYear === year.number
                        ? "text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {year.name}
                  </div>
                  <div
                    className={`text-sm transition-colors ${
                      hoveredYear === year.number
                        ? "text-sky-300"
                        : "text-slate-600"
                    }`}
                  >
                    {year.materiaCount} materias
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-12 p-4 bg-sky-500/[0.06] border border-sky-500/10 rounded-xl max-w-xl text-center">
              <p className="text-sky-300 text-sm leading-relaxed">
                💡 <strong>¿Cómo funciona?</strong> Seleccioná tu año y materia.
                El asistente responderá tus preguntas basándose en la
                bibliografía oficial de la cátedra.
              </p>
            </div>
          </>
        ) : (
          /* ===== SELECCIÓN DE MATERIA ===== */
          <>
            <div className="text-center mb-12">
              <p className="text-sky-400 text-sm tracking-[3px] uppercase mb-3">
                {CURRICULUM[selectedYear].name}
              </p>
              <h1 className="text-4xl font-bold">Elegí tu materia</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl w-full">
              {getMaterias(selectedYear).map((materia) => (
                <button
                  key={materia.key}
                  onClick={() => handleMateriaSelect(materia.key)}
                  onMouseEnter={() => setHoveredMateria(materia.key)}
                  onMouseLeave={() => setHoveredMateria(null)}
                  className={`p-7 rounded-2xl border transition-all duration-300 text-left
                    ${
                      hoveredMateria === materia.key
                        ? "bg-sky-500/10 border-sky-500/30 -translate-y-0.5"
                        : "bg-white/[0.02] border-white/[0.05]"
                    }`}
                >
                  <div className="text-3xl mb-3">{materia.icon}</div>
                  <div className="text-xl font-semibold text-white mb-2">
                    {materia.name}
                  </div>
                  <div className="text-slate-500 text-sm mb-3 leading-relaxed">
                    {materia.libros.slice(0, 2).map((l) => l.split(" - ")[0]).join(", ")}
                    {materia.libros.length > 2 &&
                      ` +${materia.libros.length - 2} más`}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {materia.temas.slice(0, 3).map((tema) => (
                      <span
                        key={tema}
                        className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/10"
                      >
                        {tema}
                      </span>
                    ))}
                    {materia.temas.length > 3 && (
                      <span className="text-[11px] text-slate-600 px-1">
                        +{materia.temas.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}