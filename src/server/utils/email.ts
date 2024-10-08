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
            <html>
              <body>
                <p>Hi there,</p>
                <p>A new todo item has been created based on your GitHub issue:</p>
                <h2>${todoItem.name}</h2>
                <p>${todoItem.description}</p>
                <p>You can view and manage this todo item <a href="${actionLink}">here</a>.</p>
                <br/>
                <p>Best regards,<br/>The Jacob AI Team</p>
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
    Source: process.env.SES_EMAIL_SOURCE || "",
  };

  await ses.sendEmail(params).promise();
}
