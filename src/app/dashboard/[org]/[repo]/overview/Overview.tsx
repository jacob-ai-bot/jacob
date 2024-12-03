"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import Modal from "react-modal";

interface CardProps {
  title: string;
  imageSrc: string;
  altText: string;
  description: string;
  onClick: () => void;
}

const Card = ({
  title,
  imageSrc,
  altText,
  description,
  onClick,
}: CardProps) => (
  <div className="m-4 h-96 w-80 rounded-xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
    <div className="p-4">
      <div className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
        {title}
      </div>
      <img
        src={imageSrc}
        alt={altText}
        className="my-4 h-48 w-full border border-gray-200 bg-white dark:border-gray-700"
      />
      <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">
        {description}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClick}
          className="flex h-10 w-20 items-center justify-center rounded-full bg-aurora-500 text-white hover:bg-aurora-600"
        >
          View <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </button>
      </div>
    </div>
  </div>
);

const OverviewComponent = ({
  org,
  repo,
  isAuthorized = false,
}: {
  org: string;
  repo: string;
  isAuthorized: boolean;
}) => {
  const router = useRouter();
  const showModal = !isAuthorized;

  const handleClick = (title: string) => {
    router.push(`/dashboard/${org}/${repo}/${title.toLowerCase()}`);
  };

  const handleCloseModal = () => {
    window.location.href = "https://www.jacb.ai";
  };

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "80%",
      padding: "20px",
      borderRadius: "8px",
      border: "none",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      zIndex: 99999,
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 9999,
    },
  };

  return (
    <>
      <Modal
        isOpen={showModal}
        onRequestClose={handleCloseModal}
        style={customStyles}
        contentLabel="Access Restriction"
        ariaHideApp={false}
      >
        <div className="flex flex-col items-center">
          <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
            Access Restricted
          </h2>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">
            JACoB is currently in private beta. Please contact info@jacb.ai to
            request access.
          </p>
          <button
            onClick={handleCloseModal}
            className="flex h-10 w-20 items-center justify-center rounded-full bg-aurora-500 text-white hover:bg-aurora-600"
          >
            OK
          </button>
        </div>
      </Modal>

      <div className="flex flex-wrap justify-center">
        <Card
          title="Explore the codebase"
          imageSrc="/images/5305e765f100cd3dc64126eae81f83012becd391.png"
          altText="Explore the codebase"
          description="Dive deep into your codebase with interactive visualizations to better understand your code."
          onClick={() => handleClick("code-visualizer")}
        />
        <Card
          title="Use AI to write issues"
          imageSrc="/images/ae06f5fe554906c0c182f3e4f9a3026947bdeb03.png"
          altText="Use AI to write issues"
          description="Leverage AI assistance to generate well-structured issues for your project effortlessly."
          onClick={() => handleClick("issue-writer")}
        />
        <Card
          title="Research & plan tasks"
          imageSrc="/images/8abae5e1733d7e1563352136f695f9ddab66574d.png"
          altText="Research & plan tasks"
          description="Organize your tasks with our intuitive planning tools to keep your projects on track."
          onClick={() => handleClick("todos")}
        />
        <Card
          title="Build features autonomously"
          imageSrc="/images/8bad767c4c3c7c14027253f7da3afa042cec492d.png"
          altText="Build features autonomously"
          description="Accelerate development by allowing JACoB to autonomously build new features."
          onClick={() => handleClick("assigned-tasks")}
        />
      </div>
    </>
  );
};

export default OverviewComponent;
