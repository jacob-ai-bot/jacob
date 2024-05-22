import { CronJob } from "cron";

import { initRabbitMQ } from "./queue";
import { purgeEvents } from "~/server/utils/events";
import { purgeTokens } from "~/server/utils/tokens";

void initRabbitMQ({ listener: true });

// Purge events and tokens every hour at 55 minutes past the hour
CronJob.from({
  cronTime: "55 * * * *",
  onTick: async () => {
    console.log("Purging events and tokens");
    const eventsPurged = await purgeEvents();
    console.log(`Purged ${eventsPurged} events`);
    const tokensPurged = await purgeTokens();
    console.log(`Purged ${tokensPurged} tokens`);
  },
  start: true,
});
