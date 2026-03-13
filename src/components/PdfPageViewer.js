"use client";
// ============================================================
// PDF PAGE VIEWER (v4 — página individual desde R2 + Cache API)
//
// Carga una sola página del PDF (~100KB) en vez del libro
// completo (~200MB). Usa Cache API para acceso instantáneo
// en visitas repetidas.
//
// Props:
//   pageUrl      — URL de la página individual (/api/pdf-page?...)
//   fallbackUrl  — URL del PDF completo como fallback
//   page         — número de página (para el fallback)
// ============================================================

import { useState, useEffect } from "react";

const CACHE_NAME = "pdf-pages";

export default function PdfPageViewer({ pageUrl, fallbackUrl, page }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pageUrl) return;
    let cancelled = false;
    let blobUrl = null;

    async function loadPage() {
      setLoading(true);
      setError(false);

      try {
        // 1. Intentar desde Cache API
        if ("caches" in window) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(pageUrl);
          if (cached) {
            const blob = await cached.blob();
            if (!cancelled) {
              blobUrl = URL.createObjectURL(blob);
              setSrc(blobUrl);
              setLoading(false);
            }
            return;
          }
        }

        // 2. Fetch desde el servidor
        const res = await fetch(pageUrl);

        // Si redirige (fallback al PDF completo), usar la URL con ancla de página
        if (res.redirected) {
          if (!cancelled) {
            setSrc(`${res.url}#page=${page}`);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          // Fallback al PDF completo
          if (!cancelled) {
            setSrc(fallbackUrl ? `${fallbackUrl}#page=${page}` : null);
            setLoading(false);
          }
          return;
        }

        // 3. Guardar en Cache API y mostrar
        const blob = await res.blob();
        if ("caches" in window) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(pageUrl, new Response(blob.slice(0), {
            headers: { "Content-Type": "application/pdf" },
          }));
        }

        if (!cancelled) {
          blobUrl = URL.createObjectURL(blob);
          setSrc(blobUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("[PdfPageViewer] Error:", err);
        if (!cancelled) {
          if (fallbackUrl) {
            setSrc(`${fallbackUrl}#page=${page}`);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [pageUrl, fallbackUrl, page]);

  if (error) {
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

  if (loading || !src) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", color: "#52525b" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
          <div style={{ fontSize: "13px", color: "#71717a" }}>Cargando página...</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      style={{ width: "100%", height: "100%", border: "none" }}
      title={`PDF — Página ${page}`}
    />
  );
}

/** Limpia el cache de páginas PDF del browser */
export async function clearPdfCache() {
  if ("caches" in window) {
    await caches.delete(CACHE_NAME);
    return true;
  }
  return false;
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
