import { setupGitHubWebhook } from "./webhooks/github";
import { gitHubOAuthCallback } from "./auth/github";
import {
  createAccessTokenKeys,
  getAccessToken,
  postAccessToken,
} from "./auth/authToken";
import { newIssueForFigmaFile } from "./design/figma";
import { getRepos } from "./api/repos";
import { getExtractedIssues } from "./api/issues";
import { uploadImage } from "./image/upload";
import express from "express";
import cors from "cors";

const port = process.env.PORT ?? 4000;

// set up the server
export const app = express();
app.use(express.urlencoded({ extended: true }));

app.get("/api/auth/github/callback", (req, res) => void gitHubOAuthCallback(req, res));
app.post("/api/auth/accessToken/", (req, res) => void createAccessTokenKeys(req, res));
app.get("/api/auth/accessToken/:readKey", (req, res) => void getAccessToken(req, res));
app.post("/api/auth/accessToken/:writeKey", express.json(), (req, res) => void postAccessToken(req, res));
app.get("/api/repos", cors(), express.json(), (req, res) => void getRepos(req, res));
app.get("/api/extractedIssues", cors(), express.json(), (req, res) => void getExtractedIssues(req, res));
app.options("/api/design/:verb", cors());
app.post("/api/design/:verb", cors(), express.json(), (req, res) => void newIssueForFigmaFile(req, res));
app.options("/api/image/upload", cors());
app.post(
  "/api/image/upload",
  cors(),
  express.json({ limit: "10mb" }),
  (req, res) => void uploadImage(req, res),
);
void setupGitHubWebhook(app);

if (!process.env.VITE) {
  const frontendFiles = process.cwd() + "/dist";
  app.use(express.static(frontendFiles));
  app.get("/*", (_, res) => {
    res.sendFile(frontendFiles + "/index.html");
  });
  app.listen(port, () => console.log(`Server is running on port ${port}`));
}
