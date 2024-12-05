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
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px 15px;
        }
        .main-card {
            background-color: #FFFFFF;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 30px 20px;
            margin-bottom: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 20px;
        }
        .gradient-bar {
            height: 4px;
            background: linear-gradient(to right, #00C8FF, #FF3390);
            border-radius: 2px;
            margin-bottom: 20px;
        }
        h1 {
            color: #1F2937;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            text-align: center;
        }
        .todo-card {
            background: linear-gradient(to bottom right, rgba(0, 200, 255, 0.05), rgba(255, 51, 144, 0.05));
            border: 1px solid rgba(0, 200, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .todo-title {
            color: #1F2937;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .view-button {
            display: inline-block;
            background: #00C8FF;
            color: #FFFFFF;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            border: none;
            transition: background 0.3s ease;
        }
        .view-button:hover {
            background: #007FB3;
        }
        .section-title {
            color: #1F2937;
            font-size: 16px;
            font-weight: 600;
            margin: 30px 0 15px;
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 5px;
        }
        .plan-step, .research-item {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #E5E7EB;
        }
        .plan-step:last-child, .research-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
            margin-bottom: 0;
        }
        .file-path {
            font-family: monospace;
            font-size: 13px;
            color: #6B7280;
            background: #F3F4F6;
            padding: 6px 10px;
            border-radius: 4px;
            margin-bottom: 12px;
            display: inline-block;
            word-break: break-all;
        }
        .instructions, .research-answer {
            color: #374151;
            font-size: 14px;
            line-height: 1.6;
        }
        .instructions p, .research-answer p {
            margin: 0 0 12px;
        }
        .instructions p:last-child, .research-answer p:last-child {
            margin-bottom: 0;
        }
        .research-question {
            color: #1F2937;
            font-weight: 600;
            margin-bottom: 12px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #00C8FF, #007FB3);
            color: #FFFFFF;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 16px;
            margin: 30px 0;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
            transition: background 0.3s ease;
        }
        .cta-button:hover {
            background: #007FB3;
        }
        .footer {
            text-align: center;
            color: #6B7280;
            font-size: 13px;
            margin-top: 30px;
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
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 12px 0;
        }
        pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }
        @media only screen and (max-width: 600px) {
            .container {
                padding: 15px 10px;
            }
            .main-card {
                padding: 20px 15px;
            }
            h1 {
                font-size: 22px;
            }
            .todo-title {
                font-size: 16px;
            }
            .view-button, .cta-button {
                font-size: 14px;
                padding: 10px 20px;
            }
            .section-title {
                font-size: 15px;
            }
            .instructions, .research-answer {
                font-size: 13px;
            }
            .footer {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-card">
            <div class="header">
                <!-- Optional Logo -->
                <!-- <img src="https://yourdomain.com/logo.png" alt="Company Logo" class="logo"> -->
            </div>
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
