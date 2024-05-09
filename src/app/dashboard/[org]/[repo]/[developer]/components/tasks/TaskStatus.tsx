import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { TaskStatus, type Task } from "~/types";

// Constants for simplicity, these would be dynamically calculated in a real-world application
const SPRINT_DURATION = 10;

const calculateVelocity = (tasks: Task[]): number => {
  const completedTasks = tasks.filter(
    (task) => task.status === TaskStatus.DONE,
  );
  const totalPoints = completedTasks.reduce(
    (acc, task) => acc + task.storyPoints,
    0,
  );
  return totalPoints / SPRINT_DURATION;
};

interface TaskStatusProps {
  tasks: Task[];
}

export const TaskStatusComponent = ({ tasks }: TaskStatusProps) => {
  const [collapsed, setCollapsed] = useState(true);

  const completedTasks = tasks.filter(
    (task) => task.status === TaskStatus.DONE,
  );
  const inProgressTasks = tasks.filter(
    (task) => task.status === TaskStatus.IN_PROGRESS,
  );

  const totalProgress = useMemo(
    () =>
      ((completedTasks?.length ?? 0) / (inProgressTasks?.length || 1)) * 100,
    [inProgressTasks, completedTasks],
  );
  const velocity = useMemo(
    () => calculateVelocity(inProgressTasks),
    [inProgressTasks],
  );

  return (
    <div className="border-b border-blueGray-700 bg-blueGray-700/20 pb-1 text-blueGray-300  transition-all duration-300">
      <header className="flex items-center justify-between border-b-2 border-blueGray-700/20 bg-blueGray-900/20 px-4 py-2">
        <h2 className="text-md font-bold ">Task Progress</h2>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hover:text-green-500"
        >
          <FontAwesomeIcon
            icon={collapsed ? faChevronUp : faChevronDown}
            size="xs"
          />
        </button>
      </header>

      {!collapsed && (
        <div className="px-4 py-2">
          <div className="mb-2 flex items-center justify-between text-blueGray-300">
            <div className="text-sm">0%</div>
            <p className="text-[8pt] text-blueGray-400">Tasks Completed</p>
            <div className="text-sm">100%</div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-coolGray-600">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-blueGray-700/70 p-2 backdrop-blur-md">
              <p className=" text-[10px] text-light-blue">Sprint Progress</p>
              <p className="text-lg font-semibold text-coolGray-300">
                {Math.round(velocity * 100)}%
              </p>
            </div>
            <div className="rounded-md bg-blueGray-700/70 p-2 backdrop-blur-md">
              <p className="text-[10px] text-orange">Task Complete</p>
              <p className="text-lg font-semibold text-coolGray-300">
                {completedTasks.length}/{tasks.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-row justify-center space-x-2 px-4 py-2 align-middle">
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-coolGray-600">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
          <p className="flex h-6 w-8 items-center justify-center rounded-full bg-light-blue/50 p-1 text-[8px] font-semibold text-coolGray-300">
            {Math.round(velocity * 100)}
          </p>
          <p className="flex h-6 w-8 items-center justify-center rounded-full bg-orange p-1 text-[8px] font-semibold text-coolGray-900">
            {completedTasks.length}/{tasks.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskStatusComponent;
