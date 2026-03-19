"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

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
      toast.error("Failed to get response from Eydn");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-8">Loading chat...</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">
        Ask Eydn
      </h1>
      <p className="mt-1 text-sm text-gray-500 flex-shrink-0">
        Your AI wedding planning assistant
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="text-sm font-bold text-rose-600">E</span>
            </div>
            <div className="bg-rose-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
              <p className="text-sm text-gray-700">
                Hi! I&apos;m Eydn, your wedding guide. Ask me anything about
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
                msg.role === "user" ? "bg-gray-200" : "bg-rose-100"
              }`}
            >
              <span
                className={`text-sm font-bold ${
                  msg.role === "user" ? "text-gray-600" : "text-rose-600"
                }`}
              >
                {msg.role === "user" ? "Y" : "E"}
              </span>
            </div>
            <div
              className={`rounded-2xl px-4 py-3 max-w-lg ${
                msg.role === "user"
                  ? "bg-gray-900 text-white rounded-tr-sm"
                  : "bg-rose-50 text-gray-700 rounded-tl-sm"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && msg.content === "" && streaming && (
                <span className="text-sm text-gray-400 animate-pulse">
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
        className="flex-shrink-0 flex gap-3 pt-4 border-t"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Eydn anything about your wedding..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
