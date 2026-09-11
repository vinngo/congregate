import type { Block, Message } from "@/lib/types";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <p className="whitespace-pre-wrap">{block.text}</p>;
    case "tool_call":
      return (
        <p className="font-mono text-sm text-zinc-500">
          <span>{block.status === "pending" ? "○" : "●"}</span>{" "}
          <span>{block.name}</span>
          {block.detail ? <span> {block.detail}</span> : null}
        </p>
      );
  }
}

export function MessageView({ message }: { message: Message }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {message.role === "user" ? "you" : "agent"}
      </p>
      {message.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
