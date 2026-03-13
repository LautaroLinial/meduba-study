// ============================================================
// PDF PAGE SPLITTER (v2 — mupdf nativo, ~100x más rápido)
// Splitea un PDF en páginas individuales usando mupdf (C nativo)
// y las sube a R2 para carga instantánea desde el viewer.
//
// Cada página se guarda como: pages/{pdfKeyBase}_p{N}.pdf
// ============================================================

import * as mupdf from "mupdf";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

/**
 * Splitea un PDF en páginas individuales y las sube a R2.
 * Usa mupdf (C nativo) para velocidad máxima.
 * Corre en background (fire-and-forget).
 *
 * @param {Buffer|ArrayBuffer} pdfBuffer - El PDF completo
 * @param {string} pdfKeyBase - Ej: "1_anatomia_Latarjet_5ed"
 * @param {number} totalPages - Total de páginas del PDF
 */
export async function splitAndUploadPages(pdfBuffer, pdfKeyBase, totalPages) {
  const s3 = getS3Client();
  const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
  const BATCH = 5;
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[split-pages] Iniciando: ${totalPages} páginas de ${pdfKeyBase} (mupdf nativo)`);

  // Abrir el PDF fuente con mupdf (C nativo — instantáneo)
  const srcDoc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");

  for (let i = 0; i < totalPages; i += BATCH) {
    const batch = Array.from(
      { length: Math.min(BATCH, totalPages - i) },
      (_, j) => i + j
    );

    await Promise.all(
      batch.map(async (pageIdx) => {
        const pageNum = pageIdx + 1;
        const pageKey = `pages/${pdfKeyBase}_p${pageNum}.pdf`;
        const pageUrl = `${publicUrl}/${pageKey}`;

        // Saltar si ya existe en R2
        try {
          const check = await fetch(pageUrl, { method: "HEAD" });
          if (check.ok) {
            skipped++;
            return;
          }
        } catch {}

        try {
          // Crear PDF de una página con mupdf (nativo, ~5ms por página)
          const newDoc = new mupdf.PDFDocument();
          newDoc.graftPage(0, srcDoc, pageIdx);
          const mupdfBuf = newDoc.saveToBuffer("compress");
          const pdfBytes = Buffer.from(mupdfBuf.asUint8Array());

          // Subir a R2
          await s3.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: pageKey,
              Body: pdfBytes,
              ContentType: "application/pdf",
              CacheControl: "public, max-age=31536000, immutable",
            })
          );
          uploaded++;
        } catch (err) {
          errors++;
          console.error(`[split-pages] Error en página ${pageNum}: ${err.message}`);
        }
      })
    );

    // Log cada 25 páginas
    const processed = Math.min(i + BATCH, totalPages);
    if (processed % 25 < BATCH) {
      console.log(
        `[split-pages] ${processed}/${totalPages} (${uploaded} subidas, ${skipped} existentes, ${errors} errores)`
      );
    }
  }

  console.log(
    `[split-pages] ✅ Completado: ${uploaded} páginas nuevas, ${skipped} ya existían, ${errors} errores`
  );
}
