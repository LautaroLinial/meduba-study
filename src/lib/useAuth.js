// ============================================================
// useAuth - Hook para verificar autenticación
// ============================================================

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth(requiredRole = null) {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem("meduba_role");
    const storedToken = localStorage.getItem("meduba_token");

    if (!storedRole || !storedToken) {
      router.push("/login");
      return;
    }

    if (requiredRole && storedRole !== requiredRole) {
      // Si necesita ser admin pero es guest, redirigir al home
      if (requiredRole === "admin" && storedRole === "guest") {
        router.push("/");
        return;
      }
    }

    setRole(storedRole);
    setLoading(false);
  }, [requiredRole, router]);

  const logout = () => {
    localStorage.removeItem("meduba_role");
    localStorage.removeItem("meduba_token");
    router.push("/login");
  };

  const isAdmin = role === "admin";
  const isGuest = role === "guest";

  return { role, isAdmin, isGuest, loading, logout };
}