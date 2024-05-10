import { DragDropContext, Draggable, type DropResult } from "@hello-pangea/dnd";
import Droppable from "./Droppable";

import { SelectedTask } from "./SelectedTask";
import { StandardTask } from "./StandardTask";
import { type Task } from "~/server/api/routers/events";
import { TaskStatus } from "~/server/db/enums";
import { TaskStatusComponent } from "./TaskStatus";

interface TasksProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  onStart: (taskId: string) => void;
  onNewTaskSelected: (task: Task) => void;
  isLoading?: boolean;
}

const Tasks: React.FC<TasksProps> = ({
  tasks = [],
  onStart,
  onNewTaskSelected,
  setTasks,
  isLoading = false,
}) => {
  const handleDragEnd = (result: DropResult) => {
    console.log("Drag end", result);
    if (!result.destination) {
      return;
    }
    if (!tasks?.length) {
      console.log("No tasks");
      return;
    }

    const newTasks = Array.from(tasks);
    const [removed] = newTasks.splice(result.source.index, 1);
    if (!removed) {
      console.log("No task removed");
      return;
    }
    newTasks.splice(result.destination.index, 0, removed);

    // If the first task has changed, call onNewTaskSelected
    if (tasks[0] !== newTasks[0] && newTasks[0]) {
      onNewTaskSelected(newTasks[0]);
    }

    setTasks(newTasks);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center space-x-2 space-y-4 border-x border-coolGray-400/20 bg-gray-900 bg-slate-50/5 text-2xl text-blueGray-500">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-light-blue"></div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-screen w-full grid-rows-[1fr_auto] border-x border-coolGray-400/20 bg-gray-900 bg-slate-50/5">
      <div className="hide-scrollbar overflow-auto">
        {tasks.filter((t) => t.status === TaskStatus.TODO).length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="tasks">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <h2 className="mt-2 px-2 font-bold text-light-blue">
                    Next Task
                  </h2>
                  {tasks
                    .filter((t) => t.status === TaskStatus.TODO)
                    .map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                          >
                            {index === 0 ? (
                              <>
                                <div className="border-b-2 border-coolGray-400/20 p-2">
                                  <SelectedTask task={task} onStart={onStart} />
                                </div>
                                <h2 className="my-2 ml-2 text-sm text-indigo-100/50">
                                  Suggested Tasks
                                </h2>
                              </>
                            ) : (
                              <StandardTask task={task} />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <h2 className="mb-4 text-2xl text-gray-200">No tasks available</h2>
            <p className="text-gray-400">Chat with JACoB to get started</p>
          </div>
        )}
      </div>
      <div className="border-t-2 border-coolGray-400/20 ">
        <TaskStatusComponent tasks={tasks} />
      </div>
    </div>
  );
};

export default Tasks;

// TODO: add the delete button back in
/* <button
    onClick={() => {
    if (
        window.confirm(
        "Are you sure you want to remove this task?",
        )
    ) {
        onRemove(task.id);
    }
    }}
    className="absolute left-1 top-0 text-red-500"
>
    <FontAwesomeIcon icon={faTimes} />
</button> */
