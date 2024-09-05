import { useChat } from "ai/react";
import { useState, useEffect } from "react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
      <div className="mb-4 flex-1 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block rounded-lg p-3 ${
                m.role === "user"
                  ? "bg-aurora-500 text-white dark:bg-sky-500/40 dark:text-white"
                  : "bg-white text-dark-blue dark:bg-slate-700 dark:text-slate-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex ">
        <input
          className="flex-1 rounded-l-lg border border-aurora-300 bg-white p-2 text-dark-blue dark:border-sky-600/30 dark:bg-slate-800 dark:text-slate-100"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="rounded-r-lg bg-aurora-500 px-4 py-2 text-white hover:bg-aurora-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
        >
          Send
        </button>
      </form>
    </div>
  );
}
