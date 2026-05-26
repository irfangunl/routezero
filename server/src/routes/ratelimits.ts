import { Router } from "express";
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";
import { getRateLimitStatus, isOnCooldown } from "../services/ratelimit.js";

export const rateLimitsRouter = Router();

// Get rate limit status for all enabled keys
rateLimitsRouter.get("/", (_req: Request, res: Response) => {
  const db = getDb();
  const keys = db
    .prepare(
      `
    SELECT ak.id, ak.platform, ak.label, ak.status as key_status
    FROM api_keys ak
    WHERE ak.enabled = 1
    ORDER BY ak.platform, ak.id
  `,
    )
    .all() as any[];

  // For each key, find the models on that platform with rate limits
  const statuses = keys.map((key) => {
    const models = db
      .prepare(
        `
      SELECT model_id, rpm_limit, rpd_limit, tpm_limit, tpd_limit
      FROM models
      WHERE platform = ? AND enabled = 1
    `,
      )
      .all(key.platform) as any[];

    const modelStatuses = models.map((m) => {
      const limits = {
        rpm: m.rpm_limit,
        rpd: m.rpd_limit,
        tpm: m.tpm_limit,
        tpd: m.tpd_limit,
      };
      const status = getRateLimitStatus(
        key.platform,
        m.model_id,
        key.id,
        limits,
      );
      const cooldown = isOnCooldown(key.platform, m.model_id, key.id);
      return {
        modelId: m.model_id,
        limits,
        usage: status,
        onCooldown: cooldown,
      };
    });

    return {
      keyId: key.id,
      platform: key.platform,
      label: key.label,
      keyStatus: key.key_status,
      models: modelStatuses,
    };
  });

  res.json(statuses);
});
