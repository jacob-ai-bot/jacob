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
    <title>Review Ready: ${todoItem.name}</title>
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
        overflow: hidden;
    }
    .gradient-bar {
        height: 20px;
        background: linear-gradient(to right, #00C8FF, #FF3390);
        border-radius: 2px;
        margin: -40px -32px 32px;
    }
    .gradient-separator {
        height: 4px;
        background: linear-gradient(to right, #00C8FF, #FF3390);
        margin: 32px -32px;
    }
    h1 {
        color: #1F2937;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 24px;
        letter-spacing: -0.02em;
    }
    .todo-card {
        background: linear-gradient(to right, rgba(0, 200, 255, 0.03), rgba(0, 200, 255, 0.07));
        border: 1px solid rgba(0, 200, 255, 0.1);
        border-radius: 20px;
        padding: 32px;
        margin: 32px 0;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .todo-title {
        color: #007FB3;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 24px;
        letter-spacing: -0.02em;
    }

    .view-button {
        display: inline-block;
        background-color: #FFFFFF;
        color: #007FB3;
        text-decoration: none;
        padding: 12px 32px;
        border-radius: 12px;
        font-weight: 500;
        font-size: 15px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 127, 179, 0.1);
    }

    .view-button:hover {
        background-color: #007FB3;
        color: #FFFFFF;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 127, 179, 0.2);
    }

    .plan-section, .research-section {
        margin: 32px 0;
        padding: 0;
        background: transparent;
        border: none;
    }

    .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
    }

    .section-icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        opacity: 0.7;
    }

    .section-title {
        font-size: 18px;
        color: #374151;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-left: 4px;
    }

    .plan-step {
        padding: 24px 0;
        border-bottom: 1px solid #E5E7EB;
        background: transparent;
        transition: all 0.2s ease;
    }

    .plan-step:last-child {
        border-bottom: none;
    }

    .step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }

    .step-type {
        font-size: 13px;
        font-weight: 500;
        color: #007FB3;
        background: rgba(0, 200, 255, 0.1);
        padding: 4px 12px;
        border-radius: 6px;
    }

    .step-path {
        font-size: 13px;
        color: #6B7280;
    }

    .research-item {
        padding: 24px 0;
        border-bottom: 1px solid #E5E7EB;
        background: transparent;
    }

    .research-item:last-child {
        border-bottom: none;
        margin-bottom: 20px;
    }

    .research-question {
        font-size: 15px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
    }

    .research-question:before {
        content: "Q:";
        color: #007FB3;
        margin-right: 8px;
        font-weight: 700;
    }

    .research-answer {
        font-size: 14px;
        color: #4B5563;
        line-height: 1.6;
        padding-left: 24px;
    }

    .cta-container {
        text-align: center;
        margin: 40px 0;
        padding: 0;
    }

    .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #00C8FF, #007FB3);
        color: #FFFFFF;
        text-decoration: none;
        padding: 16px 40px;
        border-radius: 12px;
        font-weight: 500;
        font-size: 15px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 200, 255, 0.2);
    }

    .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 200, 255, 0.3);
    }

    .plan-step, .research-item {
        animation: fadeIn 0.3s ease forwards;
        animation-delay: calc(var(--index) * 0.1s);
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
          planSteps?.length
            ? `
        <div class="gradient-separator"></div>
        <div class="plan-section">
            <div class="section-header">
                <svg class="section-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="#007FB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="section-title">Plan</div>
            </div>
            ${planSteps
              .map(
                (step, index) => `
                <div class="plan-step" style="--index: ${index + 1}">
                    <div class="step-header">
                        <span class="step-type">${step.type}</span>
                        <span class="step-path">${step.filePath}</span>
                    </div>
                    <div class="step-instructions">${step.instructions}</div>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        ${
          researchDetails?.length
            ? `
        <div class="gradient-separator"></div>
        <div class="research-section">
            <div class="section-header">
                <svg class="section-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="#007FB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="section-title">Research</div>
            </div>
            ${researchDetails
              .map(async (research, index) => {
                const answer = await marked(research.answer ?? "", {
                  breaks: true,
                });
                return `
                <div class="research-item" style="--index: ${index + 1}">
                    <div class="research-question">${research.question}</div>
                    <div class="research-answer">${answer}</div>
                </div>
            `;
              })
              .join("")}
        </div>
        `
            : ""
        }

        <div class="cta-container">
            <a href="${actionLink}" class="cta-button">Check it out</a>
        </div>

        <div class="footer">
            <p>Got questions? Ideas? We're all ears. Drop us a line anytime.</p>
            <p>Keep shipping awesome stuff!</p>
            <div class="footer">
                <p>Cheers,<br>The JACoB AI Team</p>
            </div>
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
