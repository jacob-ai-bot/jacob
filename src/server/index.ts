import { setupGitHubWebhook } from "./webhooks/github";
import { gitHubOAuthCallback } from "./auth/github";
import express from "express";

const port = process.env["PORT"] ?? 4000;

// set up the server
export const app = express();
app.use(express.urlencoded({ extended: true }));

app.get("/api/auth/github/callback", gitHubOAuthCallback);

if (!process.env["VITE"]) {
  const frontendFiles = process.cwd() + "/dist";
  app.use(express.static(frontendFiles));
  app.get("/*", (req, res) => {
    console.log(`Serving ${frontendFiles}/index.html [${req.url}]]`);
    res.sendFile(frontendFiles + "/index.html");
  });
  app.listen(port, () => console.log(`Server is running on port ${port}`));
}

setupGitHubWebhook(app);
