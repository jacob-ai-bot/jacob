import AWS from "aws-sdk";
import { type PlanStep } from "../db/tables/planSteps.table";
import { type Research } from "~/types";
import { marked } from "marked";

const ses = new AWS.SES({
  apiVersion: "2010-12-01",
  region: process.env.AWS_REGION,
});

interface TodoItem {
  id: number;
  name: string;
  description: string;
}

export async function sendTransactionalEmail(
  userEmail: string,
  todoItem: TodoItem,
  githubOrg: string,
  githubRepo: string,
  planSteps?: PlanStep[],
  researchDetails?: Research[],
): Promise<void> {
  const actionLink = `https://app.jacb.ai/dashboard/${githubOrg}/${githubRepo}/todos/${todoItem.id}`;

  // Process markdown content first
  const processedResearch = await Promise.all(
    (researchDetails ?? []).map(async (research) => ({
      ...research,
      answer: research.answer
        ? await marked(research.answer, { breaks: true })
        : "",
    })),
  );

  const processedPlanSteps = await Promise.all(
    (planSteps ?? []).map(async (step) => ({
      ...step,
      instructions: await marked(step.instructions, { breaks: true }),
    })),
  );

  const params: AWS.SES.SendEmailRequest = {
    Destination: {
      ToAddresses: [userEmail],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Enhanced Issue is Ready</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #F9FAFB;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 32px 24px;
        }
        .main-card {
            background-color: #FFFFFF;
            border-radius: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            padding: 40px 32px;
            margin-bottom: 24px;
        }
        .gradient-bar {
            height: 4px;
            background: linear-gradient(to right, #00C8FF, #FF3390);
            margin: -40px -32px 32px;
        }
        h1 {
            color: #1F2937;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 24px;
            letter-spacing: -0.02em;
            text-align: center;
        }
        .todo-card {
            background: linear-gradient(to bottom right, rgba(0, 200, 255, 0.05), rgba(255, 51, 144, 0.05));
            border: 1px solid rgba(0, 200, 255, 0.1);
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
        }
        .todo-title {
            color: #1F2937;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .view-button {
            display: inline-block;
            background: #FFFFFF;
            color: #007FB3;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            border: 1px solid rgba(0, 127, 179, 0.2);
            transition: all 0.2s ease;
        }
        .view-button:hover {
            background: #007FB3;
            color: #FFFFFF;
            border-color: #007FB3;
        }
        .section-title {
            color: #1F2937;
            font-size: 18px;
            font-weight: 600;
            margin: 40px 0 24px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E5E7EB;
        }
        .plan-step {
            margin-bottom: 32px;
            padding-bottom: 32px;
            border-bottom: 1px solid #E5E7EB;
        }
        .plan-step:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .file-path {
            font-family: monospace;
            font-size: 13px;
            color: #6B7280;
            background: #F3F4F6;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            word-break: break-all;
        }
        .instructions {
            color: #374151;
            font-size: 14px;
            line-height: 1.6;
        }
        .instructions p {
            margin: 0 0 16px;
        }
        .instructions p:last-child {
            margin-bottom: 0;
        }
        .research-item {
            margin-bottom: 32px;
            padding-bottom: 32px;
            border-bottom: 1px solid #E5E7EB;
        }
        .research-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .research-question {
            color: #1F2937;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .research-answer {
            color: #4B5563;
            font-size: 14px;
            line-height: 1.6;
        }
        .research-answer p {
            margin: 0 0 16px;
        }
        .research-answer p:last-child {
            margin-bottom: 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #00C8FF, #007FB3);
            color: #FFFFFF;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 15px;
            margin: 40px 0;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        }
        .footer {
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            margin-top: 40px;
        }
        code {
            background: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            color: #374151;
        }
        pre {
            background: #F3F4F6;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
        }
        pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-card">
            <div class="gradient-bar"></div>
            <h1>Your Enhanced Issue is Ready</h1>
            
            <div class="todo-card">
                <div class="todo-title">${todoItem.name}</div>
                <a href="${actionLink}" class="view-button">View Issue</a>
            </div>

            ${
              processedPlanSteps.length
                ? `
                <div class="section-title">Plan</div>
                ${processedPlanSteps
                  .map(
                    (step) => `
                    <div class="plan-step">
                        <div class="file-path">${step.filePath}</div>
                        <div class="instructions">${step.instructions}</div>
                    </div>
                `,
                  )
                  .join("")}
            `
                : ""
            }

            ${
              processedResearch.length
                ? `
                <div class="section-title">Research</div>
                ${processedResearch
                  .map(
                    (research) => `
                    <div class="research-item">
                        <div class="research-question">${research.question}</div>
                        <div class="research-answer">${research.answer}</div>
                    </div>
                `,
                  )
                  .join("")}
            `
                : ""
            }

            <a href="${actionLink}" class="cta-button">Check it out</a>

            <div class="footer">
                <p>Got questions? Ideas? We're all ears. Drop us a line anytime.</p>
                <p>Keep shipping awesome stuff!</p>
                <p>Cheers,<br>The JACoB AI Team</p>
            </div>
        </div>
    </div>
</body>
</html>
          `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Review Ready: ${todoItem.name}`,
      },
    },
    Source: process.env.SES_EMAIL_SOURCE ?? "",
  };

  console.log(
    `[${githubOrg}/${githubRepo}] Sending transactional email for issue #${todoItem.id}`,
  );
  console.log(`[${githubOrg}/${githubRepo}] params: ${userEmail}`);
  await ses.sendEmail(params).promise();
}
