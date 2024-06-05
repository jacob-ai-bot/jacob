import DevelopersGrid from "./[developer]/components/developers";
import { SignOutButton } from "~/app/_components/SignOutButton";

const RepoPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => (
  <div className="flex flex-col">
    <div className="m-3 flex flex-row justify-end">
      <SignOutButton callbackUrl="/" />
    </div>
    <DevelopersGrid org={params.org} repo={params.repo} />
  </div>
);

export default RepoPage;
