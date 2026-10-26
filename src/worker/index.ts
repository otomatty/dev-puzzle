import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

const routes = app.get("/health", (c) => c.json({ status: "ok" }));

export type AppType = typeof routes;
export default app;
