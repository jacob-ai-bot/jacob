"use client";
function FinishedPage() {
  const handleFigmaClick = () => {
    window.open(
      "https://www.figma.com/community/file/1339388263795075198",
      "_blank",
    );
  };

  const handleGithubClick = () => {
    window.open(
      "https://github.com/PioneerSquareLabs/jacob-template",
      "_blank",
    );
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-white">
      <div className="mt-16 flex w-3/4 max-w-2xl flex-col items-start">
        <div className="space-y-4">
          <h1 className="text-3xl text-dark-blue">
            Get Started With Your First Project
          </h1>
          <p className="text-base text-gray-600">
            We know getting started is the hardest part, so we’ve made it easy
            with an out-of-the-box project built by JACoB and our community.
          </p>
          <p className="text-base text-gray-600">
            We're also still working on launching the full AI Coding Agent
            dashboard. This will be coming soon, but in the meantime you can use
            the Figma-to-Code version of JACoB to quickly convert designs into
            working code. Simply install the{" "}
            <a
              href="https://www.figma.com/community/plugin/1326684504185921461/jacob-ai-codegen-connector"
              target="_blank"
              className="text-sm text-light-blue underline"
            >
              Figma Plugin
            </a>{" "}
            and follow the tutorial below to get started.
          </p>
        </div>
        <div className="mt-8 self-start">
          <a
            href="https://www.figma.com/community/plugin/1326684504185921461/jacob-ai-codegen-connector"
            target="_blank"
            className="mb-6 block text-lg text-dark-blue underline"
          >
            Install Figma Plugin
          </a>{" "}
          <h2 className="mb-2  text-lg text-dark-blue">Starter Files</h2>
          <div className="mb-2 flex items-center">
            <div className="flex h-6 w-6 items-center justify-center">
              <img
                src="/images/figma.png"
                alt="Figma logo"
                className="h-6 w-6"
                onClick={handleFigmaClick}
              />
            </div>
            <a
              href="https://www.figma.com/community/file/1339388263795075198"
              className="ml-2 text-sm text-light-blue underline"
              onClick={handleFigmaClick}
            >
              Figma Files
            </a>
          </div>
          <div className="flex items-center">
            <div className="flex h-6 w-6 items-center justify-center">
              <img
                src="/images/github.png"
                alt="Github logo"
                className="h-6 w-6"
                onClick={handleGithubClick}
              />
            </div>
            <a
              href="https://github.com/PioneerSquareLabs/jacob-template"
              className="ml-2 text-sm text-light-blue underline"
              onClick={handleGithubClick}
            >
              Github Repo
            </a>
          </div>
        </div>
        <div className="mt-8 w-full">
          <h2 className="mb-2 text-lg text-dark-blue">Video</h2>
          <div className="relative h-96 w-full overflow-hidden rounded-lg">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/P9z7vmBMl6Q?si=CT6YiySCD51B4sk1"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinishedPage;
