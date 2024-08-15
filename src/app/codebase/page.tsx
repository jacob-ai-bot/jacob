import { CONTEXT_ITEMS } from "~/data/codebaseContext";
import Codebase from "./Codebase";

const DashboardPage = async () => {
  return <Codebase contextItems={CONTEXT_ITEMS} />;
};

export default DashboardPage;
