// ============================================================
// API ROUTE - /api/pdf-page
// Proxy para páginas individuales de PDF desde R2.
// Si la página individual no existe (libro sin split),
// redirige al PDF completo como fallback.
//
// Query params: year, materia, libro, page
// ============================================================

export const dynamic = "force-dynamic";

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
    const page = searchParams.get("page");

    if (!year || !materia || !libro || !page) {
      return new Response("Faltan parámetros: year, materia, libro, page", {
        status: 400,
      });
    }

    const publicUrl = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");
    if (!publicUrl) {
      return new Response("NEXT_PUBLIC_R2_URL no configurada", { status: 500 });
    }

    const libroSafe = safeFileName(libro);
    const pdfKeyBase = `${year}_${materia}_${libroSafe}`;
    const pageKey = `pages/${pdfKeyBase}_p${page}.pdf`;
    const pageR2Url = `${publicUrl}/${pageKey}`;

    // Intentar servir la página individual
    const r2Response = await fetch(pageR2Url);

    if (r2Response.ok) {
      return new Response(r2Response.body, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Fallback: redirigir al PDF completo con ancla de página
    const fullPdfUrl = `${publicUrl}/${pdfKeyBase}.pdf`;
    return Response.redirect(`${fullPdfUrl}#page=${page}`, 302);
  } catch (error) {
    console.error("❌ ERROR EN API/PDF-PAGE:", error);
    return new Response(error.message, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
