"use client";
// ============================================================
// PDF PAGE VIEWER
// Renderiza UNA página de PDF en el navegador usando pdf.js.
// - Range requests: solo descarga los bytes de esa página (~200KB)
// - Capa de texto: podés seleccionar y copiar texto
// - Sin carga al servidor: R2 sirve el PDF directo al browser
// ============================================================
import { useEffect, useRef, useState } from "react";

export default function PdfPageViewer({ url, pageNumber, accentColor = "#3b82f6" }) {
  const wrapperRef  = useRef(null);
  const [status, setStatus]   = useState("loading");
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!url || !pageNumber) return;
    let cancelled = false;
    setStatus("loading");

    async function renderPage() {
      try {
        // Importación dinámica — no se bundlea hasta que se abre el modal
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");

        // Worker local (en /public) para evitar dependencias de CDN y problemas de bundling
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // getDocument hace range requests: descarga solo lo necesario
        const pdfDoc = await pdfjsLib.getDocument({
          url,
          rangeChunkSize: 65536,   // 64KB por chunk
          disableAutoFetch: true,  // Solo pide bytes cuando los necesita
          disableStream: false,
        }).promise;

        if (cancelled) return;

        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const scale    = Math.min(1.6, (window.innerWidth * 0.55) / page.getViewport({ scale: 1 }).width);
        const viewport = page.getViewport({ scale });

        if (cancelled) return;

        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        wrapper.innerHTML = "";
        setPageSize({ w: viewport.width, h: viewport.height });

        // ── Canvas (imagen de la página) ────────────────────────────────
        const canvas    = document.createElement("canvas");
        const ctx       = canvas.getContext("2d");
        canvas.width    = viewport.width;
        canvas.height   = viewport.height;
        canvas.style.display = "block";
        wrapper.appendChild(canvas);

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // ── Capa de texto (seleccionar / copiar) ────────────────────────
        const textDiv = document.createElement("div");
        textDiv.style.cssText = `
          position: absolute; top: 0; left: 0;
          width: ${viewport.width}px; height: ${viewport.height}px;
          overflow: hidden; pointer-events: auto;
        `;
        wrapper.style.position = "relative";
        wrapper.appendChild(textDiv);

        // Inyectar CSS de pdf.js para el text layer (solo 1 vez)
        if (!document.getElementById("pdfjsTextLayerStyle")) {
          const style = document.createElement("style");
          style.id = "pdfjsTextLayerStyle";
          style.textContent = `
            .pdfTextLayer { opacity: 0.25; mix-blend-mode: multiply; }
            .pdfTextLayer span {
              color: transparent; position: absolute; white-space: pre;
              cursor: text; transform-origin: 0% 0%;
            }
            .pdfTextLayer ::selection { background: rgba(0,100,255,0.35); }
          `;
          document.head.appendChild(style);
        }
        textDiv.className = "pdfTextLayer";

        const textContent = await page.getTextContent();
        if (cancelled) return;

        // pdfjs-dist v4: usa la clase TextLayer
        // pdfjs-dist v3 y anteriores: usa renderTextLayer
        if (pdfjsLib.TextLayer) {
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textDiv,
            viewport,
          });
          await textLayer.render();
        } else if (pdfjsLib.renderTextLayer) {
          pdfjsLib.renderTextLayer({ textContentSource: textContent, container: textDiv, viewport });
        }

        if (cancelled) return;
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("PdfPageViewer error:", err);
          setStatus("error");
        }
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [url, pageNumber]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", background: "#111" }}>
      {status === "loading" && (
        <div style={{ textAlign: "center", color: "#52525b" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
          <div style={{ fontSize: "13px" }}>Cargando página...</div>
          <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "6px" }}>Solo descarga esta página desde la nube</div>
        </div>
      )}
      {status === "error" && (
        <div style={{ textAlign: "center", color: "#ef4444", fontSize: "14px" }}>
          No se pudo cargar la página.<br/>
          <span style={{ color: "#52525b", fontSize: "12px" }}>Verificá que el libro esté subido correctamente.</span>
        </div>
      )}
      <div
        ref={wrapperRef}
        style={{
          display: status === "ready" ? "block" : "none",
          boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
