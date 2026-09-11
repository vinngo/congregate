"use client";

import { useState } from "react";
import { ChatView } from "./chat-view";
import { ThreadSidebar } from "./thread-sidebar";
import type { Thread } from "@/lib/types";

export function Workspace({ initialThreads }: { initialThreads: Thread[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreads[0]?.id ?? null,
  );

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;

  function handleNew() {
    const thread: Thread = {
      id: crypto.randomUUID(),
      title: "Untitled thread",
      createdAt: Date.now(),
      messages: [],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
  }

  function handleSend(text: string) {
    if (!activeThreadId) return;
    // Nothing replies yet — the agent side lands with the ACP adapter.
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: crypto.randomUUID(),
                  role: "user" as const,
                  blocks: [{ type: "text" as const, text }],
                },
              ],
            }
          : thread,
      ),
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelect={setActiveThreadId}
        onNew={handleNew}
      />
      <ChatView thread={activeThread} onSend={handleSend} />
    </div>
  );
}
