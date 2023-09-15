import { setupGitHubWebhook } from "./webhooks/github";
import express from "express";
import { text } from "body-parser";

const port = process.env["PORT"] ?? 4000;

async function init() {
  // set up the server
  const app = express();
  app.use(text({ type: "*/*" }));
  app.use(express.urlencoded({ extended: true }));

  await setupGitHubWebhook(app);
  app.listen(port, () => console.log(`Server is running on port ${port}`));
}

init();
