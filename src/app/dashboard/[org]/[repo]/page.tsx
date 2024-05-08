import DevelopersGrid from "./[developer]/components/developers";

const RepoPage = ({ params }: { params: { org: string; repo: string } }) => (
  <div>
    <DevelopersGrid org={params.org} repo={params.repo} />
  </div>
);

export default RepoPage;
