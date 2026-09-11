import { Composer } from "./composer";
import { MessageView } from "./message";
import type { Thread } from "@/lib/types";

export function ChatView({
  thread,
  onSend,
}: {
  thread: Thread | null;
  onSend: (text: string) => void;
}) {
  if (!thread) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        No thread selected.
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h1 className="truncate text-sm">{thread.title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {thread.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No messages yet.
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-4">
            {thread.messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <Composer onSend={onSend} />
    </main>
  );
}
