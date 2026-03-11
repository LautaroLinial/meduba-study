import { NextResponse } from "next/server";
import { saveMaterialWithPages } from "@/lib/materialStore";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as mupdf from "mupdf";

// Configuramos la conexión a Cloudflare R2 usando los datos de tu .env.local
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function safeFileName(libro) {
  return libro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 80);
}

function splitPageText(text, maxWords = 400) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const fragments = []; let current = [];
  words.forEach((word) => { current.push(word); if (current.length >= maxWords) { fragments.push(current.join(" ")); current = []; } });
  if (current.length > 0) fragments.push(current.join(" "));
  return fragments;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const year = formData.get("year");
    const materia = formData.get("materia");
    const libro = formData.get("libro");
    const pageOffset = parseInt(formData.get("pageOffset") || "0");

    if (!file || !year || !materia || !libro) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfFileName = `${year}_${materia}_${safeFileName(libro)}.pdf`;

    // ☁️ PASO 1: Subida profesional a Cloudflare R2
    // Usamos 'Upload' de AWS SDK porque maneja archivos grandes (>100MB) sin romperse
    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: pdfFileName,
        Body: buffer,
        ContentType: "application/pdf",
      },
    });

    console.log(`Subiendo ${pdfFileName} a Cloudflare R2...`);
    await parallelUploads3.done();
    console.log("¡Subida completada con éxito!");

    // 📄 PASO 2: Extracción de texto (Todo ocurre en la RAM, nada en disco)
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    const totalPages = doc.countPages();
    let fragments = [];

    for (let i = 0; i < totalPages; i++) {
      const page = doc.loadPage(i);
      const pageText = page.toStructuredText("preserve-whitespace").asText();
      if (pageText.trim().length < 20) continue;

      const subFragments = splitPageText(pageText.trim());
      subFragments.forEach((fragText) => {
        fragments.push({ text: fragText, page: i + 1 + pageOffset });
      });
    }

    // Guardamos los fragmentos en tu JSON local de búsqueda
    const result = saveMaterialWithPages({
      year: parseInt(year), materia, libro, fragments,
    });

    return NextResponse.json({
      success: true,
      message: `¡Libro en la nube! Se procesaron ${totalPages} páginas.`,
    });

  } catch (error) {
    console.error("Error fatal en el upload:", error);
    return NextResponse.json({ error: "Error en el servidor: " + error.message }, { status: 500 });
  }
}