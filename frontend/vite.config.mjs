import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Packaged Electron loads index.html via file://, so assets must be relative.
  base: "./",
  plugins: [react()],
});
