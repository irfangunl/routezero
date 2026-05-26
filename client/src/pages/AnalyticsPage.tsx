import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TimeRange = "24h" | "7d" | "30d" | "custom";

function formatTokens(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const axisStyle = { fontSize: 11, fill: "var(--color-muted-fg)" } as const;
const gridStyle = "var(--color-border)";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function queryString(
  range: TimeRange,
  customStart: string,
  customEnd: string,
): string {
  if (range === "custom" && customStart) {
    let qs = `?start=${customStart}`;
    if (customEnd) qs += `&end=${customEnd}`;
    return qs;
  }
  return `?range=${range}`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const qs = queryString(range, customStart, customEnd);

  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary", range, customStart, customEnd],
    queryFn: () => apiFetch<any>(`/api/analytics/summary${qs}`),
  });

  const { data: byPlatform = [] } = useQuery({
    queryKey: ["analytics", "by-platform", range, customStart, customEnd],
    queryFn: () => apiFetch<any[]>(`/api/analytics/by-platform${qs}`),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["analytics", "timeline", range, customStart, customEnd],
    queryFn: () => apiFetch<any[]>(`/api/analytics/timeline${qs}`),
  });

  const { data: byModel = [] } = useQuery({
    queryKey: ["analytics", "by-model", range, customStart, customEnd],
    queryFn: () => apiFetch<any[]>(`/api/analytics/by-model${qs}`),
  });

  const { data: errors = [] } = useQuery({
    queryKey: ["analytics", "errors", range, customStart, customEnd],
    queryFn: () => apiFetch<any[]>(`/api/analytics/errors${qs}`),
  });

  const { data: errorDist } = useQuery({
    queryKey: [
      "analytics",
      "error-distribution",
      range,
      customStart,
      customEnd,
    ],
    queryFn: () =>
      apiFetch<{ byCategory: any[]; byPlatform: any[]; detailed: any[] }>(
        `/api/analytics/error-distribution${qs}`,
      ),
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Analytics</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Volume, latency, token usage, failures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border">
            {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-1 text-xs transition-colors ${
                  range === r ? "bg-fg text-bg" : "text-muted-fg hover:text-fg"
                }`}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => setRange("custom")}
              className={`px-2 py-1 text-xs transition-colors ${
                range === "custom"
                  ? "bg-fg text-bg"
                  : "text-muted-fg hover:text-fg"
              }`}
            >
              Custom
            </button>
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent border border-border px-1 py-1 font-mono text-xs"
              />
              <span className="text-muted-fg">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent border border-border px-1 py-1 font-mono text-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Stats row */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <div>
            <span className="text-muted-fg text-xs block">Requests</span>
            <span className="font-semibold tabular-nums">
              {summary?.totalRequests ?? 0}
            </span>
          </div>
          <div>
            <span className="text-muted-fg text-xs block">Success rate</span>
            <span className="font-semibold tabular-nums">
              {summary?.successRate ?? 0}%
            </span>
          </div>
          <div>
            <span className="text-muted-fg text-xs block">In tokens</span>
            <span className="font-semibold tabular-nums">
              {formatTokens(summary?.totalInputTokens)}
            </span>
          </div>
          <div>
            <span className="text-muted-fg text-xs block">Out tokens</span>
            <span className="font-semibold tabular-nums">
              {formatTokens(summary?.totalOutputTokens)}
            </span>
          </div>
          <div>
            <span className="text-muted-fg text-xs block">Avg latency</span>
            <span className="font-semibold tabular-nums">
              {summary?.avgLatencyMs ?? 0} ms
            </span>
          </div>
          <div>
            <span className="text-muted-fg text-xs block">Est. cost</span>
            <span className="font-semibold tabular-nums">
              ${summary?.estimatedCostSavings ?? "0.00"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Panel title="Requests by provider">
            {byPlatform.length === 0 ? (
              <p className="text-sm text-muted-fg text-center py-6">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={byPlatform}
                  margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke={gridStyle} />
                  <XAxis
                    dataKey="platform"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: gridStyle }}
                  />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 0,
                      fontSize: 12,
                      boxShadow: "none",
                    }}
                  />
                  <Bar
                    dataKey="requests"
                    fill="var(--color-accent)"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Avg latency by provider">
            {byPlatform.length === 0 ? (
              <p className="text-sm text-muted-fg text-center py-6">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={byPlatform}
                  margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke={gridStyle} />
                  <XAxis
                    dataKey="platform"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: gridStyle }}
                  />
                  <YAxis
                    unit="ms"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="avgLatencyMs"
                    name="Latency (ms)"
                    fill="var(--color-muted-fg)"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <div className="lg:col-span-2">
            <Panel title="Requests over time">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-fg text-center py-6">
                  No data yet
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={timeline}
                    margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke={gridStyle} />
                    <XAxis
                      dataKey="timestamp"
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={{ stroke: gridStyle }}
                    />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 0,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey="successCount"
                      name="Success"
                      stroke="var(--color-accent)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="failureCount"
                      name="Failures"
                      stroke="var(--color-red)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <div className="lg:col-span-2">
            <Panel title="Per-model breakdown">
              {byModel.length === 0 ? (
                <p className="text-sm text-muted-fg text-center py-6">
                  No data yet
                </p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-1">Model</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                        <TableHead className="text-right">Success</TableHead>
                        <TableHead className="text-right">Latency</TableHead>
                        <TableHead className="text-right">In</TableHead>
                        <TableHead className="text-right">Out</TableHead>
                        <TableHead className="text-right pr-1">
                          Est. cost
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byModel.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="pl-1 text-sm font-medium">
                            {m.displayName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-fg">
                            {m.platform}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.requests}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.successRate}%
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.avgLatencyMs} ms
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatTokens(m.totalInputTokens)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatTokens(m.totalOutputTokens)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums pr-1">
                            ${m.estimatedCost?.toFixed(2) ?? "0.00"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Errors by provider">
            {!errorDist?.byPlatform?.length ? (
              <p className="text-sm text-muted-fg text-center py-6">
                No errors
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={errorDist.byPlatform}
                  margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke={gridStyle} />
                  <XAxis
                    dataKey="platform"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: gridStyle }}
                  />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-red)"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Recent errors">
            {errors.length === 0 ? (
              <p className="text-sm text-muted-fg text-center py-6">
                No errors
              </p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-1">Provider</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-right pr-1">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.slice(0, 20).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="pl-1 text-xs">
                          {e.platform}
                        </TableCell>
                        <TableCell
                          className="text-xs max-w-[200px] truncate"
                          title={e.error}
                        >
                          {e.error}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-fg tabular-nums pr-1">
                          {new Date(e.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
