import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { VitePWA } from "vite-plugin-pwa";

let hash = "";
let version = "v0.0.0";
try {
  hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch (error) {
  console.error("Error getting git hash:", error);
  hash = "DEV";
}

try {
  const latestTag = execSync("git tag --sort=-v:refname", {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .find(Boolean);

  if (latestTag) {
    version = latestTag;
  }
} catch {
  // Leave the fallback version in place when tags are unavailable.
}

const CONTENT_SECURITY_POLICY =
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn-cookieyes.com; style-src 'self' 'unsafe-inline' data: https://rsms.me https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data: https://rsms.me https://cdn.jsdelivr.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self';";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const isProd = mode === "production";
  const isTest = env.VITE_IS_TEST;
  const useHTTPS = env.VITE_USE_HTTPS === "true";
  const isGitHubPages = env.VITE_GITHUB_PAGES === "true";
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const base =
    env.VITE_BASE_PATH ||
    (isGitHubPages && repositoryName ? `/${repositoryName}/` : "/");

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      ...(useHTTPS ? [basicSsl()] : []),
      createHtmlPlugin({
        inject: {
          data: {
            title: isTest ? "Haru Client (TEST)" : "Haru Client",
            cookieYesScript:
              isProd && env.VITE_COOKIEYES_CLIENT_ID
                ? // This is for GDPR/CCPA compliance
                  `<script async src="https://cdn-cookieyes.com/client_data/${env.VITE_COOKIEYES_CLIENT_ID}/script.js"></script>`
                : "",
          },
        },
      }),
      {
        // vite-plugin-pwa writes dist/sw.js via a raw fs.writeFile in its
        // closeBundle hook, on the assumption that outDir already exists
        // from the main bundle write. On some CI filesystems that write
        // hasn't landed yet when closeBundle fires, so sw.js's own write
        // throws ENOENT. Guarantee the directory exists just before that
        // hook runs.
        name: "ensure-out-dir-before-pwa",
        closeBundle: {
          order: "pre",
          handler() {
            mkdirSync(path.resolve(process.cwd(), "dist"), {
              recursive: true,
            });
          },
        },
      },
      VitePWA({
        selfDestroying: true,
      }),
    ],
    optimizeDeps: {
      include: ["react/jsx-runtime"],
    },
    define: {
      "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(hash),
      "import.meta.env.VITE_VERSION": JSON.stringify(version),
    },
    build: {
      emptyOutDir: true,
      assetsDir: "./",
    },
    // sqlocal ships an OPFS-backed Web Worker; rolldown only allows ES-format
    // workers when code-splitting is on (which Vite enables by default).
    worker: {
      format: "es",
    },
    resolve: {
      alias: {
        "@app": path.resolve(process.cwd(), "./src"),
        "@pages": path.resolve(process.cwd(), "./src/pages"),
        "@components": path.resolve(process.cwd(), "./src/components"),
        "@core": path.resolve(process.cwd(), "./src/core"),
        "@layouts": path.resolve(process.cwd(), "./src/layouts"),
      },
    },
    server: {
      port: 3000,
      headers: {
        "Content-Security-Policy": CONTENT_SECURITY_POLICY,
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  };
});
