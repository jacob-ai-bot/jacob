import { setupGitHubWebhook } from "./webhooks/github";
import express from "express";

const port = process.env["PORT"] ?? 4000;

async function init() {
  // set up the server
  const app = express();
  app.use(express.urlencoded({ extended: true }));

  await setupGitHubWebhook(app);
  app.listen(port, () => console.log(`Server is running on port ${port}`));
}

init();
