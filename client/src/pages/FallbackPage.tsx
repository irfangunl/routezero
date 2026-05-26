import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface FallbackEntry {
  modelDbId: number;
  priority: number;
  effectivePriority: number;
  penalty: number;
  rateLimitHits: number;
  enabled: boolean;
  platform: string;
  modelId: string;
  displayName: string;
  intelligenceRank: number;
  speedRank: number;
  sizeLabel: string;
  rpmLimit: number | null;
  rpdLimit: number | null;
  monthlyTokenBudget: string;
  keyCount: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface TokenUsageData {
  totalBudget: number;
  totalUsed: number;
  models: { displayName: string; platform: string; budget: number }[];
}

const platformColors: Record<string, string> = {
  google: "#4285f4",
  groq: "#f55036",
  cerebras: "#8b5cf6",
  sambanova: "#14b8a6",
  nvidia: "#76b900",
  mistral: "#f59e0b",
  openrouter: "#ec4899",
  github: "#6e7b8b",
  cohere: "#d946ef",
  cloudflare: "#f38020",
  zhipu: "#06b6d4",
  ollama: "#000000",
  kilo: "#7c3aed",
  pollinations: "#a855f7",
  llm7: "#0ea5e9",
  huggingface: "#ff9d00",
  opencode: "#10b981",
};

function TokenUsageBar({ data }: { data: TokenUsageData }) {
  const { totalBudget, totalUsed, models } = data;
  const remaining = Math.max(0, totalBudget - totalUsed);
  const remainingPct =
    totalBudget > 0 ? Math.round((remaining / totalBudget) * 100) : 0;

  const modelsWithWidth = models.map((m) => ({
    ...m,
    remainingTokens: totalBudget > 0 ? (m.budget / totalBudget) * remaining : 0,
    widthPct:
      totalBudget > 0
        ? (m.budget / totalBudget) * (remaining / totalBudget) * 100
        : 0,
  }));
  const usedPct = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium tracking-wider uppercase text-muted-fg">
          Token budget
        </span>
        <span className="text-xs tabular-nums text-muted-fg">
          <span className="text-fg font-medium">{formatTokens(remaining)}</span>{" "}
          remaining
          <span className="mx-1">·</span>
          {remainingPct}% of {formatTokens(totalBudget)}
        </span>
      </div>
      <div className="flex h-2 border border-border">
        {modelsWithWidth.map((m, i) => (
          <div
            key={i}
            title={`${m.displayName} — ${formatTokens(m.remainingTokens)} left`}
            style={{
              width: `${m.widthPct}%`,
              backgroundColor: platformColors[m.platform] ?? "#94a3b8",
            }}
          />
        ))}
        {totalUsed > 0 && (
          <div
            title={`Used ${formatTokens(totalUsed)}`}
            className="bg-muted-fg/20"
            style={{ width: `${usedPct}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        {modelsWithWidth.map((m, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className="size-2"
              style={{
                backgroundColor: platformColors[m.platform] ?? "#94a3b8",
              }}
            />
            <span className="text-muted-fg">{m.displayName}</span>
            <span className="font-mono">{formatTokens(m.remainingTokens)}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function SortableModelRow({
  entry,
  index,
  onToggle,
}: {
  entry: FallbackEntry;
  index: number;
  onToggle: (modelDbId: number, enabled: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.modelDbId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 ${
        isDragging ? "opacity-50" : ""
      } ${entry.enabled ? "" : "opacity-50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-fg/40 hover:text-fg transition-colors shrink-0"
        aria-label="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      <span className="text-xs font-mono text-muted-fg w-4 tabular-nums shrink-0">
        {index + 1}
      </span>
      <span className="text-sm font-medium truncate">{entry.displayName}</span>
      <span className="text-xs text-muted-fg shrink-0">{entry.platform}</span>
      {entry.penalty > 0 && (
        <span className="text-xs text-amber px-1 border border-amber/30 bg-amber/10 shrink-0">
          -{entry.penalty}
        </span>
      )}
      <div className="flex-1" />
      <div className="hidden sm:flex gap-2 mr-2 text-xs text-muted-fg tabular-nums">
        <span>#{entry.intelligenceRank}</span>
        <span>#{entry.speedRank}</span>
      </div>
      <Switch
        checked={entry.enabled}
        onCheckedChange={(checked) => onToggle(entry.modelDbId, checked)}
      />
    </div>
  );
}

export default function FallbackPage() {
  const queryClient = useQueryClient();
  const [localEntries, setLocalEntries] = useState<FallbackEntry[] | null>(
    null,
  );

  const { data: entries = [], isLoading } = useQuery<FallbackEntry[]>({
    queryKey: ["fallback"],
    queryFn: () => apiFetch("/api/fallback"),
  });

  const { data: tokenUsage } = useQuery<TokenUsageData>({
    queryKey: ["fallback", "token-usage"],
    queryFn: () => apiFetch("/api/fallback/token-usage"),
  });

  const saveMutation = useMutation({
    mutationFn: (
      data: { modelDbId: number; priority: number; enabled: boolean }[],
    ) =>
      apiFetch("/api/fallback", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback"] });
      setLocalEntries(null);
    },
  });

  const sortMutation = useMutation({
    mutationFn: (preset: string) =>
      apiFetch(`/api/fallback/sort/${preset}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback"] });
      setLocalEntries(null);
    },
  });

  const allEntries = localEntries ?? entries;
  const displayEntries = allEntries.filter((e) => e.keyCount > 0);
  const unconfiguredPlatforms = [
    ...new Set(
      allEntries.filter((e) => e.keyCount === 0).map((e) => e.platform),
    ),
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayEntries.findIndex((e) => e.modelDbId === active.id);
    const newIndex = displayEntries.findIndex((e) => e.modelDbId === over.id);
    const reorderedVisible = arrayMove(displayEntries, oldIndex, newIndex);
    const unconfigured = allEntries.filter((e) => e.keyCount === 0);
    const merged = [
      ...reorderedVisible.map((e, i) => ({ ...e, priority: i + 1 })),
      ...unconfigured.map((e, i) => ({
        ...e,
        priority: reorderedVisible.length + i + 1,
      })),
    ];
    setLocalEntries(merged);
  }

  function handleToggle(modelDbId: number, enabled: boolean) {
    const updated = allEntries.map((e) =>
      e.modelDbId === modelDbId ? { ...e, enabled } : e,
    );
    setLocalEntries(updated);
  }

  function handleSave() {
    if (!localEntries) return;
    saveMutation.mutate(
      allEntries.map((e) => ({
        modelDbId: e.modelDbId,
        priority: e.priority,
        enabled: e.enabled,
      })),
    );
  }

  const hasChanges = localEntries !== null;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Fallback chain</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Drag to reorder. Requests try models top-to-bottom.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="xs"
            onClick={() => sortMutation.mutate("intelligence")}
            disabled={sortMutation.isPending}
          >
            Intelligence
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => sortMutation.mutate("speed")}
            disabled={sortMutation.isPending}
          >
            Speed
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => sortMutation.mutate("budget")}
            disabled={sortMutation.isPending}
          >
            Budget
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => sortMutation.mutate("coding")}
            disabled={sortMutation.isPending}
          >
            Coding
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => sortMutation.mutate("researching")}
            disabled={sortMutation.isPending}
          >
            Researching
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {tokenUsage && tokenUsage.totalBudget > 0 && (
          <TokenUsageBar data={tokenUsage} />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-fg">Loading…</p>
        ) : displayEntries.length === 0 ? (
          <div className="border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-fg">
              No models available. Add API keys on the{" "}
              <a href="/keys" className="underline text-fg">
                Keys page
              </a>{" "}
              first.
            </p>
          </div>
        ) : (
          <>
            <div className="border border-border divide-y divide-border">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayEntries.map((e) => e.modelDbId)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayEntries.map((entry, index) => (
                    <SortableModelRow
                      key={entry.modelDbId}
                      entry={entry}
                      index={index}
                      onToggle={handleToggle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {hasChanges && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalEntries(null)}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving…" : "Save order"}
                </Button>
              </div>
            )}

            {unconfiguredPlatforms.length > 0 && (
              <p className="text-xs text-muted-fg">
                Hidden (no keys): {unconfiguredPlatforms.join(", ")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
