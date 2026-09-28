import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The Spring Boot API runs on port 8801 (see src/main/resources/application.properties).
// In development every /api request is forwarded there, so the browser sees one origin
// and the JSESSIONID login cookie works without any CORS setup.
// Set API_TARGET to point at a different backend, e.g. API_TARGET=http://192.168.1.20:8801 npm run dev
const apiTarget = process.env.API_TARGET ?? "http://localhost:8801";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
