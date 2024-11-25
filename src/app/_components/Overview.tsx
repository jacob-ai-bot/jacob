import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const Card = ({ title, imageSrc, altText, description, onClick }) => (
  <div className="m-4 h-96 w-80 rounded-xl border border-gray-300 bg-white">
    <div className="p-4">
      <div className="text-lg font-medium leading-6 text-gray-900">{title}</div>
      <img
        src={imageSrc}
        alt={altText}
        className="my-4 h-48 w-full border border-gray-200"
      />
      <p className="text-sm leading-5 text-gray-600">{description}</p>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClick}
          className="flex h-10 w-20 items-center justify-center rounded-full bg-aurora-500 text-white"
        >
          View <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </button>
      </div>
    </div>
  </div>
);

const Overview = () => {
  const handleClick = (title) => {
    console.log(`View clicked for ${title}`);
  };

  return (
    <div className="flex flex-wrap justify-center">
      <Card
        title="Explore the codebase"
        imageSrc="/images/5305e765f100cd3dc64126eae81f83012becd391.png"
        altText="Explore the codebase"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
        onClick={() => handleClick("Explore the codebase")}
      />
      <Card
        title="Use AI to write issues"
        imageSrc="/images/ae06f5fe554906c0c182f3e4f9a3026947bdeb03.png"
        altText="Use AI to write issues"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
        onClick={() => handleClick("Use AI to write issues")}
      />
      <Card
        title="Research & plan tasks"
        imageSrc="/images/8abae5e1733d7e1563352136f695f9ddab66574d.png"
        altText="Research & plan tasks"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
        onClick={() => handleClick("Research & plan tasks")}
      />
      <Card
        title="Build features autonomously"
        imageSrc="/images/8bad767c4c3c7c14027253f7da3afa042cec492d.png"
        altText="Build features autonomously"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
        onClick={() => handleClick("Build features autonomously")}
      />
    </div>
  );
};

export default Overview;
