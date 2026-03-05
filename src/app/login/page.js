"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("meduba_role", data.role);
        localStorage.setItem("meduba_token", data.token);
        router.push(data.role === "admin" ? "/admin" : "/");
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    localStorage.setItem("meduba_role", "guest");
    localStorage.setItem("meduba_token", "guest");
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px", margin: "0 auto 16px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: 700, color: "white",
          }}>M</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fafafa", letterSpacing: "-0.8px", marginBottom: "6px" }}>
            MedUBA Study
          </h1>
          <p style={{ fontSize: "14px", color: "#52525b" }}>Tutor de medicina para la UBA</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} style={{
          padding: "24px", borderRadius: "16px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "12px",
        }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "6px", fontWeight: 500 }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: "10px", fontSize: "14px",
                background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                color: "#e4e4e7", outline: "none", transition: "border-color 0.2s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#71717a", marginBottom: "6px", fontWeight: 500 }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "11px 44px 11px 14px", borderRadius: "10px", fontSize: "14px",
                  background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e4e4e7", outline: "none", transition: "border-color 0.2s",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: "16px",
                  color: "#52525b", padding: "4px",
                }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              fontSize: "13px", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !username || !password}
            style={{
              width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
              border: "none", cursor: loading || !username || !password ? "default" : "pointer",
              color: "white", transition: "all 0.2s",
              background: loading || !username || !password ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: "12px", color: "#3f3f46" }}>o</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Guest access */}
        <button onClick={handleGuest}
          style={{
            width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
            background: "transparent", color: "#71717a", transition: "all 0.2s",
          }}
          onMouseOver={(e) => { e.target.style.color = "#e4e4e7"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseOut={(e) => { e.target.style.color = "#71717a"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          Entrar como invitado →
        </button>

        <p style={{ textAlign: "center", fontSize: "11px", color: "#3f3f46", marginTop: "24px" }}>
          Los invitados pueden consultar el tutor pero no subir material.
        </p>
      </div>
    </div>
  );
}