// ============================================================
// API ROUTE - /api/page
// Genera una URL firmada de R2 para que el navegador descargue
// el PDF directamente (sin pasar por el servidor).
// Respuesta instantánea (~100ms) sin importar el tamaño del libro.
// ============================================================

import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");
    const libro = searchParams.get("libro");
    const pageStr = searchParams.get("page");

    if (!year || !materia || !libro || !pageStr) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const libroSafe = safeFileName(libro);
    const pdfKey = `${year}_${materia}_${libroSafe}.pdf`;

    // Generar URL firmada válida por 1 hora.
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: pdfKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ signedUrl, page: parseInt(pageStr, 10) });
  } catch (error) {
    console.error("❌ ERROR EN API/PAGE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
