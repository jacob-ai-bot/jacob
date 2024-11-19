import { z } from "zod";
import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "@/env.mjs";

const branchNameSchema = z.object({
  descriptiveName: z.string().min(1).max(50),
});

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export async function generateBranchName(input: string): Promise<string> {
  try {
    const prompt = `Generate a concise, descriptive git branch name based on this input: "${input}". 
    The branch name should:
    - Be descriptive and reflect the purpose
    - Use only lowercase alphanumeric characters and dashes
    - Use dashes to separate words
    - Be between 3-50 characters
    - Not include special characters other than dashes
    - Not include the random digits (those will be added later)
    
    Return only the branch name, nothing else.`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const generatedName = response.content[0].text.trim().toLowerCase();
    const sanitizedName = generatedName
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const randomDigits = Math.floor(Math.random() * 90000 + 10000).toString();

    const finalBranchName = `${sanitizedName}-${randomDigits}`;

    const validatedName = branchNameSchema.parse({
      descriptiveName: sanitizedName,
    });

    return finalBranchName;
  } catch (error) {
    console.error("Error generating branch name:", error);
    const timestamp = Date.now().toString().slice(-5);
    return `branch-${timestamp}`;
  }
}
