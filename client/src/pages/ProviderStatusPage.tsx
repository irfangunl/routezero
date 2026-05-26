import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Gemini",
  groq: "Groq",
  cerebras: "Cerebras",
  sambanova: "SambaNova",
  nvidia: "NVIDIA NIM",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  github: "GitHub Models",
  cohere: "Cohere",
  cloudflare: "Cloudflare",
  zhipu: "Z.ai (Zhipu)",
  ollama: "Ollama Cloud",
  kilo: "Kilo Gateway",
  pollinations: "Pollinations",
  llm7: "LLM7",
  huggingface: "HuggingFace",
  opencode: "OpenCode",
};

export default function ProviderStatusPage() {
  const queryClient = useQueryClient();

  const { data: health } = useQuery<any>({
    queryKey: ["health"],
    queryFn: () => apiFetch("/api/health"),
    refetchInterval: 15000,
  });

  const { data: limits = [] } = useQuery<any[]>({
    queryKey: ["rate-limits"],
    queryFn: () => apiFetch("/api/rate-limits"),
    refetchInterval: 15000,
  });

  const checkAll = useMutation({
    mutationFn: () => apiFetch("/api/health/check-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["rate-limits"] });
    },
  });

  const platforms = health?.platforms ?? [];
  const limitMap = new Map(limits.map((l) => [l.platform, l]));

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Provider Status</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Live health and rate limit status for all providers.
          </p>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => checkAll.mutate()}
          disabled={checkAll.isPending}
        >
          <RefreshCw size={12} className="mr-1" />{" "}
          {checkAll.isPending ? "Checking…" : "Check all"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map((p: any) => {
          const l = limitMap.get(p.platform);
          const bestModel = l?.models?.[0];
          const rpmPct = bestModel?.usage?.rpm?.limit
            ? Math.min(
                100,
                (bestModel.usage.rpm.used / bestModel.usage.rpm.limit) * 100,
              )
            : 0;
          const onCooldown = bestModel?.onCooldown ?? false;

          const healthy = p.healthyKeys;
          const total = p.totalKeys;
          const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;

          return (
            <div key={p.platform} className="border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">
                  {PLATFORM_LABELS[p.platform] ?? p.platform}
                </h3>
                <span
                  className={`text-xs font-medium ${
                    pct === 100
                      ? "text-green"
                      : pct > 0
                        ? "text-amber"
                        : "text-red"
                  }`}
                >
                  {healthy}/{total} healthy
                </span>
              </div>
              <div className="h-1.5 bg-muted-bg/50 mb-2">
                <div
                  className={`h-full ${pct === 100 ? "bg-green" : pct > 0 ? "bg-amber" : "bg-red"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="space-y-0.5 text-xs text-muted-fg">
                {rpmPct > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0">RPM</span>
                    <div className="flex-1 h-1.5 bg-muted-bg/50">
                      <div
                        className={`h-full ${rpmPct > 80 ? "bg-amber" : "bg-accent/40"}`}
                        style={{ width: `${rpmPct}%` }}
                      />
                    </div>
                    <span className="tabular-nums w-16 text-right">
                      {bestModel.usage.rpm.used}/
                      {bestModel.usage.rpm.limit ?? "∞"}
                    </span>
                  </div>
                )}
                {onCooldown && (
                  <span className="text-amber font-medium">
                    ⚠ Cooldown active
                  </span>
                )}
                {!p.hasProvider && (
                  <span className="text-red">No provider adapter</span>
                )}
                {total === 0 && (
                  <span className="text-muted-fg">No keys configured</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
