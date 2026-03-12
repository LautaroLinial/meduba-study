// ============================================================
// API ROUTE - /api/page
// Devuelve la URL del proxy (/api/pdf?key=...) para que el
// cliente lo renderice con pdf.js mediante range requests.
// Usamos el proxy para evitar el problema de CORS con R2.
// ============================================================

export const dynamic = 'force-dynamic';

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
    const year    = searchParams.get("year");
    const materia = searchParams.get("materia");
    const libro   = searchParams.get("libro");

    if (!year || !materia || !libro) {
      return new Response("Faltan parámetros", { status: 400 });
    }

    const libroSafe = safeFileName(libro);
    const pdfKey    = `${year}_${materia}_${libroSafe}.pdf`;

    // Usar proxy /api/pdf para evitar problemas de CORS con R2
    return Response.json({ url: `/api/pdf?key=${encodeURIComponent(pdfKey)}` });

  } catch (error) {
    console.error("❌ ERROR EN API/PAGE:", error);
    return new Response(error.message, { status: 500 });
  }
}
