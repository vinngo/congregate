/**
 *   node lib/claude/smoke.mts --fixture        replay the captured transcript
 *   node lib/claude/smoke.mts "list the files" run a live turn
 */
import { readFileSync } from "node:fs";
import { ClaudeClient, parse } from "./client.mts";
import { stopReason, toSessionUpdate } from "./to-acp.mts";
import type { ClaudeEvent } from "./types.mts";

const FIXTURE = new URL("./__fixtures__/turn.ndjson", import.meta.url);

function show(event: ClaudeEvent): void {
  if (event.type === "session_started") {
    console.log(`[session] ${event.sessionId} (${event.model})`);
    return;
  }
  if (event.type === "turn_end") {
    console.log(
      `\n[turn_end] claude=${event.stopReason} acp=${stopReason(event.stopReason)}` +
        (event.costUsd ? ` $${event.costUsd.toFixed(4)}` : ""),
    );
    return;
  }

  const update = toSessionUpdate(event);
  if (!update) return;

  switch (update.sessionUpdate) {
    case "agent_message_chunk":
    case "agent_thought_chunk":
      process.stdout.write(
        update.content.type === "text" ? update.content.text : "",
      );
      break;
    case "tool_call":
      console.log(`\n[tool_call ${update.kind}] ${update.title}`);
      break;
    case "tool_call_update": {
      const text = update.content?.[0];
      const preview =
        text?.type === "content" && text.content.type === "text"
          ? ` ${text.content.text.replace(/\s+/g, " ").slice(0, 60)}`
          : "";
      console.log(`[tool_call_update] ${update.status}${preview}`);
      break;
    }
    case "plan":
      console.log(
        `\n[plan] ${update.entries.map((e) => `${e.status}: ${e.content}`).join(" | ")}`,
      );
      break;
    default:
      console.log(`\n[${update.sessionUpdate}]`);
  }
}

const arg = process.argv[2];

if (!arg || arg === "--fixture") {
  const lines = readFileSync(FIXTURE, "utf8").split("\n").filter(Boolean);
  console.log(`replaying ${lines.length} lines from the fixture\n`);
  for (const event of parse(lines)) show(event);
} else {
  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("\n[SIGINT] cancelling turn…");
    controller.abort();
  });

  const client = new ClaudeClient({
    permissionMode: "acceptEdits",
    allowedTools: ["Read", "Glob", "Grep", "Bash(node -v)", "Bash(ls *)"],
  });

  for await (const event of client.stream(arg, { signal: controller.signal })) {
    show(event);
  }
}
