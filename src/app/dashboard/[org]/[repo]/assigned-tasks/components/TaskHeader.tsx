import { motion } from "framer-motion";
import { getTaskStatusColor, getTaskStatusLabel } from "~/app/utils";
import { type Task } from "~/server/api/routers/events";

interface TaskHeaderProps {
  selectedTask: Task | undefined;
}

export const TaskHeader = ({ selectedTask }: TaskHeaderProps) => {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-white/80 p-6 pb-2 backdrop-blur-lg dark:bg-gray-800">
      <div className="flex flex-row items-center space-x-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {selectedTask?.name ?? ""}
        </h2>
        {selectedTask && (
          <div
            className={`inline-flex items-center text-center text-sm font-medium ${getTaskStatusColor(
              selectedTask.status,
            )} whitespace-nowrap rounded-full px-2 py-1`}
          >
            {getTaskStatusLabel(selectedTask.status)}
          </div>
        )}
      </div>
      {selectedTask?.pullRequest && (
        <motion.a
          href={selectedTask.pullRequest.link}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 whitespace-nowrap rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 hover:text-aurora-50 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
        >
          View Pull Request
        </motion.a>
      )}
    </div>
  );
};

export default TaskHeader;
