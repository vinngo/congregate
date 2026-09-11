"use client";

import { useRef, useState } from "react";

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(resize);
  }

  return (
    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder="Message the agent…"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter inserts a newline.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full resize-none rounded border border-zinc-300 bg-transparent p-3 outline-none focus:border-zinc-500 dark:border-zinc-700"
      />
    </div>
  );
}
