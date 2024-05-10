import { EventEmitter } from "events";
import { observable } from "@trpc/server/observable";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Event, EventsTable } from "~/server/db/tables/events.table";

// create a global event emitter (could be replaced by redis, etc)
const ee = new EventEmitter();

export const eventsRouter = createTRPCRouter({
  onAdd: protectedProcedure.subscription(() => {
    // return an `observable` with a callback which is triggered immediately
    return observable<Event>((emit) => {
      const onAdd = (data: Event) => {
        // emit data to client
        emit.next(data);
      };
      // trigger `onAdd()` when `add` is triggered in our event emitter
      ee.on("add", onAdd);
      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        ee.off("add", onAdd);
      };
    });
  }),
  add: protectedProcedure
    .input(
      EventsTable.schema().omit({ id: true, createdAt: true, updatedAt: true }),
    )
    .mutation(async (opts) => {
      const event = { ...opts.input }; /* [..] add to db */
      ee.emit("add", event);
      return event;
    }),
});
