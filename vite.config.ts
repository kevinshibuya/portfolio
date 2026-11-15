import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * The ink loader paints from the HTML alone; the app's code is requested after
 * that paint (ledger 31).
 *
 * The loader (index.html) is HTML plus inline CSS, its label is the page's LCP
 * element, and the hero stays hidden under it until main.tsx lifts it. Vite's
 * tags hold that first frame on the stylesheet and request the entry chunk and
 * its two modulepreloads during HTML parse, so on a fast load all of them finish
 * before the frame is presented, and Lighthouse's simulator (which cannot tell
 * that ES modules play no part in that frame) charges their whole download to
 * the loader's paint.
 *
 * So, in the built page only (the dev server keeps Vite's own tags):
 * - the stylesheet is preloaded as a style (same top priority) and applied when
 *   it arrives, without holding the first frame; main.tsx renders nothing until
 *   it has applied, and index.html carries the page-wide rules that reach the
 *   loader, so the loader is the same either side of it;
 * - the entry script and its modulepreloads become an inline script that
 *   requests the same three files, the same way (module script, modulepreloads,
 *   crossorigin), once the browser reports its first paint (first-paint, or
 *   first-contentful-paint where only that is reported). That paint now comes
 *   one frame after the HTML, so on a slow connection the
 *   requests start a frame later while the stylesheet and the font are still
 *   arriving, and the code's last byte (and with it the name) does not move; on
 *   a fast one the 200 ms hold in main.tsx absorbs it. A hidden tab, a browser
 *   without paint timing, or no paint within 3 s starts the code at once.
 */
function loaderFirst(): Plugin {
  return {
    name: "loader-first",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const entryTag = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/;
        const preloadTag = /<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g;
        const entry = html.match(entryTag)?.[1];
        if (!entry) throw new Error("loader-first: no entry <script type=module> in index.html");
        const preloads = [...html.matchAll(preloadTag)].map((m) => m[1]);
        const starter =
          `<script>(function(){var e=${JSON.stringify(entry)},p=${JSON.stringify(preloads)},d=document,go=false;` +
          `function start(){if(go)return;go=true;for(var i=0;i<p.length;i++){var l=d.createElement("link");` +
          `l.rel="modulepreload";l.crossOrigin="";l.href=p[i];d.head.appendChild(l)}` +
          `var s=d.createElement("script");s.type="module";s.crossOrigin="";s.src=e;d.head.appendChild(s)}` +
          `try{if(d.visibilityState!=="hidden"&&PerformanceObserver.supportedEntryTypes.indexOf("paint")>=0){` +
          `new PerformanceObserver(function(l){if(l.getEntries().length)start()})` +
          `.observe({type:"paint",buffered:true});d.addEventListener("visibilitychange",function(){` +
          `if(d.visibilityState==="hidden")start()});setTimeout(start,3000);return}}catch(x){}start()})()</script>\n    `;
        // The stylesheet stops blocking the first frame: the loader's rules are
        // inline in index.html, and main.tsx renders nothing until this sheet
        // has applied. Preloaded as a style, so it keeps its top priority.
        const cssTag = /<link rel="stylesheet" crossorigin href="([^"]+)">/;
        const css = html.match(cssTag)?.[1];
        if (!css) throw new Error("loader-first: no stylesheet <link> in index.html");
        const cssPreload =
          `<link rel="preload" as="style" crossorigin href="${css}" data-app-css ` +
          `onload="this.onload=null;this.rel='stylesheet'">`;
        return html.replace(preloadTag, "").replace(entryTag, starter).replace(cssTag, cssPreload);
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), loaderFirst()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // React core — always needed first, keep tiny + cacheable
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-core";
          }
          // Framer Motion — large animation library, separate chunk for caching
          if (id.includes("node_modules/framer-motion/")) {
            return "framer-motion";
          }
          // Router
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/@remix-run/")
          ) {
            return "router";
          }
          // i18n
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "i18n";
          }
          // Lenis smooth scroll
          if (id.includes("node_modules/lenis/")) {
            return "lenis";
          }
        },
      },
    },
  },
});