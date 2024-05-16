import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { type Todo } from "~/server/api/routers/events";
import Markdown from "react-markdown";
import gfm from "remark-gfm";

interface Props {
  todo: Todo;
  onStart: (todoId: string) => void;
  onEdit?: (todoId: string, newName: string) => void;
}
export const DetailedTodoCard: React.FC<Props> = ({ todo, onStart }) => {
  const description = todo.description
    ? todo.description.replace("```", "~~~")
    : "";
  return (
    <div className="relative m-2 cursor-pointer rounded-md border-2 border-light-blue/50 bg-gradient-to-r from-blueGray-500/50 to-coolGray-600/50 p-3 shadow-sm shadow-dark-blue transition-all duration-300 hover:shadow-md">
      <div className="flex items-center text-coolGray-50">
        <h3 className="truncate text-sm font-medium">{todo.name}</h3>
      </div>
      <div className="markdown mt-1 overflow-hidden overflow-ellipsis text-xs text-slate-300">
        <Markdown remarkPlugins={[gfm]} className={`px-1 py-1`}>
          {description.length > 300
            ? `${description.slice(0, 500)}...`
            : description}
        </Markdown>
      </div>
      <div className="mt-2">
        <button
          onClick={() => onStart(todo.id)}
          className="w-full justify-center rounded bg-slate-600 px-3 py-1 align-middle text-xs font-medium text-coolGray-50 shadow transition duration-300 ease-in-out hover:bg-green-600"
        >
          <FontAwesomeIcon icon={faPlay} className="mb-0.5 h-2 w-2" />
          <span className="ml-1">Start</span>
        </button>
      </div>
    </div>
  );
};

export default DetailedTodoCard;
