import fs from "fs";
import path from "path";

// Si estamos en un worktree (.claude/worktrees/...), cargamos el .env.local del repo principal
const localEnv = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(localEnv)) {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    dir = path.dirname(dir);
    const candidate = path.join(dir, ".env.local");
    if (fs.existsSync(candidate)) {
      const lines = fs.readFileSync(candidate, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) process.env[key] = val;
        }
      }
      break;
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
