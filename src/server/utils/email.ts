import AWS from "aws-sdk";

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
                <title>New Todo Item Created</title>
                <style>
                  body {
                    font-family: 'Inter', sans-serif;
                    line-height: 1.6;
                    color: #374151;
                    background-color: #F0F7FF;
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
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    padding: 32px;
                    margin-bottom: 24px;
                  }
                  h1 {
                    color: #003A66;
                    font-size: 24px;
                    margin-bottom: 16px;
                  }
                  h2 {
                    color: #007FB3;
                    font-size: 20px;
                    margin-bottom: 12px;
                  }
                  p {
                    margin-bottom: 16px;
                  }
                  .btn {
                    display: inline-block;
                    background-color: #00C8FF;
                    color: #FFFFFF;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    font-weight: 600;
                    transition: background-color 0.3s ease;
                  }
                  .btn:hover {
                    background-color: #00A3D9;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 32px;
                    color: #6B7280;
                    font-size: 14px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="card">
                    <h1>New Todo Item Created</h1>
                    <p>Hi there,</p>
                    <p>A new todo item has been created based on your GitHub issue:</p>
                    <h2>${todoItem.name}</h2>
                    <p>${todoItem.description}</p>
                    <a href="${actionLink}" class="btn">View Todo Item</a>
                  </div>
                  <div class="footer">
                    <p>Best regards,<br/>The Jacob AI Team</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Your New Todo Item has been Created",
      },
    },
    Source: process.env.SES_EMAIL_SOURCE ?? "",
  };

  await ses.sendEmail(params).promise();
}
