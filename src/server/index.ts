import { setupGitHubWebhook } from "./webhooks/github";
import express from "express";

const port = process.env["PORT"] ?? 4000;

// set up the server
export const app = express();
app.use(express.urlencoded({ extended: true }));

if (!process.env["VITE"]) {
  const frontendFiles = process.cwd() + "/dist";
  app.use(express.static(frontendFiles));
  app.get("/*", (_, res) => {
    res.send(frontendFiles + "/index.html");
  });
  app.listen(port, () => console.log(`Server is running on port ${port}`));
}

setupGitHubWebhook(app);
