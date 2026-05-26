import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";
import type { ApiKey, Platform } from "../../../shared/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "google", label: "Google AI Studio" },
  { value: "groq", label: "Groq" },
  { value: "cerebras", label: "Cerebras" },
  { value: "sambanova", label: "SambaNova" },
  { value: "nvidia", label: "NVIDIA NIM" },
  { value: "mistral", label: "Mistral" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "github", label: "GitHub Models" },
  { value: "cohere", label: "Cohere" },
  { value: "cloudflare", label: "Cloudflare Workers AI" },
  { value: "zhipu", label: "Zhipu AI (Z.ai)" },
  { value: "ollama", label: "Ollama Cloud" },
  { value: "kilo", label: "Kilo Gateway (anon ok)" },
  { value: "pollinations", label: "Pollinations (anon ok)" },
  { value: "llm7", label: "LLM7 (anon ok)" },
  { value: "huggingface", label: "HuggingFace Router" },
  { value: "opencode", label: "OpenCode Zen (free models)" },
];

const statusDot: Record<string, string> = {
  healthy: "bg-green",
  rate_limited: "bg-amber",
  invalid: "bg-red",
  error: "bg-red",
  unknown: "bg-muted-fg/40",
};

const statusLabel: Record<string, string> = {
  healthy: "healthy",
  rate_limited: "rate-limited",
  invalid: "invalid",
  error: "error",
  unknown: "unchecked",
};

interface HealthData {
  keys: {
    id: number;
    platform: string;
    status: string;
    lastCheckedAt: string | null;
  }[];
}

function UnifiedKeySection() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data } = useQuery<{ apiKey: string }>({
    queryKey: ["unified-key"],
    queryFn: () => apiFetch("/api/settings/api-key"),
  });

  const regenerate = useMutation({
    mutationFn: () =>
      apiFetch("/api/settings/api-key/regenerate", { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["unified-key"] }),
  });

  const apiKey = data?.apiKey ?? "";
  const masked = apiKey ? apiKey.slice(0, 13) + "•".repeat(32) : "…";
  const baseUrl = import.meta.env.DEV
    ? `http://${window.location.hostname}:${__SERVER_PORT__}/v1`
    : `${window.location.origin}/v1`;

  function copy() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="border-b border-border pb-4 mb-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-sm font-medium">Unified API key</h2>
          <p className="text-xs text-muted-fg mt-0.5">
            Use as OpenAI <code className="font-mono">api_key</code> to
            authenticate requests.
          </p>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
        >
          Regenerate
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs bg-muted-bg px-2 py-1.5 select-all truncate tabular-nums">
          {showKey ? apiKey : masked}
        </code>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowKey(!showKey)}
        >
          {showKey ? "Hide" : "Show"}
        </Button>
        <Button variant="outline" size="xs" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
        <span className="text-muted-fg">Base URL</span>
        <code className="font-mono">{baseUrl}</code>
        <span className="text-muted-fg">Endpoint</span>
        <code className="font-mono">/v1/chat/completions</code>
      </div>
    </section>
  );
}

