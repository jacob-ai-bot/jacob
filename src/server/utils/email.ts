import AWS from "aws-sdk";
import { db } from "../db/db";

const ses = new AWS.SES({
  apiVersion: "2010-12-01",
  region: process.env.AWS_REGION,
});

interface TodoItem {
  id: number;
  name: string;
  description: string;
}

interface PlanStep {
  title: string;
  instructions: string;
}

interface ResearchItem {
  question: string;
  answer: string;
}

export async function sendTransactionalEmail(
  userEmail: string,
  todoItem: TodoItem,
  githubOrg: string,
  githubRepo: string,
): Promise<void> {
  const actionLink = `https://app.jacb.ai/dashboard/${githubOrg}/${githubRepo}/todos/${todoItem.id}`;

  const planSteps = await db.planSteps
    .where({ projectId: todoItem.id })
    .select("title", "instructions");

  const researchItems = await db.research
    .where({ todoId: todoItem.id })
    .select("question", "answer");

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
    <title>New ${githubRepo} todo - ${todoItem.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background-color: #F3F4F6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .card {
            background-color: #FFFFFF;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            padding: 40px;
            margin-bottom: 32px;
        }
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo img {
            width: 120px;
            height: auto;
        }
        h1 {
            color: #003A66;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 24px;
            text-align: center;
        }
        h2 {
            color: #007FB3;
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        h3 {
            color: #00A3D9;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        p {
            margin-bottom: 24px;
            font-size: 16px;
        }
        .btn {
            display: inline-block;
            background-color: #00C8FF;
            color: #FFFFFF;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            text-align: center;
        }
        .btn:hover {
            background-color: #00A3D9;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .todo-card {
            background-color: #F0F7FF;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
        }
        .todo-link {
            display: inline-block;
            color: #007FB3;
            text-decoration: none;
            font-weight: 600;
            margin-top: 12px;
            transition: color 0.3s ease;
            font-size: 16px;
        }
        .todo-link:hover {
            color: #00C8FF;
        }
        .section {
            margin-bottom: 32px;
        }
        .footer {
            text-align: center;
            color: #6B7280;
            font-size: 14px;
        }
        .divider {
            height: 1px;
            background-color: #E5E7EB;
            margin: 32px 0;
        }
        @media (max-width: 600px) {
            .container {
                padding: 20px 10px;
            }
            .card {
                padding: 20px;
            }
            h1 {
                font-size: 24px;
            }
            h2 {
                font-size: 20px;
            }
            h3 {
                font-size: 16px;
            }
            p {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <img src="https://app.jacb.ai/images/logo.png" alt="JACoB AI Logo">
            </div>
            <h1>Your New Todo is Ready</h1>
            <p>Hey there,</p>
            <p>JACoB's been busy. We've taken your GitHub issue and turned it into a smart, actionable todo. Here's what's cooking:</p>
            <div class="todo-card">
                <h2>${todoItem.name}</h2>
                <p>${todoItem.description}</p>
                <a href="${actionLink}" class="btn">View Todo</a>
            </div>
            ${
              planSteps.length > 0
                ? `
            <div class="section">
                <h3>Action Plan</h3>
                <ol>
                    ${planSteps
                      .map(
                        (step: PlanStep) => `
                        <li>
                            <strong>${step.title}</strong>
                            <p>${step.instructions}</p>
                        </li>
                    `,
                      )
                      .join("")}
                </ol>
            </div>
            `
                : ""
            }
            ${
              researchItems.length > 0
                ? `
            <div class="section">
                <h3>Research Insights</h3>
                ${researchItems
                  .map(
                    (item: ResearchItem) => `
                    <p><strong>Q: ${item.question}</strong></p>
                    <p>A: ${item.answer}</p>
                `,
                  )
                  .join("")}
            </div>
            `
                : ""
            }
            <p>JACoB didn't just copy-paste your issue. It dug deep, analyzing how this fits into your codebase and crafting a step-by-step game plan. Pretty neat, huh?</p>
            <p>What's next? Hop in, review the todo and the plan, tweak if needed, and set things in motion. You can assign it to JACoB for some AI magic or loop in one of your team's developers.</p>
            <div style="text-align: center; margin-top: 32px;">
                <a href="${actionLink}" class="btn">Check it out</a>
            </div>
            <div class="divider"></div>
            <p>Got questions? Ideas? We're all ears. Drop us a line anytime.</p>
            <p>Keep shipping awesome stuff!</p>
            <div class="footer">
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
        Data: `New ${githubRepo} todo - ${todoItem.name}`,
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
