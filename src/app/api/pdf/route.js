// ============================================================
// API ROUTE - /api/pdf
// Proxy de PDFs desde R2: reenvía Range requests al bucket.
// Necesario porque R2 no tiene CORS configurado para el browser.
// El servidor actúa como passthrough: descarga solo los bytes
// solicitados (range requests), sin cargar el PDF completo.
// ============================================================

export const dynamic = 'force-dynamic';

import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) return new Response("Missing key", { status: 400 });

    const rangeHeader = request.headers.get("range");

    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key:    key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const r2Response = await s3.send(cmd);

    const headers = new Headers({
      "Content-Type":  "application/pdf",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
      // Permite que pdf.js lea la respuesta desde el mismo origen
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    });

    if (r2Response.ContentLength != null)
      headers.set("Content-Length", r2Response.ContentLength.toString());
    if (r2Response.ContentRange)
      headers.set("Content-Range", r2Response.ContentRange);

    // transformToWebStream() convierte el Node.js readable en Web ReadableStream
    const body = r2Response.Body.transformToWebStream();
    const status = rangeHeader ? 206 : 200;

    return new Response(body, { status, headers });

  } catch (error) {
    console.error("❌ ERROR EN API/PDF:", error);
    return new Response(error.message, { status: 500 });
  }
}

// Responder a preflight OPTIONS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age":       "3600",
    },
  });
}
