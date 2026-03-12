"use client";
// ============================================================
// PDF PAGE VIEWER (v2 — Server-Side Render + R2 Cache)
//
// El servidor pre-renderiza la página con mupdf y la guarda
// como JPEG en R2. Este componente simplemente muestra la imagen.
//
// - Primera apertura: servidor renderiza (~5-30s, una sola vez)
// - Aperturas siguientes: imagen desde CDN (<500ms) ⚡
// - Sin pdf.js, sin range requests, sin CORS
// ============================================================
import { useState } from "react";

export default function PdfPageViewer({ imageUrl, accentColor = "#3b82f6" }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  // Estado: esperando que el servidor renderice/devuelva la URL
  if (!imageUrl) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", color: "#52525b" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontSize: "13px", color: "#71717a" }}>Preparando imagen de la página...</div>
          <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "6px" }}>
            La primera vez puede tardar unos segundos
          </div>
        </div>
      </div>
    );
  }

  // Estado: error del servidor (no encontró el PDF, etc.)
  if (imageUrl === "error") {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", color: "#ef4444", fontSize: "14px" }}>
          No se pudo cargar la página.<br />
          <span style={{ color: "#52525b", fontSize: "12px" }}>
            Verificá que el libro esté subido correctamente.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.center, position: "relative" }}>
      {/* Spinner mientras la imagen carga desde R2 */}
      {!imgLoaded && !imgError && (
        <div style={{ position: "absolute", textAlign: "center", color: "#52525b", zIndex: 1 }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
          <div style={{ fontSize: "13px" }}>Cargando imagen...</div>
        </div>
      )}

      {/* Error al cargar la imagen (URL inválida, red, etc.) */}
      {imgError && (
        <div style={{ textAlign: "center", color: "#ef4444", fontSize: "14px" }}>
          Error al cargar la imagen.<br />
          <span style={{ color: "#52525b", fontSize: "12px" }}>Cerrá y volvé a abrir.</span>
        </div>
      )}

      {/* Imagen de la página — carga instantáneamente desde R2 CDN */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Página del libro"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        draggable={false}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
          borderRadius: "2px",
          display: imgLoaded && !imgError ? "block" : "none",
        }}
      />
    </div>
  );
}

const styles = {
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "auto",
    background: "#111",
  },
};
