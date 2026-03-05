// ============================================================
// API ROUTE - /api/material-info
// Devuelve qué libros están cargados para una materia
// ============================================================

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");

    if (!year || !materia) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materia}.json`);

    if (!fs.existsSync(materialesPath)) {
      return NextResponse.json({ libros: [] });
    }

    const raw = fs.readFileSync(materialesPath, "utf-8");
    const data = JSON.parse(raw);

    // Extraer libros únicos con cantidad de fragmentos
    const librosMap = {};
    data.fragments.forEach((f) => {
      if (!librosMap[f.libro]) {
        librosMap[f.libro] = { name: f.libro, fragments: 0, pages: new Set() };
      }
      librosMap[f.libro].fragments++;
      if (f.page) librosMap[f.libro].pages.add(f.page);
    });

    const libros = Object.values(librosMap).map((l) => ({
      name: l.name,
      fragments: l.fragments,
      pages: l.pages.size,
    }));

    return NextResponse.json({ libros });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}