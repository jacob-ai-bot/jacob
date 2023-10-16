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

type CreateAccessTokenResponse = {
  data?: { readKey: string; writeKey: string };
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
  const state = searchParams.get("state");
  const figma = searchParams.get("figma");
  const writeKey = searchParams.get("writeKey");

  const onMessage = (event: MessageEvent) => {
    console.log(`onMessage received event`, event);

    if (event?.data?.pluginMessage?.message === "GET_EXISTING_ACCESS_TOKEN") {
      const token = event?.data?.pluginMessage?.accessToken;

      console.log("received GET_EXISTING_ACCESS_TOKEN: token: ", token);
      // Check if that token works
      // and save it to use with network requests

      setAccessToken(token);
    } else if (event?.data?.pluginMessage?.message === "SAVE_ACCESS_TOKEN") {
      console.log("received SAVE_ACCESS_TOKEN message, passing it on to Figma");
      console.log(
        `window.figma`,
        (window as unknown as { figma: object }).figma,
      );
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

          if (window.opener) {
            console.log("sending SAVE_ACCESS_TOKEN message to opener...");
            window.opener.postMessage(
              {
                pluginMessage: {
                  message: "SAVE_ACCESS_TOKEN",
                  accessToken,
                },
                pluginId: import.meta.env.VITE_FIGMA_PLUGIN_ID,
              },
              "https://otto-mvp.onrender.com",
            );
          } else {
            console.log("no window.opener, not calling postMessage on opener.");
          }
          const postAccessTokenResponse = await fetch(
            `/api/auth/accessToken/${state}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken }),
            },
          );

          if (
            postAccessTokenResponse.ok &&
            postAccessTokenResponse.status === 200
          ) {
            console.log("successfully posted access token to server");
          } else {
            setError(
              new Error(
                `Failed to post access token: ${postAccessTokenResponse.status} ${postAccessTokenResponse.statusText}`,
              ),
            );
          }

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
          setError(
            new Error(
              `Failed to fetch access token: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`,
            ),
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

  const handleFigmaSignin = async () => {
    let response: Response;
    try {
      response = await fetch("/api/auth/accessToken/", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
      setError(error as Error);
      return;
    }

    if (response.ok) {
      const { data, errors }: CreateAccessTokenResponse = await response.json();
      if (data) {
        const { readKey, writeKey } = data;
        // Post message read key back to parent
        console.log("sending readKey in message to parent", readKey, parent);
        parent.postMessage(
          {
            pluginMessage: { message: "SET_READ_KEY", readKey },
            pluginId: import.meta.env.VITE_FIGMA_PLUGIN_ID,
          },
          "https://www.figma.com",
        );

        // Open popup with write key:
        window.open(
          `${location.origin}${location.pathname}?writeKey=${writeKey}`,
          "_blank",
          "popup",
        );
      } else {
        setError(
          new Error(
            `Error creating access token keys: ${(errors ?? []).join(",")}`,
          ),
        );
      }
    } else {
      setError(
        new Error(
          `Error creating access token keys: ${response.status} ${response.statusText}`,
        ),
      );
    }
  };

  return (
    <div>
      {!accessToken && !figma && (
        <a href={`${githubOAuthURL}&state=${writeKey}`}>Sign in with GitHub</a>
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
