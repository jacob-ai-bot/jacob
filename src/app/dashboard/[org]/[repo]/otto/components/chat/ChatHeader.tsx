"use client";
import { type Developer } from "~/types";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface ChatHeaderProps {
  shouldHideLogo?: boolean;
  selectedRepo?: string | undefined;
  selectedDeveloper?: Developer | undefined;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  shouldHideLogo = false,
  selectedRepo,
  selectedDeveloper,
}) => {
  const router = useRouter();
  const { data } = api.github.getRepos.useQuery();
  const repos = data?.map((d) => d.full_name) ?? [];

  const handleSelectRepo = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRepo = event.target.value;
    const [org, repo] = newRepo.split("/");
    router.push(`/api/dashboard?org=${org}&repo=${repo}`);
  };

  const onShowDevelopers = () => {
    router.push(`/dashboard/${selectedRepo}`);
  };

  const getShortRepoName = (repo?: string) => {
    if (!repo) return "";
    const shortName = repo.split("/")[1] ?? "";
    return shortName.length > 30
      ? shortName.substring(0, 30) + "..."
      : shortName;
  };

  return (
    <div
      className={`flex items-center justify-between border-b border-gray-800 p-4 ${
        shouldHideLogo ? "hidden" : ""
      }`}
      style={{ height: "6rem" }}
    >
      <div className="relative inline-flex items-center">
        <button
          onClick={onShowDevelopers}
          className="flex items-center justify-between rounded-md bg-blueGray-800 p-2 hover:bg-blueGray-700 focus:outline-none"
        >
          <img
            src={selectedDeveloper?.imageUrl ?? "/images/logo.png"}
            alt={`${selectedDeveloper?.name}'s profile`}
            className="mr-2 h-12 w-12 rounded-full object-cover"
          />
          <div className="flex flex-col space-y-1 text-left">
            <span className="text-sm text-blueGray-200">
              {selectedDeveloper?.name ?? "Jacob"}
            </span>
            <span className="text-xs text-blueGray-400">
              {selectedDeveloper?.cta ?? ""}
            </span>
          </div>
          <img
            src="/images/chevron.svg"
            alt="chevron"
            className="ml-4 h-2 w-2 "
          />
        </button>
      </div>
      {repos.length > 1 ? (
        <div className="relative inline-flex">
          <img
            src="/images/chevron.svg"
            alt="chevron"
            className="pointer-events-none absolute right-0 top-0 m-4 h-2 w-2"
          />
          <select
            value={selectedRepo}
            onChange={handleSelectRepo}
            className="h-10 min-w-12 appearance-none rounded-md border  border-transparent bg-blueGray-800 pl-5 pr-10 text-blueGray-400 transition-colors duration-200 ease-in-out hover:border-blueGray-700 focus:outline-none"
          >
            {repos.map((repo) => (
              <option key={repo} value={repo}>
                {getShortRepoName(repo)}
              </option>
            ))}
          </select>
        </div>
      ) : repos.length === 1 ? (
        <div className="flex h-10 cursor-default items-center rounded-md border border-transparent bg-blueGray-800 px-5 text-blueGray-400 transition-colors duration-200 ease-in-out hover:border-blueGray-700">
          <span>{getShortRepoName(selectedRepo)}</span>
        </div>
      ) : null}
    </div>
  );
};

export default ChatHeader;
