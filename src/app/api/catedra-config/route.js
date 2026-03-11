// ============================================================
// API ROUTE - /api/catedra-config
// GET: obtener asignaciones de libros por cátedra
// POST: guardar asignaciones
// ============================================================

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "data", "config");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getConfigPath(year, materia) {
  return path.join(CONFIG_DIR, `${year}_${materia}_catedras.json`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const materia = searchParams.get("materia");

    if (!year || !materia) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const configPath = getConfigPath(year, materia);

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ assignments: {} });
    }

    const raw = fs.readFileSync(configPath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { year, materia, assignments } = await request.json();

    if (!year || !materia || !assignments) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    ensureDir(CONFIG_DIR);
    const configPath = getConfigPath(year, materia);

    // assignments = { "1": ["Latarjet", "Rouvière"], "2": ["Latarjet", "Testut"], "3": ["Rouvière"] }
    fs.writeFileSync(configPath, JSON.stringify({ assignments }, null, 2), "utf-8");

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}