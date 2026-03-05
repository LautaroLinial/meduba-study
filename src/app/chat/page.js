"use client";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CURRICULUM, getMateria } from "@/lib/curriculum";

const yearColors = {
  "1": { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(59,130,246,0.15)", accent: "#3b82f6" },
  "2": { gradient: "linear-gradient(135deg, #10b981, #06b6d4)", glow: "rgba(16,185,129,0.15)", accent: "#10b981" },
  "3": { gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", glow: "rgba(245,158,11,0.15)", accent: "#f59e0b" },
};

const FUN_FACTS = [
  "🧠 El cerebro humano consume el 20% de la energía total del cuerpo, aunque solo representa el 2% del peso corporal.",
  "❤️ El corazón late aproximadamente 100.000 veces por día, bombeando unos 7.500 litros de sangre.",
  "🦴 Los bebés nacen con alrededor de 300 huesos. Muchos se fusionan durante el crecimiento hasta llegar a 206 en el adulto.",
  "👃 La nariz humana puede detectar más de 1 billón de olores distintos.",
  "🔬 Si pudieras estirar todo el ADN de una sola célula, mediría aproximadamente 2 metros.",
  "💉 Los glóbulos rojos tardan solo 20 segundos en completar un circuito por todo el cuerpo.",
  "🫁 Los pulmones tienen una superficie interna de aproximadamente 70 m², equivalente a una cancha de tenis.",
  "🧬 El cuerpo humano produce alrededor de 3,8 millones de células por segundo.",
  "👁️ El ojo humano puede distinguir aproximadamente 10 millones de colores distintos.",
  "🦠 En el cuerpo humano hay más bacterias que células propias: se estiman unos 38 billones de microorganismos.",
  "💓 La aorta, la arteria más grande del cuerpo, tiene un diámetro similar al de una manguera de jardín.",
  "🧠 Las neuronas transmiten señales a velocidades de hasta 430 km/h.",
  "🫀 El corazón de una mujer late en promedio más rápido que el de un hombre.",
  "🦴 El fémur es el hueso más largo y fuerte del cuerpo humano. Puede soportar hasta 30 veces el peso corporal.",
  "💊 La aspirina fue derivada de la corteza del sauce, usada como remedio desde la antigüedad por los egipcios.",
  "🔬 Un solo mililitro de sangre contiene aproximadamente 5 millones de glóbulos rojos.",
  "🧬 Si pudieras unir todo el ADN de tu cuerpo, la cadena llegaría al sol y volvería unas 600 veces.",
  "👁️ Los músculos que controlan los ojos son los más activos del cuerpo: se mueven más de 100.000 veces por día.",
  "🫁 Un adulto inhala y exhala entre 15.000 y 20.000 litros de aire por día.",
  "🧠 El cerebro está compuesto por aproximadamente un 75% de agua.",
  "🦴 El hueso hioides, ubicado en el cuello, es el único hueso del cuerpo que no se articula con ningún otro.",
  "❤️ El corazón comienza a latir a las 4 semanas de gestación y no para hasta la muerte.",
  "🔬 Los capilares son tan finos que los glóbulos rojos deben pasar de a uno, deformándose para poder circular.",
  "💉 El cuerpo humano tiene aproximadamente 96.000 km de vasos sanguíneos.",
  "🧬 Cada célula del cuerpo contiene una copia completa del genoma humano: unos 20.000 genes.",
  "🫀 El miocardio es el único músculo del cuerpo que nunca se fatiga en condiciones normales.",
  "👃 El nervio olfatorio (I par craneal) es el único nervio craneal que se regenera constantemente.",
  "🧠 El hipotálamo, del tamaño de una almendra, regula la temperatura, el hambre, la sed y el sueño.",
  "🦠 La flora intestinal pesa entre 1 y 2 kg y es esencial para la digestión y la inmunidad.",
  "💊 La penicilina fue descubierta por Alexander Fleming en 1928 de forma accidental, a partir de un hongo.",
];

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const year = searchParams.get("year");
  const materiaKey = searchParams.get("materia");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [funFact, setFunFact] = useState("");
  const [pageModal, setPageModal] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const yearData = CURRICULUM[year];
  const materia = getMateria(year, materiaKey);
  const colors = yearColors[year] || yearColors["1"];

  useEffect(() => {
    if (materia) {
      setMessages([{
        role: "assistant",
        content: `¡Hola! 👋 Soy tu tutor de **${materia.name}** para ${yearData.name}.\n\n${materia.libros.length > 0 ? `Tengo cargada la bibliografía de: ${materia.libros.map((l) => l.split(" - ")[0]).join(", ")}.` : "Todavía no hay bibliografía cargada para esta materia."}\n\n¿Sobre qué tema querés estudiar?`,
        usedFragments: [],
      }]);
    }
  }, [year, materiaKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
      interval = setInterval(() => {
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const openPage = useCallback((libro, page, fragmentText) => {
    const libroCompleto = materia.libros.find(l =>
      l.toLowerCase().includes(libro.toLowerCase().split("&")[0].trim().split(" ")[0])
    ) || libro;
    const params = new URLSearchParams({
      year, materia: materiaKey, libro: libroCompleto, page: page.toString(), mode: "pdf",
    });
    setPageModal({ libro: libroCompleto, page, pdfUrl: `/api/page?${params}`, fragmentText: fragmentText || "" });
  }, [year, materiaKey, materia]);

  if (!year || !materiaKey || !materia) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#71717a", marginBottom: "16px" }}>No se seleccionó año o materia</p>
          <button onClick={() => router.push("/")}
            style={{ padding: "10px 20px", background: colors.gradient, borderRadius: "10px", border: "none", color: "white", cursor: "pointer", fontWeight: 600 }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, usedFragments: [] }]);
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage, year: parseInt(year), materia: materiaKey,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!response.ok) throw new Error("Error");
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, usedFragments: data.usedFragments || [] }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Hubo un error. Intentá de nuevo.", usedFragments: [] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  function getFragmentForPage(messageIndex, page) {
    const msg = messages[messageIndex];
    if (!msg || !msg.usedFragments) return "";
    const frag = msg.usedFragments.find(f => f.page === page);
    return frag ? frag.text : "";
  }

  function getRelevantSentences(fragmentText, maxSentences = 8) {
    if (!fragmentText) return [];
    return fragmentText.replace(/\n+/g, " ").replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 30).slice(0, maxSentences);
  }

  function formatMessageWithCitations(text, messageIndex) {
    let html = text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#fafafa'>$1</strong>").replace(/\n/g, "<br/>");
    const citationRegex = /[\(\[]((?:Latarjet|Rouvière|Testut|Netter|Prometheus|Ross|Junqueira|Geneser|Langman|Moore|Guyton|Ganong|Cingolani|Murray|Jawetz|Robbins|Goodman|Katzung|Argente|Harper|Lehninger|Stryer|Blanco|Cicardo|Frumento|Parisi|Boron|Basualdo|Rubin|Kumar|Velázquez|Florez|Cossio|Surós)[^,\)\]]*),\s*pág[s]?\.?\s*(\d+(?:\s*[-–]\s*\d+)?)[\)\]]/gi;
    html = html.replace(citationRegex, (match, libroRaw, pageNum) => {
      const libro = libroRaw.trim();
      const page = pageNum.trim().split(/[-–]/)[0].trim();
      return `<button class="citation-btn" data-libro="${libro}" data-page="${page}" data-msgindex="${messageIndex}" style="display:inline;background:rgba(255,255,255,0.06);color:${colors.accent};padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;font-size:12px;font-family:inherit;transition:all 0.2s;margin:2px 0;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='rgba(255,255,255,0.15)'"
        onmouseout="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,255,255,0.08)'"
      >📖 ${libro}, pág. ${pageNum}</button>`;
    });
    return html;
  }

  const handleMessageClick = (e) => {
    const btn = e.target.closest(".citation-btn");
    if (btn) {
      const libro = btn.getAttribute("data-libro");
      const page = btn.getAttribute("data-page");
      const msgIndex = parseInt(btn.getAttribute("data-msgindex"));
      const fragmentText = getFragmentForPage(msgIndex, parseInt(page));
      if (libro && page) openPage(libro, parseInt(page), fragmentText);
    }
  };

  return (
    <div style={{ height: "100vh", background: "#0a0a0c", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "0 20px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/")}
            style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: "13px", padding: "6px 10px", borderRadius: "6px", transition: "all 0.2s" }}
            onMouseOver={(e) => { e.target.style.color = "#e4e4e7"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseOut={(e) => { e.target.style.color = "#52525b"; e.target.style.background = "none"; }}
          >← Inicio</button>
          <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "7px", background: colors.gradient,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white",
            }}>{year}°</div>
            <span style={{ fontSize: "14px", color: "#a1a1aa", fontWeight: 500 }}>
              {materia.icon} {materia.name}
            </span>
          </div>
        </div>
        {materia.libros.length > 0 && (
          <div style={{ fontSize: "11px", color: "#3f3f46" }}>
            {materia.libros.map(l => l.split(" - ")[0]).join(" · ")}
          </div>
        )}
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "16px",
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px", background: colors.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0, marginRight: "10px", marginTop: "2px",
                }}>M</div>
              )}
              <div
                onClick={msg.role === "assistant" ? handleMessageClick : undefined}
                style={{
                  maxWidth: "85%", padding: msg.role === "user" ? "10px 16px" : "0",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "0",
                  background: msg.role === "user" ? "rgba(255,255,255,0.08)" : "transparent",
                  border: msg.role === "user" ? "1px solid rgba(255,255,255,0.06)" : "none",
                  color: msg.role === "user" ? "#e4e4e7" : "#a1a1aa",
                  fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap",
                }}
              >
                <div dangerouslySetInnerHTML={{
                  __html: msg.role === "assistant" ? formatMessageWithCitations(msg.content, i) : formatMessage(msg.content),
                }} />
              </div>
            </div>
          ))}

          {/* Loading with fun fact */}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px", background: colors.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0, marginRight: "10px", marginTop: "2px",
              }}>M</div>
              <div style={{ maxWidth: "480px" }}>
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                  <div className="dot-bounce-1" style={{ background: colors.accent }} />
                  <div className="dot-bounce-2" style={{ background: colors.accent }} />
                  <div className="dot-bounce-3" style={{ background: colors.accent }} />
                </div>
                <div style={{
                  padding: "14px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: "8px" }}>
                    ¿Sabías que?
                  </div>
                  <div style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.6" }}>
                    {funFact}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px 20px 20px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: "10px",
            background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px", padding: "6px 6px 6px 18px",
            transition: "border-color 0.2s",
          }}
            onFocus={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Preguntá sobre ${materia.name}...`}
              rows={1}
              style={{
                flex: 1, background: "transparent", color: "#e4e4e7", fontSize: "14px",
                resize: "none", outline: "none", padding: "8px 0", maxHeight: "120px",
                border: "none", caretColor: "#e4e4e7", fontFamily: "'DM Sans', sans-serif", lineHeight: "1.5",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", flexShrink: 0, border: "none", cursor: input.trim() && !isLoading ? "pointer" : "default",
                background: input.trim() && !isLoading ? colors.gradient : "rgba(255,255,255,0.04)",
                color: input.trim() && !isLoading ? "white" : "#3f3f46",
                transition: "all 0.2s",
              }}
            >↑</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#3f3f46", marginTop: "10px" }}>
            Hacé click en las citas 📖 para ver la página original del libro
          </p>
        </div>
      </div>

      {/* Modal PDF + panel lateral */}
      {pageModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={() => setPageModal(null)}
        >
          <div
            style={{ backgroundColor: "#111113", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", maxWidth: "1200px", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: colors.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "white" }}>📖</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#e4e4e7" }}>{pageModal.libro.split(" - ")[0]}</div>
                  <div style={{ fontSize: "12px", color: colors.accent }}>Página {pageModal.page}</div>
                </div>
              </div>
              <button onClick={() => setPageModal(null)}
                style={{ color: "#52525b", fontSize: "18px", background: "rgba(255,255,255,0.04)", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: "8px", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.target.style.color = "#e4e4e7"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseOut={(e) => { e.target.style.color = "#52525b"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
              >✕</button>
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <iframe src={pageModal.pdfUrl} style={{ width: "100%", height: "100%", border: "none", minHeight: "70vh" }}
                  title={`${pageModal.libro} - Página ${pageModal.page}`} />
              </div>

              {pageModal.fragmentText && (
                <div style={{ width: "300px", borderLeft: "1px solid rgba(255,255,255,0.06)", overflow: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <div style={{ width: "10px", height: "10px", backgroundColor: "rgba(250,204,21,0.5)", borderRadius: "3px" }} />
                      <span style={{ color: "#facc15", fontSize: "12px", fontWeight: 600 }}>Información utilizada</span>
                    </div>
                    <p style={{ color: "#52525b", fontSize: "11px", lineHeight: "1.4", margin: 0 }}>
                      Texto que el tutor usó de esta página
                    </p>
                  </div>

                  <div style={{ padding: "10px 12px", overflow: "auto", flex: 1 }}>
                    {getRelevantSentences(pageModal.fragmentText).map((sentence, idx) => (
                      <div key={idx} style={{
                        padding: "10px 12px", marginBottom: "6px",
                        backgroundColor: "rgba(250,204,21,0.05)",
                        borderLeft: "2px solid rgba(250,204,21,0.4)",
                        borderRadius: "0 8px 8px 0",
                        color: "#d4d4d8", fontSize: "12px", lineHeight: "1.6",
                        userSelect: "text", cursor: "text",
                      }}>
                        {sentence}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                    <button onClick={() => {
                      navigator.clipboard.writeText(getRelevantSentences(pageModal.fragmentText).join("\n\n"));
                    }}
                      style={{
                        width: "100%", padding: "8px", borderRadius: "8px", fontSize: "12px",
                        cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.03)", color: "#a1a1aa", transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.color = "#e4e4e7"; }}
                      onMouseOut={(e) => { e.target.style.background = "rgba(255,255,255,0.03)"; e.target.style.color = "#a1a1aa"; }}
                    >📋 Copiar texto</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "10px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", color: "#3f3f46", flexShrink: 0 }}>
              {pageModal.libro} — Página {pageModal.page} · Podés seleccionar y copiar texto del PDF
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#71717a" }}>Cargando...</div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

function formatMessage(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#fafafa'>$1</strong>").replace(/\n/g, "<br/>");
}