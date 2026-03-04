"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM } from "@/lib/curriculum";

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState("1");
  const [selectedMateria, setSelectedMateria] = useState("");
  const [selectedLibro, setSelectedLibro] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [message, setMessage] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);

  const materias = CURRICULUM[selectedYear]
    ? Object.entries(CURRICULUM[selectedYear].materias)
    : [];

  const libros = selectedMateria && CURRICULUM[selectedYear]?.materias[selectedMateria]
    ? CURRICULUM[selectedYear].materias[selectedMateria].libros
    : [];

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMateria("");
    setSelectedLibro("");
  };

  const handleMateriaChange = (materia) => {
    setSelectedMateria(materia);
    setSelectedLibro("");
  };

  // Simular progreso visual mientras se procesa
  useEffect(() => {
    let interval;
    if (uploading) {
      setProgress(0);
      setProgressStage("Subiendo archivo...");

      let currentProgress = 0;
      interval = setInterval(() => {
        currentProgress += Math.random() * 3;

        if (currentProgress < 30) {
          setProgressStage("📤 Subiendo archivo...");
        } else if (currentProgress < 60) {
          setProgressStage("📖 Extrayendo texto del PDF...");
        } else if (currentProgress < 85) {
          setProgressStage("✂️ Dividiendo en fragmentos...");
        } else {
          setProgressStage("💾 Guardando material...");
        }

        if (currentProgress >= 90) {
          currentProgress = 90; // Se queda en 90 hasta que termine de verdad
          clearInterval(interval);
        }

        setProgress(Math.min(currentProgress, 90));
      }, 500);
    } else {
      setProgress(0);
      setProgressStage("");
    }

    return () => clearInterval(interval);
  }, [uploading]);

  const handleUpload = async () => {
    if (!file || !selectedYear || !selectedMateria || !selectedLibro) {
      setMessage({ type: "error", text: "Completá todos los campos antes de subir." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", selectedYear);
      formData.append("materia", selectedMateria);
      formData.append("libro", selectedLibro);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Completar la barra al 100%
      setProgress(100);
      setProgressStage("✅ ¡Completado!");

      // Esperar un momento para que se vea el 100%
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message,
        });
        setUploadHistory((prev) => [
          {
            fileName: file.name,
            libro: selectedLibro,
            materia: CURRICULUM[selectedYear].materias[selectedMateria].name,
            fragments: data.fragmentsAdded,
            textLength: data.textLength,
            date: new Date().toLocaleString("es-AR"),
          },
          ...prev,
        ]);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión. Verificá que el servidor esté corriendo." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 h-16 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-violet-500/20">
            ⚙
          </div>
          <div>
            <div className="text-lg font-bold">Panel de Administrador</div>
            <div className="text-[11px] text-violet-400 tracking-widest uppercase">
              Carga de material
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
        >
          ← Volver a la app
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        {/* Instrucciones */}
        <div className="mb-8 p-5 bg-violet-500/[0.06] border border-violet-500/15 rounded-xl">
          <h2 className="text-violet-300 font-semibold mb-2">📋 ¿Cómo cargar material?</h2>
          <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside leading-relaxed">
            <li>Seleccioná el <strong className="text-slate-300">año</strong> y la <strong className="text-slate-300">materia</strong></li>
            <li>Elegí a qué <strong className="text-slate-300">libro</strong> pertenece el archivo</li>
            <li>Subí el archivo (PDF, Word o texto plano)</li>
            <li>El sistema extrae el texto y lo divide en fragmentos</li>
            <li>¡Listo! Los alumnos ya pueden preguntar sobre ese material</li>
          </ol>
        </div>

        {/* Formulario */}
        <div className="space-y-6">
          {/* Año */}
          <div>
            <label className="block text-sm text-slate-400 mb-2 font-medium">
              1. Seleccioná el año
            </label>
            <div className="flex gap-3">
              {Object.entries(CURRICULUM).map(([num, data]) => (
                <button
                  key={num}
                  onClick={() => handleYearChange(num)}
                  className={`px-5 py-3 rounded-xl text-sm font-medium transition-all
                    ${selectedYear === num
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                >
                  {data.name}
                </button>
              ))}
            </div>
          </div>

          {/* Materia */}
          <div>
            <label className="block text-sm text-slate-400 mb-2 font-medium">
              2. Seleccioná la materia
            </label>
            <div className="grid grid-cols-2 gap-3">
              {materias.map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => handleMateriaChange(key)}
                  className={`px-4 py-3 rounded-xl text-sm text-left transition-all flex items-center gap-2
                    ${selectedMateria === key
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                >
                  <span className="text-lg">{data.icon}</span>
                  {data.name}
                </button>
              ))}
            </div>
          </div>

          {/* Libro */}
          {selectedMateria && (
            <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">
                3. ¿De qué libro es el material?
              </label>
              <div className="space-y-2">
                {libros.map((libro) => (
                  <button
                    key={libro}
                    onClick={() => setSelectedLibro(libro)}
                    className={`block w-full px-4 py-3 rounded-xl text-sm text-left transition-all
                      ${selectedLibro === libro
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                        : "bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]"
                      }`}
                  >
                    📖 {libro}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload de archivo */}
          {selectedLibro && (
            <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">
                4. Subí el archivo
              </label>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all
                  ${uploading
                    ? "border-violet-500/30 bg-violet-500/[0.03] cursor-wait"
                    : "border-slate-700 hover:border-violet-500/40 cursor-pointer hover:bg-violet-500/[0.03]"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                  disabled={uploading}
                />
                {file ? (
                  <div>
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-white font-medium">{file.name}</div>
                    <div className="text-slate-500 text-sm mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB — {!uploading && "Click para cambiar"}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📄</div>
                    <div className="text-slate-300">Click para seleccionar archivo</div>
                    <div className="text-slate-600 text-sm mt-1">
                      PDF, Word (.docx), o texto (.txt, .md)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {uploading && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">{progressStage}</span>
                <span className="text-sm text-violet-400 font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress >= 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)",
                    backgroundSize: "200% 100%",
                    animation: progress < 100 ? "shimmer 2s infinite" : "none",
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 text-center">
                Los archivos grandes pueden tardar varios minutos. No cierres esta pestaña.
              </p>
            </div>
          )}

          {/* Botón de subir */}
          {file && selectedLibro && !uploading && (
            <button
              onClick={handleUpload}
              className="w-full py-4 rounded-xl text-base font-semibold transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/20 cursor-pointer"
            >
              🚀 Subir y procesar material
            </button>
          )}

          {/* Mensaje de resultado */}
          {message && (
            <div
              className={`p-4 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border border-red-500/20 text-red-300"
              }`}
            >
              {message.type === "success" ? "✅" : "❌"} {message.text}
            </div>
          )}
        </div>

        {/* Historial de cargas */}
        {uploadHistory.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm text-slate-500 tracking-[2px] uppercase font-semibold mb-4">
              Historial de cargas
            </h3>
            <div className="space-y-3">
              {uploadHistory.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl"
                >
                  <span className="text-2xl">📕</span>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{item.fileName}</div>
                    <div className="text-slate-500 text-xs">
                      {item.libro} → {item.materia} · {item.fragments} fragmentos · {(item.textLength / 1024).toFixed(0)} KB de texto
                    </div>
                  </div>
                  <div className="text-emerald-400 text-xs font-medium">✓ Cargado</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 p-5 bg-sky-500/[0.06] border border-sky-500/10 rounded-xl">
          <h3 className="text-sky-300 font-semibold mb-2">💡 Tips</h3>
          <ul className="text-slate-400 text-sm space-y-1 leading-relaxed">
            <li>• Podés subir <strong className="text-slate-300">varios archivos</strong> del mismo libro (capítulo por capítulo)</li>
            <li>• Los <strong className="text-slate-300">PDFs con texto seleccionable</strong> funcionan mejor que los escaneados</li>
            <li>• Para archivos muy grandes (&gt;50MB), es mejor dividirlos por capítulo</li>
            <li>• Cuanto más material cargues, mejores serán las respuestas del tutor</li>
          </ul>
        </div>
      </main>

      {/* CSS para la animación de la barra */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}