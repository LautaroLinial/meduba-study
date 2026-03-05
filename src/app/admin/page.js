"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM } from "@/lib/curriculum";
import { useAuth } from "@/lib/useAuth";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth("admin");
  const fileInputRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState("1");
  const [selectedMateria, setSelectedMateria] = useState("");
  const [selectedLibro, setSelectedLibro] = useState("");
  const [customLibro, setCustomLibro] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
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
    setCustomLibro("");
  };

  const handleMateriaChange = (materia) => {
    setSelectedMateria(materia);
    setSelectedLibro("");
    setCustomLibro("");
  };

  useEffect(() => {
    let interval;
    if (uploading) {
      setProgress(0);
      let currentProgress = 0;
      interval = setInterval(() => {
        currentProgress += Math.random() * 3;
        if (currentProgress < 30) setProgressStage("Subiendo archivo...");
        else if (currentProgress < 60) setProgressStage("Extrayendo texto página por página...");
        else if (currentProgress < 85) setProgressStage("Generando páginas individuales...");
        else setProgressStage("Guardando material...");
        if (currentProgress >= 90) { currentProgress = 90; clearInterval(interval); }
        setProgress(Math.min(currentProgress, 90));
      }, 500);
    } else {
      setProgress(0);
      setProgressStage("");
    }
    return () => clearInterval(interval);
  }, [uploading]);

  const handleUpload = async () => {
    const libroFinal = selectedLibro || customLibro.trim();
    if (!file || !selectedYear || !selectedMateria || !libroFinal) {
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
      formData.append("libro", libroFinal);
      formData.append("pageOffset", pageOffset.toString());

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setProgress(100);
      setProgressStage("¡Completado!");
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        setUploadHistory((prev) => [{
          fileName: file.name, libro: libroFinal,
          materia: CURRICULUM[selectedYear].materias[selectedMateria].name,
          fragments: data.fragmentsAdded, totalPages: data.totalPages,
          offset: pageOffset, date: new Date().toLocaleString("es-AR"),
        }, ...prev]);
        setFile(null);
        setCustomLibro("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión." });
    } finally {
      setUploading(false);
    }
  };

  const yearColors = {
    "1": { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", accent: "#3b82f6" },
    "2": { gradient: "linear-gradient(135deg, #10b981, #06b6d4)", accent: "#10b981" },
    "3": { gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", accent: "#f59e0b" },
  };
  const colors = yearColors[selectedYear];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#52525b" }}>Verificando permisos...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <p style={{ color: "#71717a", marginBottom: "16px" }}>Necesitás permisos de administrador para acceder.</p>
          <button onClick={() => router.push("/")}
            style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", borderRadius: "10px", border: "none", color: "white", cursor: "pointer", fontWeight: 600 }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c" }}>
      <header style={{
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", fontWeight: 700, color: "white",
          }}>M</div>
          <div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#e4e4e7" }}>MedUBA Study</span>
            <span style={{ fontSize: "12px", color: "#52525b", marginLeft: "8px" }}>/ Admin</span>
          </div>
        </div>
        <button onClick={() => router.push("/")}
          style={{
            padding: "7px 14px", borderRadius: "8px", fontSize: "13px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
            color: "#71717a", cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseOver={(e) => { e.target.style.color = "#e4e4e7"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseOut={(e) => { e.target.style.color = "#71717a"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >← Volver</button>
      </header>

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fafafa", letterSpacing: "-0.8px", marginBottom: "6px" }}>Carga de material</h1>
          <p style={{ fontSize: "14px", color: "#52525b" }}>Subí PDFs de la bibliografía para que el tutor los use como fuente.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Año</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {Object.entries(CURRICULUM).map(([num, data]) => (
                <button key={num} onClick={() => handleYearChange(num)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s", border: "1px solid",
                    background: selectedYear === num ? "rgba(255,255,255,0.06)" : "transparent",
                    borderColor: selectedYear === num ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: selectedYear === num ? "#e4e4e7" : "#52525b",
                  }}>{data.name}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Materia</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {materias.map(([key, data]) => (
                <button key={key} onClick={() => handleMateriaChange(key)}
                  style={{
                    padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                    cursor: "pointer", transition: "all 0.2s", border: "1px solid",
                    display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
                    background: selectedMateria === key ? "rgba(255,255,255,0.06)" : "transparent",
                    borderColor: selectedMateria === key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: selectedMateria === key ? "#e4e4e7" : "#71717a",
                  }}>
                  <span style={{ fontSize: "16px" }}>{data.icon}</span>{data.name}
                </button>
              ))}
            </div>
          </div>

          {selectedMateria && (
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Libro</label>
              {libros.length > 0 && libros.map((libro) => (
                <button key={libro} onClick={() => { setSelectedLibro(libro); setCustomLibro(""); }}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                    cursor: "pointer", transition: "all 0.2s", border: "1px solid", textAlign: "left", marginBottom: "6px",
                    background: selectedLibro === libro ? "rgba(255,255,255,0.06)" : "transparent",
                    borderColor: selectedLibro === libro ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: selectedLibro === libro ? "#e4e4e7" : "#71717a",
                  }}>📖 {libro}</button>
              ))}
              <input type="text" value={customLibro}
                onChange={(e) => { setCustomLibro(e.target.value); setSelectedLibro(""); }}
                placeholder="Escribí el nombre del libro..."
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                  background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e4e4e7", outline: "none", fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>
          )}

          {(selectedLibro || customLibro.trim()) && (
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Offset de páginas</label>
              <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.5", margin: 0 }}>
                  <strong style={{ color: "#e4e4e7" }}>Página del libro - Página del PDF = offset</strong>. Si coinciden, dejá 0.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input type="number" value={pageOffset} onChange={(e) => setPageOffset(parseInt(e.target.value) || 0)}
                  style={{
                    width: "120px", padding: "10px 14px", borderRadius: "10px", fontSize: "16px",
                    background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#e4e4e7", outline: "none", textAlign: "center", fontFamily: "'JetBrains Mono', monospace",
                  }} min="-200" max="200" />
                <span style={{ fontSize: "13px", color: "#52525b" }}>Pág. libro = Pág. PDF + ({pageOffset})</span>
              </div>
            </div>
          )}

          {(selectedLibro || customLibro.trim()) && (
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Archivo</label>
              <div onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  padding: "32px", borderRadius: "12px", textAlign: "center",
                  border: "2px dashed rgba(255,255,255,0.08)", cursor: uploading ? "wait" : "pointer", transition: "all 0.2s",
                  background: file ? "rgba(255,255,255,0.02)" : "transparent",
                }}
                onMouseOver={(e) => { if (!uploading) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => setFile(e.target.files[0])} style={{ display: "none" }} disabled={uploading} />
                {file ? (
                  <div>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>✅</div>
                    <div style={{ fontSize: "14px", color: "#e4e4e7", fontWeight: 500 }}>{file.name}</div>
                    <div style={{ fontSize: "12px", color: "#52525b", marginTop: "4px" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                    <div style={{ fontSize: "14px", color: "#71717a" }}>Click para seleccionar</div>
                    <div style={{ fontSize: "12px", color: "#3f3f46", marginTop: "4px" }}>PDF, Word o texto</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#a1a1aa" }}>{progressStage}</span>
                <span style={{ fontSize: "13px", color: colors.accent, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "2px", transition: "width 0.5s ease", width: `${progress}%`, background: progress >= 100 ? "#10b981" : colors.gradient }} />
              </div>
            </div>
          )}

          {file && (selectedLibro || customLibro.trim()) && !uploading && (
            <button onClick={handleUpload}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
                border: "none", cursor: "pointer", color: "white", background: colors.gradient,
              }}>Subir y procesar material</button>
          )}

          {message && (
            <div style={{
              padding: "14px 16px", borderRadius: "10px", fontSize: "14px",
              background: message.type === "success" ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
              color: message.type === "success" ? "#34d399" : "#f87171",
            }}>{message.type === "success" ? "✅" : "❌"} {message.text}</div>
          )}
        </div>

        {uploadHistory.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <h3 style={{ fontSize: "12px", color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 600, marginBottom: "14px" }}>Historial</h3>
            {uploadHistory.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", marginBottom: "8px",
                borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: "20px" }}>📕</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "#e4e4e7", fontWeight: 500 }}>{item.fileName}</div>
                  <div style={{ fontSize: "11px", color: "#52525b" }}>{item.libro} → {item.materia} · {item.fragments} fragmentos</div>
                </div>
                <span style={{ fontSize: "11px", color: "#34d399" }}>✓</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}