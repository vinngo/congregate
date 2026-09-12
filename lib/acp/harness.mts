/**
 *    node lib/acp/harness.mts "what files are in lib/claude?"
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Readable, Writable } from "node:stream"
import * as acp from "@agentclientprotocol/sdk"

const here = dirname(fileURLToPath(import.meta.url))
const agentPath = join(here, "agent.mts")
const userPrompt = process.argv[2] ?? "List the files in lib/claude. One sentence."

const agentProcess = spawn("node", [agentPath], {
  stdio: ["pipe", "pipe", "inherit"],
})

const input = Writable.toWeb(agentProcess.stdin) as WritableStream<Uint8Array>
const output = Readable.toWeb(
  agentProcess.stdout,
) as unknown as ReadableStream<Uint8Array>
const stream = acp.ndJsonStream(input, output)

function render(update: acp.SessionUpdate): void {
  switch (update.sessionUpdate) {
    case "agent_message_chunk":
      if (update.content.type === "text") process.stdout.write(update.content.text)
      break
    case "agent_thought_chunk":
      if (update.content.type === "text") {
        process.stdout.write(`\x1b[2m${update.content.text}\x1b[0m`)
      }
      break
    case "tool_call":
      console.log(`\n[tool_call ${update.kind}] ${update.title}`)
      break
    case "tool_call_update":
      console.log(`[tool_call_update] ${update.status}`)
      break
    case "plan":
      console.log(
        `\n[plan] ${update.entries.map((e) => `${e.status}: ${e.content}`).join(" | ")}`,
      )
      break
    default:
      console.log(`\n[${update.sessionUpdate}]`)
  }
}

try {
  const result = await acp
    .client({ name: "congregate-harness" })
    .connectWith(stream, async (ctx) => {
      const init = await ctx.request(acp.methods.agent.initialize, {
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } },
      })
      console.log(`connected, protocol v${init.protocolVersion}`)

      return ctx.buildSession(process.cwd()).withSession(async (session) => {
        console.log(`session ${session.sessionId}`)
        console.log(`> ${userPrompt}\n`)
        session.prompt(userPrompt)
        for (;;) {
          const message = await session.nextUpdate()
          if (message.kind === "stop") return message.response
          render(message.notification.update)
        }
      })
    })
  console.log(`\n\nstopReason: ${result.stopReason}`)
} finally {
  agentProcess.kill()
}
