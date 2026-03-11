import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
// IMPORTAMOS LA NUEVA FUNCIÓN AQUÍ
import { deleteMaterialWithPages } from "@/lib/materialStore";

const PDF_DIR = path.join(process.cwd(), "data", "pdfs");
const CACHE_DIR = path.join(process.cwd(), "data", "page-cache");

function safeFileName(libro) {
  return libro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 80);
}

export async function POST(req) {
  try {
    const { year, materia, libro } = await req.json();

    if (!year || !materia || !libro) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const libroSafe = safeFileName(libro);
    let deletedCount = 0;

    // 1. Borrar el PDF original
    const pdfPath = path.join(PDF_DIR, `${year}_${materia}_${libroSafe}.pdf`);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      deletedCount++;
    }

    // 2. Borrar la metadata
    const metaPath = path.join(PDF_DIR, `${year}_${materia}_${libroSafe}_meta.json`);
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
      deletedCount++;
    }

    // 3. Borrar las páginas cacheadas (¡Esto libera el espacio ENOSPC!)
    if (fs.existsSync(CACHE_DIR)) {
      const cachedFiles = fs.readdirSync(CACHE_DIR);
      for (const file of cachedFiles) {
        if (file.startsWith(`${libroSafe}_page_`)) {
          fs.unlinkSync(path.join(CACHE_DIR, file));
          deletedCount++;
        }
      }
    }

    // 4. Borrar del JSON (El "cerebro" de búsqueda)
    const jsonBorrado = deleteMaterialWithPages(year, materia, libro);

    if (deletedCount === 0 && !jsonBorrado) {
       return NextResponse.json(
        { error: "No se encontraron archivos ni datos de ese libro para borrar." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `Libro borrado. Se liberó espacio de ${deletedCount} archivos.` },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error al borrar material:", error);
    return NextResponse.json(
      { error: "Error interno al borrar los archivos." },
      { status: 500 }
    );
  }
}