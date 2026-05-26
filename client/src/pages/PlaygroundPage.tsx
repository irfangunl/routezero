import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface FallbackEntry {
  modelDbId: number;
  priority: number;
  enabled: boolean;
  platform: string;
  modelId: string;
  displayName: string;
  sizeLabel: string;
  keyCount: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  meta?: {
    platform?: string;
    model?: string;
    latency?: number;
    fallbackAttempts?: number;
  };
}

const SUGGESTIONS = [
  "What is the capital of France?",
  "Explain quantum computing in 2 sentences",
  "Write a haiku about programming",
  "What is the meaning of life?",
];

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: keyData } = useQuery<{ apiKey: string }>({
    queryKey: ["unified-key"],
    queryFn: () => apiFetch("/api/settings/api-key"),
  });

  const { data: fallbackEntries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ["fallback"],
    queryFn: () => apiFetch("/api/fallback"),
  });

  const availableModels = fallbackEntries.filter(
    (e) => e.keyCount > 0 && e.enabled,
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (keyData?.apiKey)
        headers["Authorization"] = `Bearer ${keyData.apiKey}`;

      const body: any = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      body.model = selectedModel;

      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const start = Date.now();
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const latency = Date.now() - start;
      const routedVia = res.headers.get("X-Routed-Via");
      const fallbackAttempts = res.headers.get("X-Fallback-Attempts");

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `Error: ${err.error?.message ?? "Unknown error"}`,
          },
        ]);
        return;
      }

      const data = await res.json();
      const content =
        data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2);
      const via =
        data._routed_via ??
        (routedVia
          ? {
              platform: routedVia.split("/")[0],
              model: routedVia.split("/").slice(1).join("/"),
            }
          : undefined);

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content,
          meta: {
            platform: via?.platform,
            model: via?.model,
            latency,
            fallbackAttempts: fallbackAttempts
              ? parseInt(fallbackAttempts)
              : undefined,
          },
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b border-border">
        <Select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-[220px] text-sm"
        >
          <option value="auto">Auto (General)</option>
          <option value="auto:coding">Auto (Coding)</option>
          <option value="auto:researching">Auto (Researching)</option>
          {availableModels.map((m) => (
            <option key={m.modelDbId} value={m.modelId}>
              {m.displayName} — {m.platform}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        {messages.length > 0 && (
          <Button variant="outline" size="xs" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0 border border-border">
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-sm text-muted-fg mb-4">Try one of these:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-2.5 py-1.5 text-xs border border-border text-muted-fg hover:text-fg hover:border-border-strong transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "border-l-2 border-accent bg-accent/5"
                        : "bg-muted-bg"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.meta && (
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-fg tabular-nums border-t border-border pt-1">
                        {msg.meta.platform && <span>{msg.meta.platform}</span>}
                        {msg.meta.model && (
                          <span className="font-mono">· {msg.meta.model}</span>
                        )}
                        {msg.meta.latency != null && (
                          <span>· {msg.meta.latency} ms</span>
                        )}
                        {msg.meta.fallbackAttempts != null &&
                          msg.meta.fallbackAttempts > 0 && (
                            <span>
                              · {msg.meta.fallbackAttempts} fallback
                              {msg.meta.fallbackAttempts > 1 ? "s" : ""}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted-bg px-3 py-2">
                    <span className="inline-flex gap-0.5">
                      <span className="size-1.5 bg-accent animate-pulse" />
                      <span
                        className="size-1.5 bg-accent animate-pulse"
                        style={{ animationDelay: "200ms" }}
                      />
                      <span
                        className="size-1.5 bg-accent animate-pulse"
                        style={{ animationDelay: "400ms" }}
                      />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-2">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message… (Enter to send, Shift+Enter newline)"
              rows={1}
              className="flex-1 resize-none border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent min-h-[32px] max-h-[120px]"
              style={{ height: "auto", overflow: "hidden" }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              {loading ? "…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
