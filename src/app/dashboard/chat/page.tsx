"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Paywall } from "@/components/Paywall";
import { usePremium } from "@/components/PremiumGate";
import { trackChatMessage } from "@/lib/analytics";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Meter = { used: number; limit: number; remaining: number };

export default function ChatPage() {
  const { toolCalls } = usePremium();
  const [messages, setMessages] = useState<Message[]>([]);
  const [noWedding, setNoWedding] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meter, setMeter] = useState<Meter | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Hydrate the meter from the initial /api/subscription-status fetch
  // (via usePremium). Only shown when the tier actually has a cap —
  // trial/pro/beta/admin return limit=null and render no pill.
  useEffect(() => {
    if (toolCalls && toolCalls.limit !== null && toolCalls.remaining !== null) {
      setMeter({ used: toolCalls.used, limit: toolCalls.limit, remaining: toolCalls.remaining });
    } else {
      setMeter(null);
    }
  }, [toolCalls]);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then(setMessages)
      .catch((e) => console.error("[fetch] chat messages", e))
      .finally(() => setLoading(false));
  }, []);

  const prevCount = useRef(0);
  useEffect(() => {
    // Only auto-scroll when new messages are added (not on initial load)
    if (messages.length > prevCount.current && prevCount.current > 0) {
      messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCount.current = messages.length;
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Add empty assistant message for streaming
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (res.ok) {
        trackChatMessage();
        // Read the updated meter from response headers so the pill
        // reflects the tool calls just consumed.
        const limitHeader = res.headers.get("X-Tool-Calls-Limit");
        const usedHeader = res.headers.get("X-Tool-Calls-Used");
        const remainingHeader = res.headers.get("X-Tool-Calls-Remaining");
        if (limitHeader && limitHeader !== "-1" && usedHeader && remainingHeader) {
          setMeter({
            used: Number(usedHeader),
            limit: Number(limitHeader),
            remaining: Number(remainingHeader),
          });
        }
      }

      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        const isCap = body?.toolCallsLimit !== undefined;
        toast.error(
          isCap
            ? "You've used your free AI actions this month. Upgrade to Pro for unlimited chat."
            : "AI chat requires a paid plan.",
          {
            action: {
              label: "See pricing",
              onClick: () => { window.location.href = "/dashboard/pricing"; },
            },
          }
        );
        if (isCap && body?.toolCallsUsed !== undefined && body?.toolCallsLimit !== undefined) {
          setMeter({
            used: body.toolCallsUsed,
            limit: body.toolCallsLimit,
            remaining: Math.max(0, body.toolCallsLimit - body.toolCallsUsed),
          });
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setStreaming(false);
        return;
      }
      if (!res.ok) throw new Error();

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const current = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            )
          );
        }
      }
    } catch {
      toast.error("Couldn't reach Eydn. Check your connection and try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }

  if (loading) {
    return <SkeletonList count={3} />;
  }

  if (noWedding) return <NoWeddingState feature="AI Chat" />;

  return (
    <Paywall feature="Ask Eydn">
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <h1>Ask Eydn</h1>
        {meter && (
          <div
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              meter.remaining === 0
                ? "bg-plum/10 text-plum"
                : meter.remaining <= 2
                  ? "bg-amber-50 text-amber-700"
                  : "bg-lavender text-violet"
            }`}
            title={`${meter.used} of ${meter.limit} free AI actions used this month`}
          >
            {meter.remaining === 0
              ? "0 AI actions left"
              : `${meter.remaining} of ${meter.limit} AI actions left`}
          </div>
        )}
      </div>
      <p className="mt-1 text-[15px] text-muted flex-shrink-0">
        Your AI wedding planning assistant
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-[15px] font-semibold text-violet">E</span>
            </div>
            <div className="bg-lavender rounded-[16px] rounded-tl-sm px-4 py-3 max-w-lg">
              <p className="text-[15px] text-muted">
                Hey — I&apos;m Eydn. I have your full wedding details loaded:
                timeline, budget, vendors, guests, and everything from your
                planning guides. Ask me anything.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 items-start ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === "user" ? "bg-lavender" : "bg-lavender"
              }`}
            >
              <span
                className={`text-[15px] font-semibold ${
                  msg.role === "user" ? "text-muted" : "text-violet"
                }`}
              >
                {msg.role === "user" ? "Y" : "E"}
              </span>
            </div>
            <div
              className={`rounded-[16px] px-4 py-3 max-w-lg ${
                msg.role === "user"
                  ? "bg-plum text-white rounded-tr-sm"
                  : "bg-lavender text-muted rounded-tl-sm"
              }`}
            >
              <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && msg.content === "" && streaming && (
                <span className="text-[15px] text-muted animate-pulse">
                  Thinking...
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 flex gap-3 pt-4 border-t border-border"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Eydn anything about your wedding..."
          className="flex-1 rounded-[10px] border-border px-4 py-2.5 text-[15px]"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
    </Paywall>
  );
}
