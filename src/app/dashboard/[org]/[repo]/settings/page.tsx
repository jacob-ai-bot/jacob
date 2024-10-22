import React from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '~/utils/trpc';

const SettingsPage = () => {
  const { data: session } = useSession();
  const jiraAuthUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.NEXT_PUBLIC_JIRA_CLIENT_ID}&scope=read%3Ame&redirect_uri=https%3A%2F%2Fapp.jacb.ai%2Fapi%2Fjira%2Fcallback&state=${session?.user?.id}&response_type=code&prompt=consent`;

  return (
    <div>
      <h1>Settings</h1>
      <a href={jiraAuthUrl}>Log in with Jira</a>
    </div>
  );
};

export default SettingsPage;
