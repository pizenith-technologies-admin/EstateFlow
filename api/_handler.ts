import { app, initPromise } from "../server/app";
import type { Request, Response } from "express";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[^.]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function resolveOrigin(requestOrigin: string | undefined): string | undefined {
  if (!requestOrigin) return undefined;
  const extra = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];
  const allowed =
    ALLOWED_ORIGIN_PATTERNS.some((r) => r.test(requestOrigin)) ||
    extra.includes(requestOrigin);
  return allowed ? requestOrigin : undefined;
}

export default async function handler(req: Request, res: Response) {
  const origin = resolveOrigin(req.headers.origin as string | undefined);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  await initPromise;
  app(req, res);
}
