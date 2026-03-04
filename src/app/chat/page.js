"use client";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CURRICULUM, getMateria } from "@/lib/curriculum";

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const year = searchParams.get("year");
  const materiaKey = searchParams.get("materia");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageModal, setPageModal] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const yearData = CURRICULUM[year];
  const materia = getMateria(year, materiaKey);

  useEffect(() => {
    if (materia) {
      setMessages([{
        role: "assistant",
        content: `¡Hola! 👋 Soy tu tutor de **${materia.name}** para ${yearData.name}.\n\nTengo cargada la bibliografía de: ${materia.libros.map((l) => l.split(" - ")[0]).join(", ")}.\n\nPodés preguntarme sobre cualquier tema, por ejemplo:\n• "${materia.temas[0]}"\n• "${materia.temas[1]}"\n• "${materia.temas[2]}"\n\n¿Sobre qué tema querés estudiar hoy?`,
        usedFragments: [],
      }]);
    }
  }, [year, materiaKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openPage = useCallback((libro, page, fragmentText) => {
    const libroCompleto = materia.libros.find(l =>
      l.toLowerCase().includes(libro.toLowerCase().split("&")[0].trim().split(" ")[0])
    ) || libro;

    const params = new URLSearchParams({
      year, materia: materiaKey, libro: libroCompleto, page: page.toString(), mode: "pdf",
    });

    setPageModal({
      libro: libroCompleto,
      page,
      pdfUrl: `/api/page?${params}`,
      fragmentText: fragmentText || "",
    });
  }, [year, materiaKey, materia]);

  if (!year || !materiaKey || !materia) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No se seleccionó año o materia</p>
          <button onClick={() => router.push("/")} className="px-6 py-3 bg-sky-500 rounded-lg text-white hover:bg-sky-600 transition-colors">Volver al inicio</button>
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
      if (!response.ok) throw new Error("Error en la respuesta");
      const data = await response.json();
      setMessages((prev) => [...prev, {
        role: "assistant", content: data.response, usedFragments: data.usedFragments || [],
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "assistant", content: "⚠️ Hubo un error. Intentá de nuevo.", usedFragments: [],
      }]);
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

  function formatMessageWithCitations(text, messageIndex) {
    let html = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

    const citationRegex = /[\(\[]((?:Latarjet|Rouvière|Testut|Netter|Prometheus|Ross|Junqueira|Geneser|Langman|Moore|Guyton|Ganong|Cingolani|Murray|Jawetz|Robbins|Goodman|Katzung|Argente|Harper|Lehninger|Stryer|Blanco|Cicardo|Frumento|Parisi|Boron|Basualdo|Rubin|Kumar|Velázquez|Florez|Cossio|Surós)[^,\)\]]*),\s*pág[s]?\.?\s*(\d+(?:\s*[-–]\s*\d+)?)[\)\]]/gi;

    html = html.replace(citationRegex, (match, libroRaw, pageNum) => {
      const libro = libroRaw.trim();
      const page = pageNum.trim().split(/[-–]/)[0].trim();
      return `<button class="citation-btn" data-libro="${libro}" data-page="${page}" data-msgindex="${messageIndex}" style="display:inline;background:rgba(14,165,233,0.15);color:#7dd3fc;padding:2px 8px;border-radius:6px;border:1px solid rgba(14,165,233,0.3);cursor:pointer;font-size:inherit;font-family:inherit;transition:all 0.2s;"
        onmouseover="this.style.background='rgba(14,165,233,0.3)'"
        onmouseout="this.style.background='rgba(14,165,233,0.15)'"
      >📖 ${libro}, pág. ${pageNum} — click para ver</button>`;
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

  // Extraer las oraciones más relevantes del fragmento
  function getRelevantSentences(fragmentText, maxSentences = 8) {
    if (!fragmentText) return [];
    const sentences = fragmentText
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 30);
    return sentences.slice(0, maxSentences);
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800/50 px-4 h-14 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white transition-colors text-sm">← Cambiar materia</button>
          <div className="h-5 w-px bg-slate-800" />
          <span className="text-sm text-slate-300">{materia.icon} {materia.name} — {yearData.name}</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
          {sidebarOpen ? "✕" : "☰"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div onClick={msg.role === "assistant" ? handleMessageClick : undefined}
                  className={`max-w-[75%] px-4 py-3 whitespace-pre-wrap text-[15px] leading-relaxed
                    ${msg.role === "user"
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl rounded-br-sm text-white"
                      : "bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm text-slate-200"}`}
                >
                  {msg.role === "assistant" && <div className="text-[11px] text-sky-400 font-semibold tracking-wider mb-1.5">TUTOR MEDUBA</div>}
                  <div dangerouslySetInnerHTML={{ __html: msg.role === "assistant" ? formatMessageWithCitations(msg.content, i) : formatMessage(msg.content) }} />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="text-[11px] text-sky-400 font-semibold tracking-wider mb-1.5">TUTOR MEDUBA</div>
                  <div className="flex gap-1.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-800/50 p-4 bg-slate-950/50 shrink-0">
            <div className="flex gap-2 items-end bg-slate-900 border border-slate-700 rounded-2xl p-1.5 pl-4">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={`Preguntá sobre ${materia.name}...`} rows={1}
                style={{ flex:1, background:"transparent", color:"#ffffff", fontSize:"14px", resize:"none", outline:"none", padding:"8px 0", maxHeight:"128px", border:"none", caretColor:"#ffffff", fontFamily:"inherit", lineHeight:"1.5" }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || isLoading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${input.trim() && !isLoading ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white cursor-pointer" : "bg-white/5 text-slate-600 cursor-default"}`}
              >↑</button>
            </div>
            <p className="text-center text-[11px] text-slate-600 mt-2">Hacé click en las citas 📖 para ver la página original del libro</p>
          </div>
        </div>

        {sidebarOpen && (
          <div className="w-72 border-l border-slate-800/50 bg-black/20 overflow-y-auto shrink-0 hidden md:block">
            <div className="p-5">
              <h3 className="text-[11px] text-slate-500 tracking-[2px] uppercase font-semibold mb-3">Bibliografía</h3>
              {materia.libros.map((libro) => (
                <div key={libro} className="flex items-center gap-2 p-2.5 mb-2 rounded-lg bg-sky-500/[0.06] border border-sky-500/10 text-slate-400 text-sm">
                  <span>📖</span><span>{libro.split(" - ")[0]}</span>
                </div>
              ))}
              <h3 className="text-[11px] text-slate-500 tracking-[2px] uppercase font-semibold mt-6 mb-3">Temas</h3>
              {materia.temas.map((tema) => (
                <button key={tema} onClick={() => { setInput(`Explicame sobre ${tema}`); inputRef.current?.focus(); }}
                  className="block w-full text-left p-2 mb-1.5 rounded-lg text-sky-300 text-sm hover:bg-sky-500/10 border border-transparent hover:border-sky-500/15 transition-all"
                >{tema}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal con PDF + panel de texto relevante */}
      {pageModal && (
        <div
          style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.95)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}
          onClick={() => setPageModal(null)}
        >
          <div
            style={{ backgroundColor:"#0f172a", border:"1px solid #334155", borderRadius:"16px", maxWidth:"1200px", width:"100%", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 50px rgba(0,0,0,0.8)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding:"12px 24px", borderBottom:"1px solid #1e293b", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <div>
                <div style={{ color:"white", fontWeight:600, fontSize:"16px" }}>📖 {pageModal.libro.split(" - ")[0]}</div>
                <div style={{ color:"#38bdf8", fontSize:"14px" }}>Página {pageModal.page}</div>
              </div>
              <button
                onClick={() => setPageModal(null)}
                style={{ color:"#94a3b8", fontSize:"20px", background:"none", border:"none", cursor:"pointer", padding:"8px" }}
              >✕</button>
            </div>

            {/* Contenido: PDF + panel lateral */}
            <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
              {/* PDF embebido */}
              <div style={{ flex:1, overflow:"hidden" }}>
                <iframe
                  src={pageModal.pdfUrl}
                  style={{ width:"100%", height:"100%", border:"none", minHeight:"70vh" }}
                  title={`${pageModal.libro} - Página ${pageModal.page}`}
                />
              </div>

              {/* Panel lateral: texto relevante */}
              {pageModal.fragmentText && (
                <div style={{
                  width:"320px", borderLeft:"1px solid #1e293b", overflow:"auto",
                  flexShrink:0, display:"flex", flexDirection:"column",
                }}>
                  {/* Header del panel */}
                  <div style={{
                    padding:"14px 16px", borderBottom:"1px solid #1e293b",
                    flexShrink:0,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                      <div style={{ width:"12px", height:"12px", backgroundColor:"rgba(250,204,21,0.5)", borderRadius:"3px" }} />
                      <span style={{ color:"#facc15", fontSize:"13px", fontWeight:600 }}>
                        Información utilizada
                      </span>
                    </div>
                    <p style={{ color:"#64748b", fontSize:"11px", lineHeight:"1.4", margin:0 }}>
                      El tutor usó este texto de la página {pageModal.page} para su respuesta. Buscalo en el PDF de la izquierda.
                    </p>
                  </div>

                  {/* Oraciones relevantes */}
                  <div style={{ padding:"12px 16px", overflow:"auto", flex:1 }}>
                    {getRelevantSentences(pageModal.fragmentText).map((sentence, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding:"10px 12px",
                          marginBottom:"8px",
                          backgroundColor:"rgba(250,204,21,0.08)",
                          borderLeft:"3px solid rgba(250,204,21,0.5)",
                          borderRadius:"0 8px 8px 0",
                          color:"#e2e8f0",
                          fontSize:"13px",
                          lineHeight:"1.6",
                          userSelect:"text",
                          cursor:"text",
                        }}
                      >
                        {sentence}
                      </div>
                    ))}
                  </div>

                  {/* Botón copiar */}
                  <div style={{ padding:"12px 16px", borderTop:"1px solid #1e293b", flexShrink:0 }}>
                    <button
                      onClick={() => {
                        const sentences = getRelevantSentences(pageModal.fragmentText);
                        navigator.clipboard.writeText(sentences.join("\n\n"));
                      }}
                      style={{
                        width:"100%", padding:"8px", borderRadius:"8px", fontSize:"12px",
                        cursor:"pointer", border:"1px solid rgba(14,165,233,0.3)",
                        backgroundColor:"rgba(14,165,233,0.1)", color:"#7dd3fc",
                      }}
                    >
                      📋 Copiar texto relevante
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:"10px 24px", borderTop:"1px solid #1e293b", fontSize:"11px", color:"#475569", flexShrink:0 }}>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-white">Cargando...</div></div>
    }>
      <ChatContent />
    </Suspense>
  );
}

function formatMessage(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}