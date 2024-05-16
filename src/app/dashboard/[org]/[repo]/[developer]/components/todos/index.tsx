import { DragDropContext, Draggable, type DropResult } from "@hello-pangea/dnd";
import Droppable from "./Droppable";

import { DetailedTodoCard } from "./DetailedTodoCard";
import { TodoCard } from "./TodoCard";
import { type Todo } from "~/server/api/routers/events";
import { TodoStatus } from "~/server/db/enums";
import { TodoStatusComponent } from "./TodoStatus";

interface TodosProps {
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  onStart: (todoId: string) => void;
  onNewTodoSelected: (todo: Todo) => void;
  isLoading?: boolean;
}

const Todos: React.FC<TodosProps> = ({
  todos = [],
  onStart,
  onNewTodoSelected,
  setTodos,
  isLoading = false,
}) => {
  const handleDragEnd = (result: DropResult) => {
    console.log("Drag end", result);
    if (!result.destination) {
      return;
    }
    if (!todos?.length) {
      console.log("No todos");
      return;
    }

    const newTodos = Array.from(todos);
    const [removed] = newTodos.splice(result.source.index, 1);
    if (!removed) {
      console.log("No todo removed");
      return;
    }
    newTodos.splice(result.destination.index, 0, removed);

    // If the first todo has changed, call onNewTodoSelected
    if (todos[0] !== newTodos[0] && newTodos[0]) {
      onNewTodoSelected(newTodos[0]);
    }

    setTodos(newTodos);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center space-x-2 space-y-4 border-x border-coolGray-400/20 bg-gray-900 bg-slate-50/5 text-2xl text-blueGray-500">
        <div>Loading...</div>
        <div className="flex flex-row items-center justify-center space-x-2">
          <div className="h-6 w-6 animate-bounce rounded-full bg-light-blue [animation-delay:-0.3s]"></div>
          <div className="h-6 w-6 animate-bounce rounded-full bg-pink [animation-delay:-0.15s]"></div>
          <div className="h-6 w-6 animate-bounce rounded-full bg-orange"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-screen w-full grid-rows-[1fr_auto] border-x border-coolGray-400/20 bg-gray-900 bg-slate-50/5">
      <div className="hide-scrollbar overflow-auto">
        {todos.filter((t) => t.status === TodoStatus.TODO).length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="todos">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <h2 className="mt-2 px-2 font-bold text-light-blue">
                    Next Todo
                  </h2>
                  {todos
                    .filter((t) => t.status === TodoStatus.TODO)
                    .map((todo, index) => (
                      <Draggable
                        key={todo.id}
                        draggableId={todo.id.toString()}
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
                                  <DetailedTodoCard
                                    todo={todo}
                                    onStart={onStart}
                                  />
                                </div>
                                <h2 className="my-2 ml-2 text-sm text-indigo-100/50">
                                  Suggested Todos
                                </h2>
                              </>
                            ) : (
                              <TodoCard todo={todo} />
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
            <h2 className="mb-4 text-2xl text-gray-200">No todos available</h2>
            <p className="text-gray-400">Chat with JACoB to get started</p>
          </div>
        )}
      </div>
      <div className="border-t-2 border-coolGray-400/20 ">
        <TodoStatusComponent todos={todos} />
      </div>
    </div>
  );
};

export default Todos;

// TODO: add the delete button back in
/* <button
    onClick={() => {
    if (
        window.confirm(
        "Are you sure you want to remove this todo?",
        )
    ) {
        onRemove(todo.id);
    }
    }}
    className="absolute left-1 top-0 text-red-500"
>
    <FontAwesomeIcon icon={faTimes} />
</button> */
