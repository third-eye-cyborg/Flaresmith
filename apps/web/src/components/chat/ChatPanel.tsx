"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ReconnectingWebSocketClient } from "@cloudmake/api-client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  wsUrl: string;
  sessionId: string;
  onDiff?: (diffs: Array<{ path: string; patch: string }>) => void;
};

export function ChatPanel({ wsUrl, sessionId, onDiff }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const clientRef = useRef<ReconnectingWebSocketClient | null>(null);

  useEffect(() => {
    const client = new ReconnectingWebSocketClient(wsUrl, {
      onOpen: () => {
        client.send({ kind: "start", sessionId });
      },
      onMessage: (evt) => {
        if (evt?.kind === "token") {
          setMessages((m) => {
            const last = m[m.length - 1];
            if (last && last.role === "assistant") {
              return [...m.slice(0, -1), { role: "assistant", content: last.content + evt.token }];
            }
            return [...m, { role: "assistant", content: evt.token }];
          });
        } else if (evt?.kind === "diff") {
          onDiff?.(evt.diffs);
        }
      },
    });
    client.connect();
    clientRef.current = client;
    return () => client.close();
  }, [wsUrl, sessionId, onDiff]);

  function send() {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", content: input }]);
    clientRef.current?.send({ kind: "message", sessionId, text: input });
    setInput("");
  }

  return (
    <div className="flex flex-col h-full border rounded p-2">
      <div className="flex-1 overflow-auto space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <pre className="inline-block bg-gray-50 rounded px-2 py-1 whitespace-pre-wrap">{m.content}</pre>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant…"
        />
        <button className="border rounded px-3 py-1" onClick={send} aria-label="Send message">
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;
