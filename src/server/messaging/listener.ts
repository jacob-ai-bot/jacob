import { CronJob } from "cron";

import { initRabbitMQ } from "./queue";
import { purgeEvents } from "~/server/utils/events";
import { purgeTokens } from "~/server/utils/tokens";
import { fetchAllNewJiraIssues } from "~/server/utils/jira";
import { fetchAllNewLinearIssues } from "~/server/utils/linear";

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

// Fetch new Jira issues every hour
CronJob.from({
  cronTime: "0 * * * *",
  onTick: async () => {
    console.log("Cron job: Fetching new Jira issues");
    await fetchAllNewJiraIssues();
  },
  start: true,
});

// Fetch new Linear issues every hour
CronJob.from({
  cronTime: "30 * * * *",
  onTick: async () => {
    console.log("Cron job: Fetching new Linear issues");
    await fetchAllNewLinearIssues();
  },
  start: true,
});
