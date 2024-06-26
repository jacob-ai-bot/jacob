import { type Todo } from "~/server/api/routers/events";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";

interface Props {
  todo: Todo;
}

export const TodoCard = ({ todo }: Props) => (
  <div className="relative m-2 flex cursor-move items-center rounded-md bg-gradient-to-r from-blueGray-500/50 to-coolGray-600/50 px-1 py-2 shadow transition-all duration-300 hover:shadow-md">
    <div className="mr-2 text-coolGray-900/60">
      <FontAwesomeIcon icon={faGripVertical} />
    </div>
    <div className="flex-grow overflow-hidden text-coolGray-50">
      <h3 className="truncate whitespace-nowrap text-sm font-medium">
        {todo.name}
      </h3>
    </div>
  </div>
);

export default TodoCard;
