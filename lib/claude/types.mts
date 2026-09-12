/**
 * Provider-neutral events from a Claude Code turn.
 */

export type PlanEntry = {
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority?: string;
};

export type ClaudeStopReason =
  | "end_turn"
  | "max_tokens"
  | "refusal"
  | "cancelled"
  | "error";

export type ClaudeEvent =
  | { type: "session_started"; sessionId: string; model: string; cwd: string }
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_start"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; text: string; isError: boolean }
  | { type: "plan"; entries: PlanEntry[] }
  | { type: "turn_end"; stopReason: ClaudeStopReason; costUsd?: number }
  | { type: "error"; message: string };

export type PermissionMode =
  | "acceptEdits"
  | "auto"
  | "bypassPermissions"
  | "manual"
  | "dontAsk"
  | "plan";

export type ClaudeClientOptions = {
  /** Working directory for the agent. Defaults to `process.cwd()`. */
  cwd?: string;
  permissionMode?: PermissionMode;
  allowedTools?: string[];
  model?: string;
  pathToClaude?: string;
};

export type StreamOptions = {
  signal?: AbortSignal;
  resumeSessionId?: string | null;
};
