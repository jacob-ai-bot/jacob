import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTodo } from "~/server/utils/todos";
import { db } from "~/server/db/db";

export async function POST(req: NextRequest) {
  const jiraApiKey = process.env.JIRA_API_KEY;
  if (!jiraApiKey) {
    console.error("JIRA_API_KEY is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${jiraApiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    if (payload.webhookEvent !== "jira:issue_created") {
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const issue = payload.issue;
    const project = await db.projects.findBy({ repoFullName: issue.fields.project.key });
    if (!project) {
      console.error(`No project found for Jira project key: ${issue.fields.project.key}`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await getOrCreateTodo({
      repo: project.repoFullName,
      projectId: project.id,
      issueNumber: parseInt(issue.id),
      jiraIssue: issue,
    });

    return NextResponse.json({ message: "Todo created successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Jira webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}