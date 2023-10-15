import { useEffect, useState } from "react";
import { Endpoints } from "@octokit/types";
import { useSearchParams } from "react-router-dom";

const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${
  import.meta.env.VITE_GITHUB_CLIENT_ID
}&scope=user`;

type AuthJSONResponse = {
  data?: { token: string };
  errors?: Array<{ message: string }>;
};

type GetUserReposResponse = Endpoints["GET /user/repos"]["response"]["data"];

export function GitHubOAuth() {
  const [error, setError] = useState<Error | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attemptedLogin, setAttemptedLogin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [repos] = useState<GetUserReposResponse | undefined>();

  const code = searchParams.get("code");
  const figma = searchParams.get("figma");

  const onMessage = (event: MessageEvent) => {
    console.log(`onMessage received event`, event);

    if (event?.data?.pluginMessage?.message === "GET_EXISTING_ACCESS_TOKEN") {
      const token = event?.data?.pluginMessage?.accessToken;

      console.log("handleAccessToken received token", token);
      // Check if that token works
      // and save it to use with network requests

      setAccessToken(token);
    } else if (event?.data?.pluginMessage?.message === "GET_ACCESS_TOKEN") {
      console.log("received GET_ACCESS_TOKEN message, passing it on to Figma");
      parent.postMessage(event.data, "https://www.figma.com");
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const handleLogin = async (code: string) => {
      try {
        // Exchange the code for an access token
        const accessTokenResponse = await fetch(
          `/api/auth/github/callback?code=${code}`,
          {
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (accessTokenResponse.ok) {
          const { data }: AuthJSONResponse = await accessTokenResponse.json();
          const accessToken = data?.token;
          setAccessToken(accessToken);

          setError(undefined);
          searchParams.delete("code");
          setSearchParams(searchParams);

          parent.postMessage(
            {
              pluginMessage: {
                message: "SAVE_ACCESS_TOKEN",
                accessToken,
              },
              pluginId: import.meta.env.VITE_FIGMA_PLUGIN_ID,
            },
            "https://otto-mvp.onrender.com",
          );

          // Fetch the user's repos
          // const userReposResponse = await fetch(
          //   "https://api.github.com/user/repos",
          //   {
          //     headers: {
          //       Authorization: `Bearer ${accessToken}`,
          //       "User-Agent": "Your-App-Name",
          //       "Content-Type": "application/json",
          //     },
          //   },
          // );

          // if (userReposResponse.ok) {
          //   const repos: GetUserReposResponse = await userReposResponse.json();
          //   setRepos(repos);

          //   setError(undefined);
          //   searchParams.delete("code");
          //   setSearchParams(searchParams);
          // } else {
          //   throw new Error(
          //     `Failed to fetch user repos: ${userReposResponse.status} ${userReposResponse.statusText}`,
          //   );
          // }
        } else {
          throw new Error(
            `Failed to fetch access token: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`,
          );
        }
      } catch (error) {
        console.error(error);
        setError(error as Error);
      }
    };

    if (code && !attemptedLogin) {
      setAttemptedLogin(true);
      handleLogin(code);
    }

    return () => {
      abortController.abort();
    };
  }, []);

  const handleFigmaSignin = () => {
    window.open(location.origin + location.pathname, "_blank", "popup");
  };

  return (
    <div>
      {!accessToken && !figma && (
        <a href={githubOAuthURL}>Sign in with GitHub</a>
      )}
      {!accessToken && figma && (
        <a onClick={handleFigmaSignin}>Sign in with GitHub</a>
      )}
      {accessToken && <div>Signed in to github!</div>}
      {repos &&
        repos.map((repo) => (
          <div key={repo.id}>{`${repo.name}: ${repo.full_name}`}</div>
        ))}
      {error && <div>{error.message}</div>}
    </div>
  );
}
