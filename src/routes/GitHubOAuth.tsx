"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCookies } from "react-cookie";
import GitHubButton from "react-github-btn";

import "./GitHubOAuth.css";

const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=user`;

type AuthJSONResponse = {
  data?: { token: string };
  errors?: Array<{ message: string }>;
};

type CreateAccessTokenResponse = {
  data?: { readKey: string; writeKey: string };
  errors?: Array<{ message: string }>;
};

type ReadAccessTokenResponse = {
  data?: { accessToken: string };
  errors?: Array<{ message: string }>;
};

const READ_KEY_POLLING_INTERVAL_MS = 5000;

export function GitHubOAuth({ redirectURI }: { redirectURI: string }) {
  const [error, setError] = useState<Error | undefined>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [attemptedLogin, setAttemptedLogin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [readKey, setReadKey] = useState<string | undefined>();
  const [writeKey, setWriteKey] = useState<string | undefined>();
  const [cookies, setCookie] = useCookies(["writeKey"]);

  const code = searchParams?.get("code");
  const state = searchParams?.get("state");
  const figma = searchParams?.get("figma");
  const writeKeyParam = searchParams?.get("writeKey");

  // Remove the writeKey from the URL
  // after storing it in state and writing it to a cookie
  useEffect(() => {
    if (!writeKeyParam) return;

    setWriteKey(writeKeyParam);
    setCookie("writeKey", writeKeyParam);

    const nextSearchParams = new URLSearchParams(
      searchParams?.toString() ?? "",
    );
    nextSearchParams.delete("writeKey");

    router.replace(`${pathname}?${nextSearchParams.toString()}`);
  }, [pathname, redirectURI, router, searchParams, setCookie, writeKeyParam]);

  useEffect(() => {
    if (!readKey) return;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/accessToken/${readKey}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const { data, errors } =
            (await response.json()) as ReadAccessTokenResponse;
          if (data) {
            const { accessToken } = data;
            setAccessToken(accessToken);
            parent.postMessage(
              {
                pluginMessage: ["SAVE_ACCESS_TOKEN", accessToken],
                pluginId: process.env.NEXT_PUBLIC_FIGMA_PLUGIN_ID as unknown,
              },
              "https://www.figma.com",
            );
            console.log(
              "access token found, posted message to parent, stopping polling loop",
            );
            clearInterval(intervalId);
            setReadKey(undefined);
          } else {
            console.error(
              `read key found, but no access token: ${errors
                ?.map((e) => e.message)
                .join(",")}`,
            );
          }
        } else {
          console.log(
            `read key not found ${response.status} ${response.statusText}, will try again`,
          );
        }
      } catch (error) {
        console.error(error);
        setError(error as Error);
      }
    }, READ_KEY_POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [readKey]);

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
          const { data } =
            (await accessTokenResponse.json()) as AuthJSONResponse;
          const accessToken = data?.token;
          setAccessToken(accessToken);

          setError(undefined);

          const nextSearchParams = new URLSearchParams(
            searchParams?.toString() ?? "",
          );
          nextSearchParams.delete("code");

          router.replace(`${pathname}?${nextSearchParams.toString()}`);

          if (state !== cookies.writeKey) {
            setError(
              new Error(
                `State does not match writeKey cookie: ${state} ${cookies.writeKey}`,
              ),
            );
            return;
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
      void handleLogin(code);
    }

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const { data, errors } =
        (await response.json()) as CreateAccessTokenResponse;
      if (data) {
        const { readKey, writeKey } = data;
        // Store read key, which will start a polling loop waiting for the access token:
        setReadKey(readKey);

        // Open popup with write key:
        window.open(
          `${location.origin}${location.pathname}?writeKey=${writeKey}`,
          "_blank",
          "popup",
        );
      } else {
        setError(
          new Error(
            `Error creating access token keys: ${(errors ?? [])
              .map(({ message }) => message)
              .join(",")}`,
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
    <div
      className={
        figma ? "figmacontainer" : "webcontainer p-4 sm:px-40 sm:py-24"
      }
    >
      <img
        src="/images/logo.svg"
        className="logo mb-4 h-[50px] w-auto sm:h-[100px]"
        alt="logo"
      />
      {!accessToken && !figma && (
        <>
          <p className="description">
            JACoB, your AI coding assistant, bridges design and development by
            translating Figma designs into GitHub issues and PRs.
          </p>
          <div className="mt-4 flex scale-100 sm:scale-[2]">
            <GitHubButton
              href={`${githubOAuthURL}&state=${writeKey}&redirect_uri=${redirectURI}`}
            >
              Sign in with GitHub
            </GitHubButton>
          </div>

          <p className="instruction">
            Connect your design to code with one click. Authenticate with GitHub
            to enable seamless issue and PR creation in your repository.
          </p>
        </>
      )}
      {!accessToken && figma && (
        <>
          <p className="mb-4">
            To link your Figma designs directly to code, start by connecting to
            GitHub.
          </p>
          <a className="figmalink" onClick={handleFigmaSignin}>
            Click here to authenticate in your browser and begin the
            integration.
          </a>
        </>
      )}
      {accessToken && (
        <>
          <p>Signed in successfully</p>
          {!figma && (
            <p>You can now close this browser window and return to Figma.</p>
          )}
        </>
      )}
      {error && <p>{error.message}</p>}
    </div>
  );
}
