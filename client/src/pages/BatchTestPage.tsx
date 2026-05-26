import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2 } from "lucide-react";

interface TestResult {
  modelId: string;
  displayName: string;
  content: string | null;
  latencyMs: number;
  error?: string;
}

export default function BatchTestPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const { data: allModels = [] } = useQuery<any[]>({
    queryKey: ["models-catalog"],
    queryFn: () => apiFetch("/api/models"),
  });

  const autoModes = [
    { id: "auto", label: "Auto (General)" },
    { id: "auto:coding", label: "Auto (Coding)" },
    { id: "auto:researching", label: "Auto (Researching)" },
  ];

  const modelOptions = allModels.filter(
    (m: any) => m.enabled && m.keyCount > 0,
  );

  function toggleModel(id: string) {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function runBatch() {
    if (!prompt || selectedModels.length === 0) return;
    setRunning(true);
    setResults([]);

    const allResults: TestResult[] = [];
    for (const modelId of selectedModels) {
      const model = allModels.find(
        (m: any) => m.modelId === modelId || m.id.toString() === modelId,
      );
      const start = Date.now();
      try {
        const res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 512,
          }),
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: { message: res.statusText } }));
          allResults.push({
            modelId,
            displayName: model?.displayName ?? modelId,
            content: null,
            latencyMs,
            error: err.error?.message ?? `HTTP ${res.status}`,
          });
        } else {
          const data = await res.json();
          allResults.push({
            modelId,
            displayName: model?.displayName ?? modelId,
            content: data.choices?.[0]?.message?.content ?? "(empty response)",
            latencyMs,
          });
        }
      } catch (err: any) {
        allResults.push({
          modelId,
          displayName: model?.displayName ?? modelId,
          content: null,
          latencyMs: Date.now() - start,
          error: err.message,
        });
      }
      setResults([...allResults]);
    }
    setRunning(false);
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Batch Test</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Send the same prompt to multiple models and compare responses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: model selection */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-fg mb-2">
            Models ({selectedModels.length})
          </h2>
          <div className="border border-border max-h-[400px] overflow-y-auto">
            {autoModes.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border hover:bg-surface-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(m.id)}
                  onChange={() => toggleModel(m.id)}
                  className="accent-fg"
                />
                <span className="font-medium">{m.label}</span>
              </label>
            ))}
            <div className="text-xs text-muted-fg px-3 py-1 border-b border-border">
              ─ Models ─
            </div>
            {modelOptions.map((m: any) => (
              <label
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border hover:bg-surface-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(m.modelId)}
                  onChange={() => toggleModel(m.modelId)}
                  className="accent-fg shrink-0"
                />
                <span className="truncate">{m.displayName}</span>
                <span className="text-muted-fg shrink-0 ml-auto">
                  {m.platform}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Main: prompt + results */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <label className="text-xs text-muted-fg block mb-1">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a test prompt…"
              rows={4}
            />
          </div>

          <Button
            onClick={runBatch}
            disabled={!prompt || selectedModels.length === 0 || running}
            size="sm"
          >
            {running ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : (
              <Play size={14} className="mr-1" />
            )}
            {running
              ? `Running (${results.length}/${selectedModels.length})…`
              : `Run on ${selectedModels.length} models`}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="border border-border">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
                    <span className="text-sm font-medium">{r.displayName}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-fg">
                      <span className="tabular-nums">{r.latencyMs} ms</span>
                      {r.error && <span className="text-red">Error</span>}
                    </div>
                  </div>
                  <div className="p-3">
                    {r.error ? (
                      <p className="text-xs text-red font-mono">{r.error}</p>
                    ) : (
                      <pre className="text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {r.content}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
