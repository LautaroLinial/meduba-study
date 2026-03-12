"use client";
// ============================================================
// PDF PAGE VIEWER (v3 — iframe directo al PDF en R2)
//
// Muestra la página del libro usando el visor nativo del browser.
// El texto es seleccionable y copiable, sin dependencias extra.
//
// Props:
//   pdfUrl  — URL pública del PDF en R2
//   page    — número de página físico (1-indexed)
// ============================================================

export default function PdfPageViewer({ pdfUrl, page, accentColor = "#3b82f6" }) {
  if (!pdfUrl) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", color: "#52525b" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
          <div style={{ fontSize: "13px", color: "#71717a" }}>Cargando PDF...</div>
        </div>
      </div>
    );
  }

  if (pdfUrl === "error") {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", color: "#ef4444", fontSize: "14px" }}>
          No se pudo cargar el PDF.<br />
          <span style={{ color: "#52525b", fontSize: "12px" }}>
            Verificá que el libro esté subido correctamente.
          </span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`${pdfUrl}#page=${page}`}
      style={{ width: "100%", height: "100%", border: "none" }}
      title={`PDF — Página ${page}`}
    />
  );
}

const styles = {
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
  },
};
