import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { getUnifiedApiKey, regenerateUnifiedKey, getDb } from "../db/index.js";
import { encrypt, decrypt } from "../lib/crypto.js";

export const settingsRouter = Router();

// Get the unified API key
settingsRouter.get("/api-key", (_req: Request, res: Response) => {
  res.json({ apiKey: getUnifiedApiKey() });
});

// Regenerate the unified API key
settingsRouter.post("/api-key/regenerate", (_req: Request, res: Response) => {
  const newKey = regenerateUnifiedKey();
  res.json({ apiKey: newKey });
});

// Export full config (keys + fallback)
settingsRouter.get("/export", (_req: Request, res: Response) => {
  const db = getDb();
  const keys = db
    .prepare(
      "SELECT platform, label, encrypted_key, iv, auth_tag FROM api_keys",
    )
    .all() as any[];
  const fallback = db
    .prepare(
      "SELECT model_db_id, priority, enabled FROM fallback_config ORDER BY priority ASC",
    )
    .all() as any[];
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    keys: keys.map((k) => ({
      platform: k.platform,
      label: k.label,
      encryptedKey: k.encrypted_key.toString("base64"),
      iv: k.iv.toString("base64"),
      authTag: k.auth_tag.toString("base64"),
    })),
    fallback,
  });
});

// Import full config
settingsRouter.post("/import", (req: Request, res: Response) => {
  const schema = z.object({
    version: z.literal(1),
    keys: z.array(
      z.object({
        platform: z.string(),
        label: z.string().optional(),
        encryptedKey: z.string(),
        iv: z.string(),
        authTag: z.string(),
      }),
    ),
    fallback: z.array(
      z.object({
        model_db_id: z.number(),
        priority: z.number(),
        enabled: z.number(),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({
        error: {
          message:
            "Invalid config format: " +
            parsed.error.errors.map((e) => e.message).join(", "),
        },
      });
    return;
  }
  const db = getDb();
  const { keys, fallback } = parsed.data;
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM api_keys").run();
    for (const k of keys) {
      db.prepare(
        `
        INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled)
        VALUES (?, ?, ?, ?, ?, 'unknown', 1)
      `,
      ).run(
        k.platform,
        k.label ?? "",
        Buffer.from(k.encryptedKey, "base64"),
        Buffer.from(k.iv, "base64"),
        Buffer.from(k.authTag, "base64"),
      );
    }
    db.prepare("DELETE FROM fallback_config").run();
    for (const f of fallback) {
      db.prepare(
        `INSERT INTO fallback_config (model_db_id, priority, enabled) VALUES (?, ?, ?)`,
      ).run(f.model_db_id, f.priority, f.enabled);
    }
  });
  tx();
  res.json({
    success: true,
    keysImported: keys.length,
    fallbackImported: fallback.length,
  });
});
