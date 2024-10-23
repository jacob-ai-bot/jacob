import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../db/db';
import { getOrCreateTodo } from '../utils/todos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { issue } = req.body;

    if (issue) {
      const { key, fields } = issue;
      const { summary, description, project } = fields;

      const repoFullName = `${project.key}/${key}`;
      const projectId = await db.projects.findByOptional({ repoFullName }).then(p => p?.id);

      if (projectId) {
        await getOrCreateTodo({
          repo: repoFullName,
          projectId,
          issueNumber: parseInt(key.split('-')[1], 10),
          accessToken: process.env.JIRA_API_KEY,
        });
      }
    }

    res.status(200).json({ message: 'Webhook received' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}