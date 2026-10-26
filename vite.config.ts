import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    // 日本語フォントは unicode-range で分割されているので、CSS に埋め込まず個別に配信する
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
});
