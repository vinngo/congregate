import type { Thread } from "./types";

/**
 * Stand-in data until threads come from a real store. Timestamps are fixed
 * literals, not `Date.now()`, so the server and client render the same markup.
 */
export const SAMPLE_THREADS: Thread[] = [
  {
    id: "t_auth",
    title: "Fix the login redirect",
    createdAt: 1757600000000,
    messages: [
      {
        id: "m_1",
        role: "user",
        blocks: [
          {
            type: "text",
            text: "After signing in, users land on /dashboard even when they started from a deep link. Can you track down why?",
          },
        ],
      },
      {
        id: "m_2",
        role: "agent",
        blocks: [
          { type: "text", text: "Let me look at the auth guard." },
          {
            type: "tool_call",
            name: "read",
            status: "done",
            detail: "lib/auth/guard.ts",
          },
          {
            type: "text",
            text: "The guard drops the `next` search param before it redirects, so every sign-in falls back to the default route.",
          },
        ],
      },
      {
        id: "m_3",
        role: "user",
        blocks: [{ type: "text", text: "Makes sense. Fix it and add a test." }],
      },
      {
        id: "m_4",
        role: "agent",
        blocks: [
          {
            type: "tool_call",
            name: "edit",
            status: "pending",
            detail: "lib/auth/guard.ts",
          },
        ],
      },
    ],
  },
  {
    id: "t_docs",
    title: "Rewrite the README intro",
    createdAt: 1757500000000,
    messages: [
      {
        id: "m_5",
        role: "user",
        blocks: [
          {
            type: "text",
            text: "The README opens with three paragraphs of history. Cut it to two sentences that say what this does.",
          },
        ],
      },
    ],
  },
  {
    id: "t_perf",
    title: "Untitled thread",
    createdAt: 1757400000000,
    messages: [],
  },
];
