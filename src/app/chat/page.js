"use client";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CURRICULUM, getMateria } from "@/lib/curriculum";
import PdfPageViewer from "@/components/PdfPageViewer";

const yearColors = {
  "1": { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(59,130,246,0.15)", accent: "#3b82f6" },
  "2": { gradient: "linear-gradient(135deg, #10b981, #06b6d4)", glow: "rgba(16,185,129,0.15)", accent: "#10b981" },
  "3": { gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", glow: "rgba(245,158,11,0.15)", accent: "#f59e0b" },
};

const FUN_FACTS = [
  "🧠 El cerebro humano consume el 20% de la energía total del cuerpo, aunque solo representa el 2% del peso corporal.",
  "❤️ El corazón late aproximadamente 100.000 veces por día, bombeando unos 7.500 litros de sangre.",
  "🦴 Los bebés nacen con alrededor de 300 huesos. Muchos se fusionan hasta llegar a 206 en el adulto.",
  "👃 La nariz humana puede detectar más de 1 billón de olores distintos.",
  "🔬 Si pudieras estirar todo el ADN de una sola célula, mediría aproximadamente 2 metros.",
  "💉 Los glóbulos rojos tardan solo 20 segundos en completar un circuito por todo el cuerpo.",
  "🫁 Los pulmones tienen una superficie interna de ~70 m², equivalente a una cancha de tenis.",
  "🧬 El cuerpo humano produce alrededor de 3,8 millones de células por segundo.",
  "👁️ El ojo humano puede distinguir aproximadamente 10 millones de colores distintos.",
  "🦠 En el cuerpo humano hay más bacterias que células propias: ~38 billones de microorganismos.",
  "💓 La aorta tiene un diámetro similar al de una manguera de jardín.",
  "🧠 Las neuronas transmiten señales a velocidades de hasta 430 km/h.",
  "🦴 El fémur puede soportar hasta 30 veces el peso corporal.",
  "💊 La aspirina fue derivada de la corteza del sauce, usada desde la antigüedad.",
  "🔬 Un solo mililitro de sangre contiene ~5 millones de glóbulos rojos.",
  "🧬 Si unieras todo el ADN de tu cuerpo, llegaría al sol y volvería ~600 veces.",
  "🫁 Un adulto inhala y exhala entre 15.000 y 20.000 litros de aire por día.",
  "🧠 El cerebro está compuesto por aproximadamente un 75% de agua.",
  "🦴 El hueso hioides es el único que no se articula con ningún otro.",
  "💉 El cuerpo tiene aproximadamente 96.000 km de vasos sanguíneos.",
  "🫀 El miocardio es el único músculo que nunca se fatiga en condiciones normales.",
  "👃 El nervio olfatorio es el único par craneal que se regenera constantemente.",
  "🦠 La flora intestinal pesa entre 1 y 2 kg.",
  "💊 La penicilina fue descubierta por Fleming en 1928 de forma accidental.",
];

function RotatingFunFact({ index }) {
  const [fact, setFact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setFact(prevFact => {
          let newFact;
          do {
            newFact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
          } while (newFact === prevFact);
          return newFact;
        });
        setOpacity(1); 
      }, 400); 
    }, 12000 + (index * 1000));
    return () => clearInterval(interval);
  }, [index]);

  return (
    <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: "8px" }}>💡 ¿Sabías que?</div>
      <div style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.6", opacity: opacity, transition: "opacity 0.4s ease-in-out", minHeight: "42px" }}>{fact}</div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const year = searchParams.get("year");
  const materiaKey = searchParams.get("materia");
  const catedraNum = searchParams.get("catedra") || "1";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageModal, setPageModal] = useState(null);
  const [loadedLibros, setLoadedLibros] = useState([]);
  const [activeLibros, setActiveLibros] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const latestQuestionRef = useRef(null);

  const yearData = CURRICULUM[year];
  const materia = getMateria(year, materiaKey);
  const catedraData = materia?.catedras?.[catedraNum];
  const catedraName = catedraData?.name || "";
  const colors = yearColors[year] || yearColors["1"];

  useEffect(() => {
    if (year && materiaKey) {
      fetch(`/api/material-info?year=${year}&materia=${materiaKey}&catedra=${catedraNum}`)
        .then(r => r.json())
        .then(data => {
          if (data.libros) {
            setLoadedLibros(data.libros);
            setActiveLibros(data.libros.map(l => l.name));
          }
        })
        .catch(() => {});
    }
  }, [year, materiaKey, catedraNum]);

  useEffect(() => {
    if (materia) {
      setMessages([{
        role: "assistant",
        content: `¡Hola! 👋 Soy tu tutor de **${materia.name}**${catedraName && catedraName !== "Cátedra Única" ? ` (${catedraName})` : ""} para ${yearData.name}.\n\n¿Sobre qué tema querés estudiar?`,
        usedFragments: [],
      }]);
    }
  }, [year, materiaKey, catedraNum]);

  useEffect(() => {
    if (latestQuestionRef.current) {
      latestQuestionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const toggleLibro = (libroName) => {
    setActiveLibros(prev => {
      if (prev.includes(libroName)) {
        if (prev.length === 1) return prev;
        return prev.filter(l => l !== libroName);
      }
      return [...prev, libroName];
    });
  };

  const openPage = useCallback(async (libro, page, fragmentText) => {
    const libroCompleto = loadedLibros.map(l => l.name).find(l =>
      l.toLowerCase().includes(libro.toLowerCase().split("&")[0].trim().split(" ")[0])
    ) || libro;

    // Mostrar modal de carga inmediatamente
    setPageModal({ libro: libroCompleto, page, imageUrl: null, fragmentText: fragmentText || "" });

    try {
      const params = new URLSearchParams({ year, materia: materiaKey, libro: libroCompleto, page: page.toString() });
      const res = await fetch(`/api/render-page?${params}`);
      const data = await res.json();
      setPageModal({ libro: libroCompleto, page, imageUrl: data.imageUrl || "error", fragmentText: fragmentText || "" });
    } catch {
      setPageModal({ libro: libroCompleto, page, imageUrl: "error", fragmentText: fragmentText || "" });
    }
  }, [year, materiaKey, loadedLibros]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, usedFragments: [] },
      { role: "assistant", content: "", usedFragments: [] }
    ]);

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          year: parseInt(year),
          materia: materiaKey,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          activeLibros: activeLibros,
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let aiText = "";
      let metadataParsed = false;
      let currentFragments = [];

      setIsLoading(false);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          if (!metadataParsed && chunk.includes('---\n\n')) {
            const parts = chunk.split('---\n\n');
            try {
              const meta = JSON.parse(parts[0]);
              if (meta.type === 'metadata') currentFragments = meta.usedFragments;
            } catch(e) {}
            aiText += parts[1] || "";
            metadataParsed = true;
          } else {
            aiText += chunk;
          }

          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: "assistant", content: aiText, usedFragments: currentFragments
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant", content: "⚠️ Hubo un error al conectar con el servidor. Intentá de nuevo.", usedFragments: []
        };
        return newMessages;
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  function getRelevantSentences(fragmentText, maxSentences = 10) {
    if (!fragmentText) return [];
    return fragmentText.replace(/\n+/g, " ").replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 25).slice(0, maxSentences);
  }

  function formatMessageWithCitations(text, messageIndex) {
    let html = text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#fafafa'>$1</strong>").replace(/\n/g, "<br/>");
    const citationRegex = /[\(\[]((?:Latarjet|Rouvière|Testut|Netter|Prometheus|Ross|Junqueira|Geneser|Langman|Moore|Guyton|Ganong|Cingolani|Murray|Jawetz|Robbins|Goodman|Katzung|Argente|Harper|Lehninger|Stryer|Blanco|Cicardo|Frumento|Parisi|Boron|Basualdo|Rubin|Kumar|Velázquez|Florez|Cossio|Surós)[^,\)\]]*),\s*pág[s]?\.?\s*(\d+(?:\s*[-–]\s*\d+)?)[\)\]]/gi;
    html = html.replace(citationRegex, (match, libroRaw, pageNum) => {
      const libro = libroRaw.trim();
      const page = pageNum.trim().split(/[-–]/)[0].trim();
      return `<button class="citation-btn" data-libro="${libro}" data-page="${page}" data-msgindex="${messageIndex}" style="display:inline;background:rgba(255,255,255,0.06);color:${colors.accent};padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;font-size:12px;font-family:inherit;transition:all 0.2s;margin:2px 0;">📖 ${libro}, pág. ${pageNum}</button>`;
    });
    return html;
  }

  const handleMessageClick = (e) => {
    const btn = e.target.closest(".citation-btn");
    if (btn) {
      const libro = btn.getAttribute("data-libro");
      const page = btn.getAttribute("data-page");
      const msgIndex = parseInt(btn.getAttribute("data-msgindex"));
      const msg = messages[msgIndex];
      const fragmentText = msg?.usedFragments?.find(f => f.page === parseInt(page))?.text || "";
      if (libro && page) openPage(libro, parseInt(page), fragmentText);
    }
  };

  const lastUserIndex = messages.map(m => m.role).lastIndexOf("user");

  return (
    <div style={{ height: "100vh", background: "#0a0a0c", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "0 20px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: "13px", padding: "6px 10px", borderRadius: "6px" }}>← Inicio</button>
          <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>{year}°</div>
            <span style={{ fontSize: "14px", color: "#a1a1aa", fontWeight: 500 }}>{materia.icon} {materia.name}</span>
          </div>
        </div>
      </header>

      {/* Book chips */}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
        {loadedLibros.map((libro) => (
          <button key={libro.name} onClick={() => toggleLibro(libro.name)} style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "11px", border: "1px solid", cursor: "pointer", background: activeLibros.includes(libro.name) ? "rgba(255,255,255,0.06)" : "transparent", color: activeLibros.includes(libro.name) ? "#a1a1aa" : "#3f3f46" }}>
            {libro.name.split(" - ")[0]}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px" }}>
          {messages.map((msg, i) => (
            <div key={i} ref={i === lastUserIndex ? latestQuestionRef : null} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "16px", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", maxWidth: "100%" }}>
                {msg.role === "assistant" && <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "white", flexShrink: 0, marginRight: "10px" }}>M</div>}
                <div onClick={msg.role === "assistant" ? handleMessageClick : undefined} style={{ maxWidth: "85%", background: msg.role === "user" ? "rgba(255,255,255,0.08)" : "transparent", padding: msg.role === "user" ? "10px 16px" : "0", borderRadius: "16px", color: "#a1a1aa", fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                  <div dangerouslySetInnerHTML={{ __html: msg.role === "assistant" ? formatMessageWithCitations(msg.content, i) : formatMessage(msg.content) }} />
                </div>
              </div>
              {msg.role === "assistant" && <div style={{ marginTop: "20px", marginLeft: "38px", maxWidth: "480px", width: "100%" }}><RotatingFunFact index={i} /></div>}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px 20px 20px", flexShrink: 0 }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", background: "#18181b", borderRadius: "14px", padding: "6px 18px", display: "flex", alignItems: "center" }}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Haz una pregunta..." style={{ flex: 1, background: "transparent", color: "#e4e4e7", border: "none", outline: "none", resize: "none" }} rows={1} />
          <button onClick={sendMessage} style={{ background: colors.gradient, color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}>↑</button>
        </div>
      </div>

      {/* 🟢 MODAL PDF CON RECORTE DE PÁGINA ÚNICA Y PANEL LATERAL */}
      {pageModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setPageModal(null)}>
          <div style={{ background: "#111113", borderRadius: "16px", width: "100%", maxWidth: "1400px", height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#161618" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                 <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>📖</div>
                 <div>
                    <div style={{ color: "white", fontSize: "15px", fontWeight: "600" }}>{pageModal.libro}</div>
                    <div style={{ color: colors.accent, fontSize: "12px" }}>Página {pageModal.page}</div>
                 </div>
              </div>
              <button onClick={() => setPageModal(null)} style={{ color: "#a1a1aa", background: "rgba(255,255,255,0.05)", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Visor PDF — imagen renderizada en el servidor por mupdf */}
              <div style={{ flex: 1, background: "#111", position: "relative", overflow: "hidden" }}>
                <PdfPageViewer
                  key={`${pageModal.libro}-${pageModal.page}`}
                  imageUrl={pageModal.imageUrl}
                  accentColor={colors.accent}
                />
              </div>

              {/* Panel Lateral de Texto Extraído (Lado Derecho) */}
              <div style={{ width: "340px", background: "#161618", borderLeft: "1px solid #27272a", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px", borderBottom: "1px solid #27272a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px" }}>🔍</span>
                    <span style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>TEXTO DE ESTA PÁGINA</span>
                  </div>
                  <p style={{ color: "#52525b", fontSize: "11px" }}>Fragmento clave analizado por el tutor:</p>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {pageModal.fragmentText ? (
                    getRelevantSentences(pageModal.fragmentText).map((sentence, idx) => (
                      <div key={idx} style={{ 
                        padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", 
                        borderLeft: `3px solid ${colors.accent}`, marginBottom: "12px",
                        color: "#d4d4d8", fontSize: "12.5px", lineHeight: "1.6"
                      }}>
                        {sentence}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#3f3f46", fontSize: "12px", textAlign: "center", marginTop: "40px" }}>No hay fragmentos disponibles.</div>
                  )}
                </div>

                <div style={{ padding: "16px", borderTop: "1px solid #27272a" }}>
                  <button onClick={() => {
                      navigator.clipboard.writeText(pageModal.fragmentText)
                        .then(() => alert("Texto copiado al portapapeles"))
                        .catch(() => {
                          const ta = document.createElement("textarea");
                          ta.value = pageModal.fragmentText;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                          alert("Texto copiado al portapapeles");
                        });
                  }} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7", cursor: "pointer", fontSize: "12px" }}>
                    📋 Copiar fragmento completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return <Suspense fallback={<div>Cargando...</div>}><ChatContent /></Suspense>;
}

function formatMessage(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}