import vinext from "vinext";
import { defineConfig } from "vite";

const localDatabaseId = "00000000-0000-4000-8000-000000000000";

export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    server: { host: "127.0.0.1", port: 5173 },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "./build/worker.ts",
          compatibility_date: "2026-05-15",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: [{
            binding: "DB",
            database_name: "salvacel-local",
            database_id: localDatabaseId,
          }],
        },
      }),
    ],
  };
});
