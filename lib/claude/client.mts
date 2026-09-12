import { spawn } from "node:child_process";
import type {
  ClaudeClientOptions,
  ClaudeEvent,
  ClaudeStopReason,
  PlanEntry,
  StreamOptions,
} from "./types.mts";

type CliMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  parent_tool_use_id?: string | null;
  // system/init
  model?: string;
  cwd?: string;
  // assistant / user
  message?: { content?: unknown[] };
  // stream_event
  event?: {
    type?: string;
    delta?: { type?: string; text?: string; thinking?: string };
  };
  // result
  stop_reason?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  result?: string;
};

const STOP_REASONS: Record<string, ClaudeStopReason> = {
  end_turn: "end_turn",
  max_tokens: "max_tokens",
  refusal: "refusal",
};

/** Tool results arrive as a bare string or as an array of content blocks. */
function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      const b = block as { type?: string; text?: string };
      return b.type === "text" ? (b.text ?? "") : "";
    })
    .join("");
}

function planEntries(input: Record<string, unknown>): PlanEntry[] {
  const todos = input.todos;
  if (!Array.isArray(todos)) return [];
  return todos.map((todo) => {
    const t = todo as { content?: string; status?: string };
    return {
      content: t.content ?? "",
      status:
        t.status === "in_progress" || t.status === "completed"
          ? t.status
          : "pending",
    };
  });
}

export class ClaudeClient {
  readonly options: ClaudeClientOptions;

  constructor(options: ClaudeClientOptions = {}) {
    this.options = options;
  }

  private args(prompt: string, resumeSessionId?: string | null): string[] {
    const {
      permissionMode = "acceptEdits",
      allowedTools,
      model,
    } = this.options;

    const args = [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--permission-mode",
      permissionMode,
    ];
    if (allowedTools?.length) args.push("--allowedTools", allowedTools.join(","));
    if (model) args.push("--model", model);
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    return args;
  }

  async *stream(
    prompt: string,
    { signal, resumeSessionId }: StreamOptions = {},
  ): AsyncGenerator<ClaudeEvent, void> {
    const child = spawn(
      this.options.pathToClaude ?? "claude",
      this.args(prompt, resumeSessionId),
      { cwd: this.options.cwd ?? process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );

    let cancelled = false;
    const onAbort = () => {
      cancelled = true;
      // SIGINT ends the turn cleanly. SIGTERM would leave it unfinished.
      child.kill("SIGINT");
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const suppressed = new Set<string>();
    let sawTurnEnd = false;

    try {
      for await (const line of lines(child.stdout)) {
      for (const event of parse([line], suppressed)) {
         if (cancelled) {
            if (event.type === "error") continue;
            if (event.type === "turn_end") {
              sawTurnEnd = true;
              yield { type: "turn_end", stopReason: "cancelled" };
              continue;
            }
          }
          if (event.type === "turn_end") sawTurnEnd = true;
          yield event;
        }
      }

      const code = await exitCode(child);

      if (cancelled) {
        if (!sawTurnEnd) yield { type: "turn_end", stopReason: "cancelled" };
        return;
      }
      if (!sawTurnEnd) {
        yield {
          type: "error",
          message:
            stderr.trim() || `claude exited with code ${code} before finishing`,
        };
        yield { type: "turn_end", stopReason: "error" };
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      if (child.exitCode === null) child.kill("SIGINT");
    }
  }
}

export function* parse(
  input: Iterable<string>,
  suppressed: Set<string> = new Set(),
): Generator<ClaudeEvent> {
  for (const line of input) {
    let msg: CliMessage;
    try {
      msg = JSON.parse(line) as CliMessage;
    } catch {
      continue;
    }
    if (msg.parent_tool_use_id) continue;
    yield* toEvents(msg, suppressed);
  }
}

function* toEvents(
  msg: CliMessage,
  suppressed: Set<string>,
): Generator<ClaudeEvent> {
  switch (msg.type) {
    case "system":
      if (msg.subtype === "init" && msg.session_id) {
        yield {
          type: "session_started",
          sessionId: msg.session_id,
          model: msg.model ?? "unknown",
          cwd: msg.cwd ?? "",
        };
      }
      return;

    case "stream_event": {
      const delta = msg.event?.delta;
      if (msg.event?.type !== "content_block_delta" || !delta) return;
      if (delta.type === "text_delta" && delta.text) {
        yield { type: "text_delta", text: delta.text };
      } else if (delta.type === "thinking_delta" && delta.thinking) {
        yield { type: "thinking_delta", text: delta.thinking };
      }
      return;
    }

    case "assistant": {
      for (const block of msg.message?.content ?? []) {
        const b = block as {
          type?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        };
        if (b.type !== "tool_use" || !b.id || !b.name) continue;
        const input = b.input ?? {};
        if (b.name === "TodoWrite") {
          suppressed.add(b.id);
          yield { type: "plan", entries: planEntries(input) };
        } else {
          yield { type: "tool_start", id: b.id, name: b.name, input };
        }
      }
      return;
    }

    case "user": {
      for (const block of msg.message?.content ?? []) {
        const b = block as {
          type?: string;
          tool_use_id?: string;
          is_error?: boolean | null;
          content?: unknown;
        };
        if (b.type !== "tool_result" || !b.tool_use_id) continue;
        if (suppressed.has(b.tool_use_id)) continue;
        yield {
          type: "tool_end",
          id: b.tool_use_id,
          text: resultText(b.content),
          isError: b.is_error === true,
        };
      }
      return;
    }

    case "result": {
      if (msg.is_error) {
        yield { type: "error", message: msg.result ?? "claude reported an error" };
      }
      yield {
        type: "turn_end",
        stopReason: msg.is_error
          ? "error"
          : (STOP_REASONS[msg.stop_reason ?? ""] ?? "end_turn"),
        costUsd: msg.total_cost_usd,
      };
      return;
    }

    default:
      return;
  }
}

async function* lines(stream: NodeJS.ReadableStream): AsyncGenerator<string> {
  let buffer = "";
  stream.setEncoding("utf8");
  for await (const chunk of stream as AsyncIterable<string>) {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) yield line;
    }
  }
  const rest = buffer.trim();
  if (rest) yield rest;
}

function exitCode(child: ReturnType<typeof spawn>): Promise<number | null> {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve) => child.once("close", (code) => resolve(code)));
}
