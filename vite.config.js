import { spawn } from "node:child_process";
import { defineConfig } from "vite";

function gilloeApiPlugin() {
  return {
    name: "gilloe-api",
    configureServer(server) {
      const child = spawn(process.execPath, ["server/index.js"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      const stop = () => {
        if (child.exitCode == null) child.kill();
      };
      server.httpServer?.once("close", stop);
    },
  };
}

export default defineConfig({
  plugins: [gilloeApiPlugin()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/uploads": "http://127.0.0.1:8787",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
