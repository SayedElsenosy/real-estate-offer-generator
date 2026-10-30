import { defineConfig } from "vite";
import vinext from "vinext";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";

// Keep Next.js / Vercel build intact. This Vite config runs only in the
// separate Cloudflare Worker build, where App Router RSC must use workerd.
export default defineConfig({
  plugins: [
    vinext({
      prerender: true,
      cache: { cdn: staticAssetsAdapter() }
    }),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
