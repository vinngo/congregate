import * as acp from "@agentclientprotocol/sdk";
import type { ClaudeEvent, ClaudeStopReason } from "./types.mts";

const TOOL_KINDS: Record<string, acp.ToolKind> = {
  Read: "read",
  NotebookRead: "read",
  Edit: "edit",
  Write: "edit",
  NotebookEdit: "edit",
  Bash: "execute",
  BashOutput: "execute",
  KillShell: "execute",
  Grep: "search",
  Glob: "search",
  WebFetch: "fetch",
  WebSearch: "fetch",
  TodoWrite: "think",
};

export function toolKind(name: string): acp.ToolKind {
  return TOOL_KINDS[name] ?? "other";
}

export function toolTitle(name: string, input: Record<string, unknown>): string {
  const detail =
    pickString(input, "file_path") ??
    pickString(input, "command") ??
    pickString(input, "pattern") ??
    pickString(input, "url") ??
    pickString(input, "description");
  if (!detail) return name;
  const flat = detail.replace(/\s+/g, " ").trim();
  return `${name} ${flat.length > 80 ? `${flat.slice(0, 79)}…` : flat}`;
}

/** Lets a client highlight the file a tool call touches. */
function locations(input: Record<string, unknown>): acp.ToolCallLocation[] {
  const path = pickString(input, "file_path") ?? pickString(input, "path");
  return path ? [{ path }] : [];
}

function pickString(
  input: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = input[key];
  return typeof value === "string" && value ? value : undefined;
}

export function stopReason(reason: ClaudeStopReason): acp.StopReason {
  switch (reason) {
    case "cancelled":
      return "cancelled";
    case "max_tokens":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "end_turn";
  }
}

export function toSessionUpdate(event: ClaudeEvent): acp.SessionUpdate | null {
  switch (event.type) {
    case "text_delta":
      return {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: event.text },
      };

    case "thinking_delta":
      return {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: event.text },
      };

    case "tool_start":
      return {
        sessionUpdate: "tool_call",
        toolCallId: event.id,
        title: toolTitle(event.name, event.input),
        kind: toolKind(event.name),
        status: "in_progress",
        locations: locations(event.input),
        rawInput: event.input,
      };

    case "tool_end":
      return {
        sessionUpdate: "tool_call_update",
        toolCallId: event.id,
        status: event.isError ? "failed" : "completed",
        content: event.text
          ? [{ type: "content", content: { type: "text", text: event.text } }]
          : [],
      };

    case "plan":
      return {
        sessionUpdate: "plan",
        entries: event.entries.map((entry) => ({
          content: entry.content,
          status: entry.status,
          priority: "medium",
        })),
      };

    case "error":
      return {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: `\n[error] ${event.message}\n` },
      };

    case "session_started":
    case "turn_end":
      return null;
  }
}