function PlatformGroup({
  label,
  keys,
  platform,
  healthKeyMap,
  onToggle,
  onCheck,
  onDelete,
}: {
  label: string;
  keys: ApiKey[];
  platform: string;
  healthKeyMap: Map<number, { status: string; lastCheckedAt: string | null }>;
  onToggle: (platform: string, enabled: boolean) => void;
  onCheck: (keyId: number) => void;
  onDelete: (keyId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allEnabled = keys.some((k) => k.enabled);

  return (
    <div className="border border-border">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-hover transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-muted-fg shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-fg shrink-0" />
        )}
        <span className="text-sm font-medium flex-1">{label}</span>
        <span className="text-xs text-muted-fg tabular-nums mr-2">
          {keys.length}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={allEnabled}
            onCheckedChange={(checked) => onToggle(platform, checked)}
          />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border">
          {keys.map((k) => {
            const h = healthKeyMap.get(k.id);
            const status = h?.status ?? k.status;
            const lastChecked = h?.lastCheckedAt;
            return (
              <div
                key={k.id}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border last:border-0 hover:bg-surface-hover/50 transition-colors text-xs"
              >
                <span
                  className={`size-1.5 shrink-0 ${statusDot[status] ?? statusDot.unknown}`}
                />
                <code className="font-mono shrink-0">{k.maskedKey}</code>
                {k.label && (
                  <span className="text-muted-fg truncate">{k.label}</span>
                )}
                <span className="text-muted-fg">
                  {statusLabel[status] ?? status}
                </span>
                {lastChecked && (
                  <span className="text-muted-fg tabular-nums">
                    {new Date(lastChecked).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => onCheck(k.id)}
                  className="text-muted-fg hover:text-fg transition-colors p-0.5"
                  title="Check key"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => onDelete(k.id)}
                  className="text-muted-fg hover:text-red transition-colors p-0.5"
                  title="Remove key"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KeysPage() {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [label, setLabel] = useState("");

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["keys"],
    queryFn: () => apiFetch("/api/keys"),
  });

  const { data: healthData } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: () => apiFetch("/api/health"),
    refetchInterval: 30000,
  });

  const addKey = useMutation({
    mutationFn: (body: { platform: string; key: string; label?: string }) =>
      apiFetch("/api/keys", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["fallback"] });
      setPlatform("");
      setApiKey("");
      setAccountId("");
      setLabel("");
    },
  });

  const deleteKey = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
    },
  });

  const checkAll = useMutation({
    mutationFn: () => apiFetch("/api/health/check-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    },
  });

  const checkKey = useMutation({
    mutationFn: (keyId: number) =>
      apiFetch(`/api/health/check/${keyId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    },
  });

  const togglePlatform = useMutation({
    mutationFn: ({
      platform,
      enabled,
    }: {
      platform: string;
      enabled: boolean;
    }) =>
      apiFetch(`/api/keys/platform/${platform}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["fallback"] });
    },
  });

  const needsAccountId = platform === "cloudflare";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !apiKey) return;
    if (needsAccountId && !accountId) return;
    const key = needsAccountId ? `${accountId}:${apiKey}` : apiKey;
    addKey.mutate({ platform, key, label: label || undefined });
  };

  async function handleExport() {
    try {
      const data = await apiFetch("/api/settings/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `routezero-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  const [importError, setImportError] = useState("");
  const importConfig = useMutation({
    mutationFn: (data: unknown) =>
      apiFetch("/api/settings/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["fallback"] });
      setImportError("");
    },
    onError: (err: Error) => setImportError(err.message),
  });

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importConfig.mutate(JSON.parse(reader.result as string));
      } catch {
        setImportError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const healthKeyMap = new Map<
    number,
    { status: string; lastCheckedAt: string | null }
  >();
  for (const k of healthData?.keys ?? []) healthKeyMap.set(k.id, k);

  const grouped = PLATFORMS.map((p) => ({
    ...p,
    keys: keys.filter((k) => k.platform === p.value),
  })).filter((p) => p.keys.length > 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Keys</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Provider credentials and the unified API key.
          </p>
        </div>
        {keys.length > 0 && (
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="xs" onClick={handleExport}>
              <Download size={12} className="mr-1" /> Export
            </Button>
            <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-border hover:bg-surface-hover transition-colors">
              <Upload size={12} /> Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <Button
              variant="outline"
              size="xs"
              onClick={() => checkAll.mutate()}
              disabled={checkAll.isPending}
            >
              {checkAll.isPending ? "Checking…" : "Check all"}
            </Button>
          </div>
        )}
        {importError && <p className="text-red text-xs mt-1">{importError}</p>}
      </div>

      <div className="space-y-6">
        <UnifiedKeySection />

        <section>
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-fg mb-2">
            Add provider key
          </h2>
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <Label className="text-xs text-muted-fg">Platform</Label>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-[200px]"
              >
                <option value="" disabled>
                  Select provider
                </option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            {needsAccountId && (
              <div>
                <Label className="text-xs text-muted-fg">Account ID</Label>
                <Input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="a1b2c3d4…"
                  className="font-mono w-[180px]"
                />
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-fg">
                {needsAccountId ? "API token" : "API key"}
              </Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={needsAccountId ? "Bearer token" : "paste key here"}
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-fg">Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="optional"
                className="w-[120px]"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={
                !platform ||
                !apiKey ||
                (needsAccountId && !accountId) ||
                addKey.isPending
              }
            >
              {addKey.isPending ? "Adding…" : "Add"}
            </Button>
          </form>
          {addKey.isError && (
            <p className="text-red text-xs mt-1">
              {(addKey.error as Error).message}
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-fg mb-2">
            Configured providers
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-fg">Loading…</p>
          ) : keys.length === 0 ? (
            <div className="border-2 border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-fg">
                No provider keys yet. Add one above to start routing.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {grouped.map((group) => (
                <PlatformGroup
                  key={group.value}
                  label={group.label}
                  keys={group.keys}
                  platform={group.value}
                  healthKeyMap={healthKeyMap}
                  onToggle={(p, enabled) =>
                    togglePlatform.mutate({ platform: p, enabled })
                  }
                  onCheck={(keyId) => checkKey.mutate(keyId)}
                  onDelete={(keyId) => deleteKey.mutate(keyId)}
                />
              ))}
            </div>
          )}
        </section>

        {keys.length > 0 && <RateLimitStatus />}
      </div>
    </div>
  );
}

function RateLimitStatus() {
  const { data: limits = [] } = useQuery<any[]>({
    queryKey: ["rate-limits"],
    queryFn: () => apiFetch("/api/rate-limits"),
    refetchInterval: 15000,
  });

  if (limits.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-medium tracking-wider uppercase text-muted-fg mb-2">
        Rate limit usage
      </h2>
      <div className="space-y-1">
        {limits.map((entry) => {
          const best = entry.models?.[0];
          if (!best) return null;
          const rpmUsed = best.usage?.rpm?.used ?? 0;
          const rpmLimit = best.usage?.rpm?.limit;
          const pct = rpmLimit ? Math.min(100, (rpmUsed / rpmLimit) * 100) : 0;
          return (
            <div
              key={entry.keyId}
              className="flex items-center gap-2 px-3 py-1.5 border border-border text-xs"
            >
              <span className="w-16 truncate text-muted-fg">
                {entry.platform}
              </span>
              <div className="flex-1 h-2 bg-muted-bg/50">
                <div
                  className={`h-full transition-all duration-500 ${
                    pct > 80
                      ? "bg-amber"
                      : pct > 50
                        ? "bg-accent/60"
                        : "bg-accent/30"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="tabular-nums w-20 text-right text-muted-fg">
                {rpmUsed}
                {rpmLimit != null ? ` / ${rpmLimit}` : ""} RPM
              </span>
              {best.onCooldown && (
                <span className="text-amber font-medium">cooldown</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
