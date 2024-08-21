import AddNewRepo from "./components/AddNewRepo";

export default function NewProjectPage({
  params,
}: {
  params: { login: string };
}) {
  return <AddNewRepo login={params.login} />;
}
