// ============================================================
// PDF DOC CACHE — cache compartido entre upload y render-page
//
// El route de upload carga el PDF en mupdf para extraer texto.
// En lugar de descartar ese documento, lo guarda acá para que
// render-page lo reutilice sin necesidad de re-descargar el PDF.
//
// Clave: pdfKey (ej. "1_anatomia_Latarjet_5ed.pdf")
// Valor: { doc: mupdf.Document, totalPages: number }
//
// Se reinicia con el servidor. No usa disco.
// ============================================================

export const pdfDocCache = new Map();
