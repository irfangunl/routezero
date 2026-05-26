import { Router } from "express";
import type { Request, Response } from "express";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const openapiRouter = Router();

// Serve the OpenAPI JSON spec
openapiRouter.get("/openapi.json", (_req: Request, res: Response) => {
  const spec = JSON.parse(
    readFileSync(resolve(__dirname, "../openapi.json"), "utf-8"),
  );
  res.json(spec);
});

// Swagger UI HTML
openapiRouter.get("/docs", (_req: Request, res: Response) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RouteZero API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`);
});
