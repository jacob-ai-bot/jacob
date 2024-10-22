import { NextApiRequest, NextApiResponse } from 'next';
import { appRouter } from '~/server/api/root';
import { createContext } from '~/server/context';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const caller = appRouter.createCaller(await createContext({ req, res }));

  if (req.method === 'GET') {
    const { code, state } = req.query;

    if (typeof code === 'string' && typeof state === 'string') {
      await caller.jira.oauthCallback({ code, state });
      res.redirect('/dashboard/settings');
    } else {
      res.status(400).json({ message: 'Invalid request' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
