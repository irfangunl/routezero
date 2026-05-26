import type { Platform } from "@routezero/shared/types.js";

// Provider-level default ranks. Used when a model has no explicit rank
// AND no model-name-based default below.
const PROVIDER_DEFAULTS: Record<
  string,
  { intelligence: number; coding: number; research: number }
> = {
  google: { intelligence: 5, coding: 7, research: 3 },
  openrouter: { intelligence: 6, coding: 6, research: 4 },
  mistral: { intelligence: 7, coding: 5, research: 6 },
  sambanova: { intelligence: 8, coding: 8, research: 5 },
  github: { intelligence: 10, coding: 10, research: 8 },
  cerebras: { intelligence: 12, coding: 11, research: 12 },
  huggingface: { intelligence: 12, coding: 12, research: 10 },
  groq: { intelligence: 15, coding: 13, research: 14 },
  cloudflare: { intelligence: 16, coding: 15, research: 13 },
  cohere: { intelligence: 18, coding: 18, research: 15 },
  zhipu: { intelligence: 18, coding: 17, research: 16 },
  nvidia: { intelligence: 22, coding: 20, research: 22 },
  ollama: { intelligence: 22, coding: 21, research: 20 },
  opencode: { intelligence: 25, coding: 19, research: 24 },
  kilo: { intelligence: 30, coding: 28, research: 28 },
  pollinations: { intelligence: 32, coding: 30, research: 30 },
  llm7: { intelligence: 32, coding: 29, research: 31 },
};

// Model-name-based defaults. Key = model_id or prefix (case-insensitive).
// Matched BEFORE provider default, so same model gets same rank everywhere.
// Prefix match: "qwen3-" matches "qwen3-235b", "qwen3-32b", etc.
const MODEL_RANKS: [
  string,
  { intelligence: number; coding: number; research: number },
][] = [
  // Frontier
  ["deepseek-v3", { intelligence: 2, coding: 2, research: 1 }],
  ["deepseek-v4", { intelligence: 1, coding: 1, research: 1 }],
  ["gpt-5", { intelligence: 2, coding: 3, research: 2 }],
  ["gpt-4.1", { intelligence: 4, coding: 5, research: 4 }],
  ["gpt-4o", { intelligence: 6, coding: 7, research: 6 }],
  ["gemini-2.5-pro", { intelligence: 3, coding: 6, research: 2 }],
  ["gemini-2.5-flash", { intelligence: 9, coding: 10, research: 7 }],

  // Claude
  ["claude-sonnet", { intelligence: 5, coding: 4, research: 5 }],
  ["claude-haiku", { intelligence: 8, coding: 8, research: 8 }],

  // Qwen
  ["qwen3-coder", { intelligence: 10, coding: 3, research: 12 }],
  ["qwen3-235b", { intelligence: 11, coding: 11, research: 11 }],
  ["qwen3-", { intelligence: 13, coding: 12, research: 13 }],
  ["qwen2.5", { intelligence: 16, coding: 15, research: 17 }],

  // Llama
  ["llama-3.3", { intelligence: 14, coding: 14, research: 14 }],
  ["llama-3.2", { intelligence: 20, coding: 20, research: 20 }],
  ["llama-3.1", { intelligence: 17, coding: 17, research: 18 }],
  ["llama-4", { intelligence: 13, coding: 13, research: 13 }],

  // Mistral
  ["mistral-large", { intelligence: 7, coding: 5, research: 7 }],
  ["codestral", { intelligence: 12, coding: 4, research: 14 }],
  ["mistral-small", { intelligence: 16, coding: 15, research: 16 }],

  // Kimi
  ["kimi-k2.5", { intelligence: 7, coding: 7, research: 5 }],
  ["kimi-k2", { intelligence: 8, coding: 8, research: 6 }],

  // GLM
  ["glm-4.7", { intelligence: 15, coding: 16, research: 15 }],
  ["glm-4.5", { intelligence: 19, coding: 20, research: 19 }],

  // Other known
  ["command-r+", { intelligence: 20, coding: 21, research: 16 }],
  ["command-a", { intelligence: 12, coding: 13, research: 11 }],
];

// Prefix matcher: longest prefix wins
function matchModel(
  modelId: string,
): { intelligence: number; coding: number; research: number } | null {
  const low = modelId.toLowerCase();
  let best: {
    rank: { intelligence: number; coding: number; research: number };
    length: number;
  } | null = null;
  for (const [prefix, rank] of MODEL_RANKS) {
    if (
      low.startsWith(prefix.toLowerCase()) &&
      (!best || prefix.length > best.length)
    ) {
      best = { rank, length: prefix.length };
    }
  }
  return best?.rank ?? null;
}

export function resolveRank(
  modelId: string,
  platform: string,
  mode: "intelligence" | "coding" | "research",
): number {
  const modelMatch = matchModel(modelId);
  if (modelMatch) return modelMatch[mode];
  const p = PROVIDER_DEFAULTS[platform];
  if (p) return p[mode];
  return 50;
}

export function getProviderDefaultRank(
  platform: string,
  mode: "intelligence" | "coding" | "research",
): number {
  const p = PROVIDER_DEFAULTS[platform];
  return p?.[mode] ?? 50;
}

/**
 * Build a COALESCE expression for SQL ORDER BY.
 * Precedence: explicit DB rank → model-name default → provider default → 50
 *
 * Usage: ORDER BY ${rankCoalesceExpr('m.coding_rank', 'coding')} ASC
 */
export function rankCoalesceExpr(
  column: string,
  mode: "intelligence" | "coding" | "research",
): string {
  const modelCases = MODEL_RANKS.map(
    ([prefix, ranks]) =>
      `WHEN LOWER(m.model_id) LIKE '${prefix.toLowerCase()}%' THEN ${ranks[mode]}`,
  ).join(" ");
  const providerCases = Object.entries(PROVIDER_DEFAULTS)
    .map(([platform, ranks]) => `WHEN '${platform}' THEN ${ranks[mode]}`)
    .join(" ");
  return `COALESCE(${column}, CASE ${modelCases === "" ? "" : `WHEN ${modelCases} `}ELSE CASE m.platform ${providerCases} ELSE 50 END END)`;
}
