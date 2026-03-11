// ============================================================
// API ROUTE - /api/material-info
// Devuelve libros cargados, opcionalmente filtrados por cátedra
// ============================================================

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");
    const catedra = searchParams.get("catedra");

    if (!year || !materia) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const materialesPath = path.join(process.cwd(), "data", "materiales", `${year}_${materia}.json`);

    if (!fs.existsSync(materialesPath)) {
      return NextResponse.json({ libros: [] });
    }

    const raw = fs.readFileSync(materialesPath, "utf-8");
    const data = JSON.parse(raw);

    // Extraer libros únicos
    const librosMap = {};
    data.fragments.forEach((f) => {
      if (!librosMap[f.libro]) {
        librosMap[f.libro] = { name: f.libro, fragments: 0, pages: new Set() };
      }
      librosMap[f.libro].fragments++;
      if (f.page) librosMap[f.libro].pages.add(f.page);
    });

    let libros = Object.values(librosMap).map((l) => ({
      name: l.name,
      fragments: l.fragments,
      pages: l.pages.size,
    }));

    // Si se pide una cátedra específica, filtrar por asignaciones
    if (catedra) {
      const configPath = path.join(process.cwd(), "data", "config", `${year}_${materia}_catedras.json`);
      if (fs.existsSync(configPath)) {
        const configRaw = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(configRaw);
        const assignedBooks = config.assignments?.[catedra] || [];
        if (assignedBooks.length > 0) {
          libros = libros.filter(l => assignedBooks.includes(l.name));
        }
      }
      // Si no hay config, muestra todos los libros
    }

    return NextResponse.json({ libros });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}