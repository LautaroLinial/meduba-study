"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM, hasMultipleCatedras, getCatedras } from "@/lib/curriculum";
import { useAuth } from "@/lib/useAuth";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth("admin");
  const fileInputRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState("1");
  const [selectedMateria, setSelectedMateria] = useState("");
  const [customLibro, setCustomLibro] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [message, setMessage] = useState(null);
  const [loadedBooks, setLoadedBooks] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  const materias = CURRICULUM[selectedYear]
    ? Object.entries(CURRICULUM[selectedYear].materias)
    : [];

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMateria("");
    setCustomLibro("");
    setLoadedBooks([]);
    setAssignments({});
  };

  const handleMateriaChange = (materia) => {
    setSelectedMateria(materia);
    setCustomLibro("");
    fetchLoadedBooks(selectedYear, materia);
    if (hasMultipleCatedras(selectedYear, materia)) {
      fetchAssignments(selectedYear, materia);
    }
  };

  const fetchLoadedBooks = async (year, materia) => {
    try {
      const response = await fetch(`/api/material-info?year=${year}&materia=${materia}`);
      const data = await response.json();
      setLoadedBooks(data.libros || []);
    } catch (e) { setLoadedBooks([]); }
  };

  const fetchAssignments = async (year, materia) => {
    try {
      const response = await fetch(`/api/catedra-config?year=${year}&materia=${materia}`);
      const data = await response.json();
      setAssignments(data.assignments || {});
    } catch (e) { setAssignments({}); }
  };

  const toggleAssignment = (catNum, libroName) => {
    setAssignments(prev => {
      const current = prev[catNum] || [];
      const updated = current.includes(libroName)
        ? current.filter(l => l !== libroName)
        : [...current, libroName];
      return { ...prev, [catNum]: updated };
    });
  };

  const saveAssignments = async () => {
    setSavingAssignments(true);
    try {
      await fetch("/api/catedra-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear, materia: selectedMateria, assignments }),
      });
      setMessage({ type: "success", text: "Asignaciones guardadas correctamente." });
    } catch (e) {
      setMessage({ type: "error", text: "Error al guardar." });
    } finally {
      setSavingAssignments(false);
    }
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
    } else { setProgress(0); setProgressStage(""); }
    return () => clearInterval(interval);
  }, [uploading]);

  const handleUpload = async () => {
    if (!file || !selectedYear || !selectedMateria || !customLibro.trim()) {
      setMessage({ type: "error", text: "Completá todos los campos." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", selectedYear);
      formData.append("materia", selectedMateria);
      formData.append("libro", customLibro.trim());
      formData.append("pageOffset", pageOffset.toString());

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      setProgress(100);
      setProgressStage("¡Completado!");
      await new Promise(r => setTimeout(r, 800));

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        setFile(null);
        setCustomLibro("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchLoadedBooks(selectedYear, selectedMateria);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión." });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBook = async (libroName) => {
    if (!confirm(`¿Borrar "${libroName}"? No se puede deshacer.`)) return;
    try {
      const response = await fetch("/api/material-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear, materia: selectedMateria, libro: libroName }),
      });
      if (response.ok) {
        fetchLoadedBooks(selectedYear, selectedMateria);
        // Limpiar de asignaciones
        setAssignments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(catNum => {
            updated[catNum] = updated[catNum].filter(l => l !== libroName);
          });
          return updated;
        });
        setMessage({ type: "success", text: `"${libroName}" borrado.` });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Error al borrar." });
    }
  };

  const yearColors = {
    "1": { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", accent: "#3b82f6" },
    "2": { gradient: "linear-gradient(135deg, #10b981, #06b6d4)", accent: "#10b981" },
    "3": { gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", accent: "#f59e0b" },
  };
  const colors = yearColors[selectedYear];
  const showCatedras = selectedMateria && hasMultipleCatedras(selectedYear, selectedMateria);
  const catedras = showCatedras ? getCatedras(selectedYear, selectedMateria) : [];

  if (authLoading) {
    return (<div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#52525b" }}>Verificando permisos...</div></div>);
  }
  if (!isAdmin) {
    return (<div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
        <p style={{ color: "#71717a", marginBottom: "16px" }}>Necesitás permisos de administrador.</p>
        <button onClick={() => router.push("/")} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", borderRadius: "10px", border: "none", color: "white", cursor: "pointer", fontWeight: 600 }}>Volver</button>
      </div></div>);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c" }}>
      <header style={{
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 700, color: "white" }}>M</div>
          <div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#e4e4e7" }}>MedUBA Study</span>
            <span style={{ fontSize: "12px", color: "#52525b", marginLeft: "8px" }}>/ Admin</span>
          </div>
        </div>
        <button onClick={() => router.push("/")}
          style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a", cursor: "pointer" }}
        >← Volver</button>
      </header>

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fafafa", letterSpacing: "-0.8px", marginBottom: "6px" }}>Panel de administración</h1>
          <p style={{ fontSize: "14px", color: "#52525b" }}>Subí bibliografía y asignala a cada cátedra.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Año */}
          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Año</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {Object.entries(CURRICULUM).map(([num, data]) => (
                <button key={num} onClick={() => handleYearChange(num)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", border: "1px solid",
                    background: selectedYear === num ? "rgba(255,255,255,0.06)" : "transparent",
                    borderColor: selectedYear === num ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: selectedYear === num ? "#e4e4e7" : "#52525b",
                  }}>{data.name}</button>
              ))}
            </div>
          </div>

          {/* Materia */}
          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "10px", fontWeight: 500 }}>Materia</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {materias.map(([key, data]) => (
                <button key={key} onClick={() => handleMateriaChange(key)}
                  style={{
                    padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                    cursor: "pointer", border: "1px solid",
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

          {/* Tabs: Subir / Asignar a cátedras */}
          {selectedMateria && (
            <div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "3px" }}>
                <button onClick={() => setActiveTab("upload")}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.2s",
                    background: activeTab === "upload" ? "rgba(255,255,255,0.08)" : "transparent",
                    color: activeTab === "upload" ? "#e4e4e7" : "#52525b",
                  }}>📤 Subir libros</button>
                {showCatedras && (
                  <button onClick={() => setActiveTab("assign")}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                      border: "none", cursor: "pointer", transition: "all 0.2s",
                      background: activeTab === "assign" ? "rgba(255,255,255,0.08)" : "transparent",
                      color: activeTab === "assign" ? "#e4e4e7" : "#52525b",
                    }}>📋 Asignar a cátedras</button>
                )}
              </div>

              {/* TAB: Subir libros */}
              {activeTab === "upload" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Libros cargados */}
                  {loadedBooks.length > 0 && (
                    <div>
                      <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "8px", fontWeight: 500 }}>Libros cargados para {CURRICULUM[selectedYear].materias[selectedMateria].name}</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {loadedBooks.map((libro) => (
                          <div key={libro.name} style={{
                            padding: "10px 14px", borderRadius: "10px",
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            display: "flex", alignItems: "center", gap: "10px",
                          }}>
                            <span>📖</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", color: "#e4e4e7", fontWeight: 500 }}>{libro.name}</div>
                              <div style={{ fontSize: "11px", color: "#52525b" }}>{libro.fragments} frag. · {libro.pages} págs</div>
                            </div>
                            <button onClick={() => handleDeleteBook(libro.name)}
                              style={{
                                padding: "4px 10px", borderRadius: "6px", fontSize: "11px",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                                color: "#f87171", cursor: "pointer",
                              }}>Borrar</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nuevo libro */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "8px", fontWeight: 500 }}>Subir nuevo libro</label>
                    <input type="text" value={customLibro}
                      onChange={(e) => setCustomLibro(e.target.value)}
                      placeholder="Nombre del libro (ej: Latarjet & Ruiz Liard)"
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                        background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#e4e4e7", outline: "none", fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </div>

                  {customLibro.trim() && (
                    <div>
                      <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "8px", fontWeight: 500 }}>Offset de páginas</label>
                      <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", marginBottom: "10px" }}>
                        <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", margin: 0 }}>
                          <strong style={{ color: "#e4e4e7" }}>Pág. libro - Pág. PDF = offset</strong>. Si coinciden, dejá 0.
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="number" value={pageOffset} onChange={(e) => setPageOffset(parseInt(e.target.value) || 0)}
                          style={{
                            width: "100px", padding: "10px", borderRadius: "10px", fontSize: "16px",
                            background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e4e4e7", outline: "none", textAlign: "center", fontFamily: "'JetBrains Mono', monospace",
                          }} />
                        <span style={{ fontSize: "12px", color: "#52525b" }}>Pág. libro = Pág. PDF + ({pageOffset})</span>
                      </div>
                    </div>
                  )}

                  {customLibro.trim() && (
                    <div>
                      <div onClick={() => !uploading && fileInputRef.current?.click()}
                        style={{
                          padding: "28px", borderRadius: "12px", textAlign: "center",
                          border: "2px dashed rgba(255,255,255,0.08)", cursor: uploading ? "wait" : "pointer",
                          background: file ? "rgba(255,255,255,0.02)" : "transparent",
                        }}
                        onMouseOver={(e) => { if (!uploading) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      >
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md"
                          onChange={(e) => setFile(e.target.files[0])} style={{ display: "none" }} disabled={uploading} />
                        {file ? (
                          <div>
                            <div style={{ fontSize: "20px", marginBottom: "6px" }}>✅</div>
                            <div style={{ fontSize: "13px", color: "#e4e4e7", fontWeight: 500 }}>{file.name}</div>
                            <div style={{ fontSize: "11px", color: "#52525b", marginTop: "2px" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: "20px", marginBottom: "6px" }}>📄</div>
                            <div style={{ fontSize: "13px", color: "#71717a" }}>Click para seleccionar</div>
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

                  {file && customLibro.trim() && !uploading && (
                    <button onClick={handleUpload}
                      style={{
                        width: "100%", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
                        border: "none", cursor: "pointer", color: "white", background: colors.gradient,
                      }}>Subir y procesar</button>
                  )}
                </div>
              )}

              {/* TAB: Asignar a cátedras */}
              {activeTab === "assign" && showCatedras && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {loadedBooks.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#52525b", fontSize: "14px" }}>
                      No hay libros cargados todavía. Subí al menos uno en la pestaña "Subir libros".
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: "13px", color: "#71717a", lineHeight: "1.5" }}>
                        Marcá qué libros usa cada cátedra. Un mismo libro puede estar en varias cátedras.
                      </p>

                      {catedras.map((cat) => (
                        <div key={cat.num} style={{
                          padding: "16px", borderRadius: "12px",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#e4e4e7", marginBottom: "12px" }}>
                            {cat.name}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {loadedBooks.map((libro) => {
                              const isAssigned = (assignments[cat.num] || []).includes(libro.name);
                              return (
                                <button key={libro.name}
                                  onClick={() => toggleAssignment(cat.num, libro.name)}
                                  style={{
                                    padding: "10px 12px", borderRadius: "8px",
                                    display: "flex", alignItems: "center", gap: "10px",
                                    background: isAssigned ? "rgba(16,185,129,0.06)" : "transparent",
                                    border: `1px solid ${isAssigned ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                                    cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                                  }}
                                >
                                  <div style={{
                                    width: "18px", height: "18px", borderRadius: "4px",
                                    border: `2px solid ${isAssigned ? "#10b981" : "rgba(255,255,255,0.15)"}`,
                                    background: isAssigned ? "#10b981" : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "11px", color: "white", flexShrink: 0,
                                    transition: "all 0.2s",
                                  }}>
                                    {isAssigned && "✓"}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", color: isAssigned ? "#e4e4e7" : "#71717a", fontWeight: 500 }}>{libro.name}</div>
                                    <div style={{ fontSize: "11px", color: "#3f3f46" }}>{libro.pages} páginas</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <button onClick={saveAssignments} disabled={savingAssignments}
                        style={{
                          width: "100%", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
                          border: "none", cursor: savingAssignments ? "wait" : "pointer", color: "white",
                          background: colors.gradient, opacity: savingAssignments ? 0.7 : 1,
                        }}>
                        {savingAssignments ? "Guardando..." : "Guardar asignaciones"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
            <div style={{
              padding: "14px 16px", borderRadius: "10px", fontSize: "14px",
              background: message.type === "success" ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
              color: message.type === "success" ? "#34d399" : "#f87171",
            }}>{message.type === "success" ? "✅" : "❌"} {message.text}</div>
          )}
        </div>
      </main>
    </div>
  );
}