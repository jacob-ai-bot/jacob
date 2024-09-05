"use client";
import React from "react";
import { type Developer } from "~/types";
import { DEVELOPERS } from "~/data/developers";
import DeveloperCard from "./DeveloperCard";
import { useRouter } from "next/navigation";

interface DevelopersGridProps {
  org: string;
  repo: string;
}

// Main Component to display developers in a grid
const DevelopersGrid: React.FC<DevelopersGridProps> = ({ org, repo }) => {
  const router = useRouter();
  const onSelectDeveloper = (developer: Developer) => {
    router.push(`/dashboard/${org}/${repo}/${developer.id}`);
  };

  return (
    <>
      <h1 className="mt-2 text-center font-figtree text-white">
        Choose a Developer
      </h1>
      <div className="mx-auto flex max-w-[1000px] flex-wrap justify-center p-8">
        {DEVELOPERS.map((developer) => (
          <DeveloperCard
            key={developer.name}
            developer={developer}
            onSelectDeveloper={onSelectDeveloper}
          />
        ))}
      </div>
    </>
  );
};

export default DevelopersGrid;
