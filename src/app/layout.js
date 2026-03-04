import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MedUBA Study - Plataforma de Estudio para Medicina UBA",
  description:
    "Asistente inteligente para estudiantes de la Facultad de Medicina de la Universidad de Buenos Aires. Estudiá con la bibliografía oficial de cada materia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}