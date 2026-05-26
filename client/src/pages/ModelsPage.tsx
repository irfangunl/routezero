import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PLATFORM_NAMES: Record<string, string> = {
  google: "Google",
  groq: "Groq",
  cerebras: "Cerebras",
  sambanova: "SambaNova",
  nvidia: "NVIDIA",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  github: "GitHub",
  cohere: "Cohere",
  cloudflare: "Cloudflare",
  zhipu: "Z.ai",
  ollama: "Ollama",
  kilo: "Kilo",
  pollinations: "Pollinations",
  llm7: "LLM7",
  huggingface: "HF",
  opencode: "OpenCode",
};

const AUTO_MODELS = [
  { id: "auto", label: "Auto (General)", desc: "Best all-around model" },
  { id: "auto:coding", label: "Auto (Coding)", desc: "Best for coding tasks" },
  {
    id: "auto:researching",
    label: "Auto (Research)",
    desc: "Best for research/reasoning",
  },
];

type SortKey =
  | "intelligenceRank"
  | "codingRank"
  | "researchRank"
  | "speedRank"
  | "contextWindow";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="text-xs font-mono px-1.5 py-0.5 rounded border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
      title="Copy model ID"
    >
      {copied ? "Copied!" : text}
    </button>
  );
}

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState<SortKey>("intelligenceRank");

  const { data: models = [] } = useQuery<any[]>({
    queryKey: ["models-catalog"],
    queryFn: () => apiFetch("/api/models"),
  });

  const platforms = [...new Set(models.map((m) => m.platform))].sort();

  const filtered = models
    .filter((m) => !platform || m.platform === platform)
    .filter(
      (m) =>
        !search ||
        m.displayName.toLowerCase().includes(search.toLowerCase()) ||
        m.modelId.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (a[sort] ?? 9999) - (b[sort] ?? 9999));

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Model Catalog</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            All {models.length} catalog models with benchmark ranks and
            capabilities. Click a model ID to copy.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px] font-mono text-xs"
        />
        <Select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-[140px]"
        >
          <option value="">All providers</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_NAMES[p] ?? p}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-[160px]"
        >
          <option value="intelligenceRank">Sort: Intelligence</option>
          <option value="codingRank">Sort: Coding</option>
          <option value="researchRank">Sort: Research</option>
          <option value="speedRank">Sort: Speed</option>
          <option value="contextWindow">Sort: Context</option>
        </Select>
      </div>

      {/* Auto-mode models */}
      <div className="mb-3 p-3 border border-border rounded bg-surface">
        <p className="text-xs font-medium text-muted-fg mb-2">Auto modes</p>
        <div className="flex flex-wrap gap-2">
          {AUTO_MODELS.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <CopyBtn text={a.id} />
              <span className="text-xs text-muted-fg">{a.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-h-[calc(100vh-300px)] overflow-y-auto border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-bg z-10">
            <TableRow>
              <TableHead className="pl-1">Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model ID</TableHead>
              <TableHead className="text-right">Intel</TableHead>
              <TableHead className="text-right">Code</TableHead>
              <TableHead className="text-right">Research</TableHead>
              <TableHead className="text-right">Speed</TableHead>
              <TableHead className="text-right">Context</TableHead>
              <TableHead className="text-right">RPM</TableHead>
              <TableHead className="text-right pr-1">Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="pl-1 text-sm font-medium">
                  {m.displayName}
                </TableCell>
                <TableCell className="text-xs text-muted-fg">
                  {PLATFORM_NAMES[m.platform] ?? m.platform}
                </TableCell>
                <TableCell>
                  <CopyBtn text={m.modelId} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.intelligenceRank ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.codingRank ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.researchRank ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.speedRank}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.contextWindow
                    ? `${(m.contextWindow / 1000).toFixed(0)}K`
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {m.rpmLimit ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs pr-1">
                  {m.monthlyTokenBudget ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
