// ============================================================
// API ROUTE - /api/pdf
// Proxy ligero de PDFs desde R2 via URL pública.
// Sin SDK de AWS — usa fetch() directo a pub-*.r2.dev
// (server-side no tiene CORS, es mucho más rápido).
// Reenvía Range requests para que pdf.js descargue por chunks.
// ============================================================

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) return new Response("Missing key", { status: 400 });

    const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
    if (!publicUrl) return new Response("NEXT_PUBLIC_R2_URL no configurada", { status: 500 });

    const r2Url = `${publicUrl}/${key}`;
    const rangeHeader = request.headers.get("range");

    // Fetch server-side (sin CORS) — mucho más liviano que AWS SDK
    const r2Response = await fetch(r2Url, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });

    if (!r2Response.ok && r2Response.status !== 206) {
      return new Response("PDF no encontrado", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type":  "application/pdf",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin":   "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    });

    // Propagar headers de rango desde R2
    const contentRange  = r2Response.headers.get("content-range");
    const contentLength = r2Response.headers.get("content-length");
    if (contentRange)  headers.set("Content-Range",  contentRange);
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(r2Response.body, {
      status:  r2Response.status,
      headers,
    });

  } catch (error) {
    console.error("❌ ERROR EN API/PDF:", error);
    return new Response(error.message, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age":       "86400",
    },
  });
}
