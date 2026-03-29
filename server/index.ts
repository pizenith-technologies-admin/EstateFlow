// Local development entry point — not used on Vercel.
// Vercel uses api/_handler.ts (bundled to api/index.js) instead.
import { app, initPromise } from "./app";
import { log } from "./logger";
import { serveStatic } from "./staticServe";

(async () => {
  const server = await initPromise;

  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
