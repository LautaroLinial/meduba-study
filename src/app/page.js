"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM } from "@/lib/curriculum";
import { useAuth } from "@/lib/useAuth";

const yearColors = {
  "1": { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(59,130,246,0.2)" },
  "2": { gradient: "linear-gradient(135deg, #10b981, #06b6d4)", glow: "rgba(16,185,129,0.2)" },
  "3": { gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", glow: "rgba(245,158,11,0.2)" },
};

export default function Home() {
  const router = useRouter();
  const { loading, logout } = useAuth();
  const [activeYear, setActiveYear] = useState(null);

  const years = Object.entries(CURRICULUM);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#52525b", fontSize: "14px" }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "600px",
        background: "radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <header style={{
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", fontWeight: 700, color: "white",
          }}>M</div>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#e4e4e7", letterSpacing: "-0.3px" }}>MedUBA Study</span>
        </div>
        <button onClick={logout}
          style={{
            padding: "7px 14px", borderRadius: "8px", fontSize: "13px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
            color: "#71717a", cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseOver={(e) => { e.target.style.color = "#e4e4e7"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseOut={(e) => { e.target.style.color = "#71717a"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >Salir</button>
      </header>

      {/* Main */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 24px 40px", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h1 style={{
            fontSize: "44px", fontWeight: 700, lineHeight: 1.08,
            letterSpacing: "-2px", color: "#fafafa", marginBottom: "16px",
          }}>
            Tu tutor de<br />medicina personal
          </h1>
          <p style={{ fontSize: "16px", color: "#71717a", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto" }}>
            Respuestas basadas en la bibliografía oficial de la UBA. Pasá el cursor sobre tu año para ver las materias.
          </p>
        </div>

        {/* Year cards */}
        <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
          {years.map(([num, data]) => {
            const colors = yearColors[num];
            const isActive = activeYear === num;

            return (
              <div key={num}
                style={{ flex: 1, maxWidth: "220px", position: "relative", zIndex: isActive ? 100 : 1 }}
                onMouseEnter={() => setActiveYear(num)}
                onMouseLeave={() => setActiveYear(null)}
              >
                <div style={{
                  padding: "32px 20px", borderRadius: "16px",
                  background: isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                  cursor: "pointer", transition: "all 0.3s ease", textAlign: "center",
                  transform: isActive ? "translateY(-6px)" : "translateY(0)",
                  boxShadow: isActive ? `0 20px 40px ${colors.glow}` : "none",
                }}>
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "14px", margin: "0 auto 16px",
                    background: colors.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "24px", fontWeight: 700, color: "white",
                    boxShadow: isActive ? `0 8px 24px ${colors.glow}` : "none",
                    transition: "box-shadow 0.3s ease",
                  }}>
                    {num}°
                  </div>
                  <div style={{ fontSize: "15px", color: "#e4e4e7", fontWeight: 600, marginBottom: "4px" }}>{data.name}</div>
                  <div style={{ fontSize: "12px", color: "#52525b" }}>{Object.keys(data.materias).length} materias</div>
                </div>

                {isActive && (
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    width: "280px", marginTop: "8px",
                    background: "#18181b", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px", padding: "6px",
                    boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 30px ${colors.glow}`,
                    zIndex: 100, maxHeight: "50vh", overflowY: "auto",
                  }}>
                    <div style={{
                      position: "absolute", top: "-6px", left: "50%", transform: "translateX(-50%) rotate(45deg)",
                      width: "12px", height: "12px", background: "#18181b",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "1px solid rgba(255,255,255,0.1)",
                    }} />

                    {Object.entries(data.materias).map(([key, matData]) => (
                      <button key={key} onClick={() => router.push(`/chat?year=${num}&materia=${key}`)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: "10px",
                          background: "transparent", border: "none",
                          cursor: "pointer", transition: "all 0.15s ease",
                          display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "8px",
                          background: matData.color || "rgba(255,255,255,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "16px", flexShrink: 0,
                        }}>{matData.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e4e4e7" }}>{matData.name}</div>
                        </div>
                        <div style={{ color: "#3f3f46", fontSize: "14px" }}>→</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "300px", textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "#3f3f46" }}>MedUBA Study · Facultad de Medicina · UBA</p>
        </div>
      </main>
    </div>
  );
}