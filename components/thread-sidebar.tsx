import type { Thread } from "@/lib/types";

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelect,
  onNew,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          threads
        </span>
        <button
          type="button"
          onClick={onNew}
          className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
        >
          + new
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {threads.map((thread) => {
          const active = thread.id === activeThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(thread.id)}
              className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                active
                  ? "bg-zinc-200 dark:bg-zinc-800"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              {thread.title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
