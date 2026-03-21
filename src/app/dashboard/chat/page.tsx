"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Paywall } from "@/components/Paywall";
import { SkeletonList } from "@/components/Skeleton";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
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
      toast.error("Failed to get response from eydn");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }

  if (loading) {
    return <SkeletonList count={3} />;
  }

  return (
    <Paywall feature="Ask eydn">
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="flex-shrink-0">
        Ask eydn
      </h1>
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
                Hi! I&apos;m eydn, your wedding guide. Ask me anything about
                your wedding planning — I know your timeline, budget, vendors,
                and guests!
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
          placeholder="Ask eydn anything about your wedding..."
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
