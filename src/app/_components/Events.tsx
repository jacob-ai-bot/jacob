"use client";

import { api } from "~/trpc/react";
import { TaskType } from "~/server/db/enums";

export function Events() {
  const { mutate: addMutate } = api.events.add.useMutation();

  // subscribe to new posts and add
  api.events.onAdd.useSubscription(undefined, {
    onData(event) {
      console.log("Subscription data:", event);
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  const onAddEvent = async () => {
    addMutate({
      type: TaskType.command,
      projectId: 39,
      repoFullName: "PioneerSquareLabs/t3-starter-template",
      issueId: null,
      userId: "cpirich",
      payload: {
        type: TaskType.command,
        exitCode: 0,
        command: "git clone",
        response: "done",
        directory: "/",
      },
    });
  };

  return (
    <div>
      <button
        onClick={onAddEvent}
        className="rounded-full bg-white/40 px-10 py-3 font-semibold no-underline transition hover:bg-white/70"
      >
        Add Event
      </button>
    </div>
  );
}
