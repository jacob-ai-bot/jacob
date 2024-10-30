import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db/db";

export async function getCodebaseContext(
  repoOwner: string,
  repoName: string,
  accessToken: string,
) {
  try {
    const project = await db.projects.findBy({
      repoFullName: `${repoOwner}/${repoName}`,
    });

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const codebaseContext = await db.codebaseContext
      .where({ projectId: project.id })
      .order({ filePath: "ASC" })
      .all();

    return codebaseContext;
  } catch (error) {
    console.error("Error fetching codebase context:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch codebase context",
    });
  }
}
