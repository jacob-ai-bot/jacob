import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTodo } from "~/server/utils/todos";
import { db } from "~/server/db/db";
import JiraApi from "jira-client";

export async function POST(req: NextRequest) {
  const jiraApiKey = process.env.JIRA_API_KEY;
  if (!jiraApiKey) {
    return NextResponse.json({ error: "JIRA_API_KEY not set" }, { status: 500 });
  }

  const payload = await req.json();

  if (payload.webhookEvent !== "jira:issue_created") {
    return NextResponse.json({ message: "Ignored non-issue creation event" });
  }

  const issueKey = payload.issue.key;
  const projectKey = payload.issue.fields.project.key;

  const project = await db.projects.findBy({ repoFullName: projectKey });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const jiraClient = new JiraApi({
    protocol: "https",
    host: payload.issue.self.split("/")[2],
    apiVersion: "2",
    strictSSL: true,
    oauth: {
      consumer_key: process.env.JIRA_CONSUMER_KEY,
      private_key: process.env.JIRA_PRIVATE_KEY,
      token: jiraApiKey,
      token_secret: process.env.JIRA_TOKEN_SECRET,
    },
  });

  try {
    const issue = await jiraClient.findIssue(issueKey);
    await getOrCreateTodo({
      repo: projectKey,
      projectId: project.id,
      issueNumber: parseInt(issue.id),
      jiraIssue: issue,
    });

    return NextResponse.json({ message: "Todo created successfully" });
  } catch (error) {
    console.error("Error creating todo from Jira issue:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}