// ============================================================
// API ROUTE - /api/auth/login
// Verifica credenciales de admin
// ============================================================

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    // Credenciales de admin desde variables de entorno
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "meduba2024";

    if (username === adminUser && password === adminPass) {
      // Generar token simple (en producción usar JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");

      return NextResponse.json({
        role: "admin",
        token: token,
        message: "Login exitoso",
      });
    }

    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Error en el login" },
      { status: 500 }
    );
  }
}