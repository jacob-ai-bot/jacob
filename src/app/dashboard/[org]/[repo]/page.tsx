import { cookies } from "next/headers";
import DevelopersGrid from "./[developer]/components/developers";

const RepoPage = ({ params }: { params: { org: string; repo: string } }) => {
  // const cookieStore = cookies();
  // const lastUsedRepo = cookieStore.get("lastUsedRepo");
  // console.log("lastUsedRepo", lastUsedRepo);

  return (
    <div>
      <DevelopersGrid org={params.org} repo={params.repo} />
    </div>
  );
};

export default RepoPage;
