import { ChatCompletionStreamingRunner } from "openai/lib/ChatCompletionStreamingRunner";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { type Message, Role, type Developer } from "~/types";
import { Chat } from "./Chat";
import { type Todo } from "~/server/api/routers/events";
import { toast } from "react-toastify";

const DEFAULT_PROMPT = "What can I help you with today?";

type Props = {
  developer: Developer | undefined;
  todo: Todo | undefined;
  handleCreateNewTask: (messages: Message[]) => void;
  handleUpdateIssue: (messages: Message[]) => void;
  headerHeight?: number;
};

export interface ChatComponentHandle {
  handleChat: (message: Message) => void;
  resetChat: (messages?: Message[]) => void;
  setLoading: (isLoading: boolean) => void;
}

const ChatComponentInner: React.ForwardRefRenderFunction<
  ChatComponentHandle,
  Props
> = (
  { developer, todo, handleCreateNewTask, handleUpdateIssue, headerHeight = 0 },
  ref,
) => {
  useImperativeHandle(ref, () => ({
    handleChat(message: Message) {
      void handleSend(message);
    },
    resetChat(messages?: Message[]) {
      void handleReset(messages);
    },
    setLoading(isLoading: boolean) {
      void setLoading(isLoading);
    },
  }));

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [responding, setResponding] = useState<boolean>(false);
  const [height, setHeight] = useState<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
  };

  const checkIfAtBottom = () => {
    if (!sidebarRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = sidebarRef.current;
    const _isAtBottom = scrollHeight - scrollTop <= clientHeight + 120; // give a little buffer so the arrow isn't covering action items
    setIsAtBottom(_isAtBottom);
  };

  useEffect(() => {
    const chatSidebar = sidebarRef.current;
    if (!chatSidebar) return;

    chatSidebar.addEventListener("scroll", checkIfAtBottom);

    return () => {
      chatSidebar.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [sidebarRef]);

  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight - headerHeight;
      setHeight(windowHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [headerHeight]);

  useEffect(() => {
    if (messages?.length > 0 && messagesEndRef.current && isAtBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleReset = (_messages?: Message[]) => {
    if (_messages) {
      setMessages(_messages);
    } else {
      setMessages([
        {
          role: Role.ASSISTANT,
          content: DEFAULT_PROMPT,
        },
      ]);
    }
  };

  const handleSend = async (message: Message) => {
    try {
      const updatedMessages = [...messages, message];

      setMessages(updatedMessages);
      setLoading(true);
      setResponding(true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          prompt,
          todo,
          developer,
        }),
      });
      setLoading(false);

      if (!response.ok || !response.body) {
        throw new Error(response.statusText);
      }

      const runner = ChatCompletionStreamingRunner.fromReadableStream(
        response.body,
      );
      if (!runner) {
        throw new Error("No reader");
      }
      let completedText = "";
      let isFirst = true;

      while (!runner.ended) {
        for await (const chunk of runner) {
          // The chunk is already a parsed object, but let's ensure it's in the expected format
          if (!chunk.choices[0]?.delta) {
            continue;
          }
          const chunkValue = chunk.choices[0].delta.content ?? ""; // Assuming chunk.data is the content we're interested in

          completedText += chunkValue;
          if (isFirst) {
            isFirst = false;
            setMessages((messages) => [
              ...messages,
              {
                role: Role.ASSISTANT,
                content: chunkValue,
              },
            ]);
          } else {
            setMessages((messages) => {
              const lastMessage = messages[messages.length - 1];

              if (lastMessage) {
                const updatedMessage = {
                  ...lastMessage,
                  content: completedText,
                };
                return [...messages.slice(0, -1), updatedMessage];
              }
              return messages;
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while processing your request");
    } finally {
      setLoading(false);
      setResponding(false);
    }
  };
  return (
    <div className="flex h-full flex-col" style={{ height }}>
      <Chat
        messages={messages}
        loading={loading}
        onSend={handleSend}
        onReset={handleReset}
        onCreateNewTask={handleCreateNewTask}
        onUpdateIssue={handleUpdateIssue}
        isResponding={responding}
        messagesEndRef={messagesEndRef}
        scrollToBottom={scrollToBottom}
        isAtBottom={isAtBottom}
        sidebarRef={sidebarRef}
        checkIfAtBottom={checkIfAtBottom}
      />
    </div>
  );
};

const ChatComponent = forwardRef(ChatComponentInner);
export default ChatComponent;
