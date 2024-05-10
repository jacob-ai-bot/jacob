import { observable } from "@trpc/server/observable";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Event, EventsTable } from "~/server/db/tables/events.table";
import { newRedisConnection } from "~/server/utils/redis";

export const eventsRouter = createTRPCRouter({
  onAdd: protectedProcedure.subscription(() => {
    // return an `observable` with a callback which is triggered immediately
    return observable<Event>((emit) => {
      const onAdd = (channel: string, data: Event) => {
        // emit data to client
        emit.next(data);
      };

      // trigger `onAdd()` when `add` is triggered in our event emitter
      const redisConnection = newRedisConnection();
      void redisConnection
        .subscribe("events", (err, count) => {
          if (err) {
            // Just like other commands, subscribe() can fail for some reasons,
            // ex network issues.
            console.error("Failed to subscribe:", err);
          } else {
            // `count` represents the number of channels this client are currently subscribed to.
            console.log(
              `Subscribed successfully! This client is currently subscribed to ${String(count)} channels.`,
            );
          }
        })
        .then(() => {
          redisConnection.on("message", onAdd);
        });

      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        void redisConnection.quit();
      };
    });
  }),
  add: protectedProcedure
    .input(
      EventsTable.schema().omit({ id: true, createdAt: true, updatedAt: true }),
    )
    .mutation(async (opts) => {
      const event = { ...opts.input }; /* [..] add to db */
      const redisPub = newRedisConnection();
      await redisPub.publish("events", JSON.stringify(event));
      await redisPub.quit();
      return event;
    }),
});
