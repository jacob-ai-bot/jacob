import { type Message, useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";
import { type Project } from "~/server/db/tables/projects.table";
import { toast } from "react-toastify";
import Artifact from "./Artifact";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { trpcClient } from "~/trpc/client";
import LoadingIndicator from "../../components/LoadingIndicator";
import { LoadingCard } from "./LoadingCard";
import { type Evaluation } from "~/server/api/routers/chat";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faStop } from "@fortawesome/free-solid-svg-icons";

interface ChatProps {
  project: Project;
  contextItems: ContextItem[];
  org: string;
  repo: string;
}

export interface CodeFile {
  path: string;
  content: string;
}

const CHAT_INPUT_HEIGHT = "40px";

export function Chat({ project, contextItems, org, repo }: ChatProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactFileName, setArtifactFileName] = useState<string>("");
  const [artifactLanguage, setArtifactLanguage] = useState<string>("");
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(
    null,
  );
  const [artifactFilePath, setArtifactFilePath] = useState<string>("");
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const [showLoadingCard, setShowLoadingCard] = useState(false);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat/v2",
      body: {
        projectId: project.id,
        org,
        repo,
      },
      initialMessages: [
        {
          id: "1",
          role: "system",
          content:
            "Hi, I'm JACoB. I can answer questions about your codebase. Ask me anything!",
        },
      ],
      onResponse: async () => {
        setHasStartedStreaming(true);
      },
      onError: (error) => {
        console.error("Error in chat", error);
        toast.error(`Error in chat: ${error.message}`);
      },
      onToolCall: async ({ toolCall }) => {
        console.log("toolCall", toolCall);
        setHasStartedStreaming(false);
        const toolCallArgs = toolCall.args as {
          fileName: string;
          content: string;
          language: string;
          filePath: string;
        };
        const { fileName, content, language, filePath } = toolCallArgs;
        setArtifactContent(content);
        setArtifactFileName(fileName);
        setArtifactLanguage(language);
        setArtifactFilePath(filePath);
      },
      onFinish: () => {
        setHasStartedStreaming(false);
        setIsCreatingArtifact(false);
        setCurrentEvaluation(null);
      },
      keepLastMessageOnError: true,
    });

  const [textareaHeight, setTextareaHeight] = useState(CHAT_INPUT_HEIGHT);
  const [mounted, setMounted] = useState(false);
  const [heights, setHeights] = useState(new Array(40).fill(20));
  const [maxHeight, setMaxHeight] = useState(0);
  const [sttTranscript, setSttTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const evaluateChatMessage = api.chat.evaluateChatMessage.useMutation();

  // Speech Recognition Setup
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.interimResults = false;
        recognitionRef.current.maxAlternatives = 1;
        recognitionRef.current.continuous = true;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          if (event.results?.length) {
            let transcript = "";
            for (const result of event.results) {
              transcript += result[0]!.transcript;
            }
            if (transcript) {
              setSttTranscript(transcript);
            }
          }
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          console.error("Speech recognition error:", event.error);
          toast.error(`Speech recognition error: ${event.error}`);
          setIsRecording(false);
          setWaveformActive(false);
        };
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
      toast.warn("Speech Recognition API not supported in this browser.");
    }

    setMounted(true);
  }, [setSttTranscript]);

  useEffect(() => {
    if (isRecording) {
      // Setup audio context and analyser
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      let animationFrameId: number;
      void navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128; // Increased from 64 to 128 to accommodate 40 bars
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateHeights = () => {
            analyser.getByteFrequencyData(dataArray);
            const maxFrequency = Math.max(...Array.from(dataArray));
            setMaxHeight(maxFrequency);
            setHeights(Array.from(dataArray).slice(0, 40));
            animationFrameId = requestAnimationFrame(updateHeights);
          };
          updateHeights();
        });
      // Cleanup function
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (audioCtx) void audioCtx.close();
      };
    }
  }, [isRecording]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setSttTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
      setWaveformActive(true);
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false); // Update state to stop recording
      setWaveformActive(false);
      recognitionRef.current.stop();
      handleInputChange({
        target: { value: sttTranscript },
        nativeEvent: {
          data: sttTranscript,
        } as unknown as Event,
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setHasStartedStreaming(false);
    setIsEvaluating(true);
    const text = textareaRef.current?.value ?? "";
    textareaRef.current!.disabled = true;
    textareaRef.current!.style.height = CHAT_INPUT_HEIGHT;
    textareaRef.current!.style.opacity = "0.5";

    const newMessage = {
      role: "user",
      content: text,
    };
    const newMessages = [...messages, newMessage];
    const evaluation = await evaluateChatMessage.mutateAsync({
      codeFileStructureContext: contextItems
        .map((item) => `${item.file} - ${item.overview}`)
        .join("\n"),
      messages: newMessages,
    });
    if (evaluation.shouldCreateArtifact) {
      setCurrentEvaluation(evaluation);
      setTimeout(() => {
        setIsCreatingArtifact(true);
      }, 1000);
    }
    if (evaluation.filesToUse) {
      const codeFileResponse =
        (await trpcClient.github.fetchFileContents.query({
          org,
          repo,
          branch: "main",
          filePaths: evaluation.filesToUse,
        })) ?? [];
      evaluation.codeFiles = codeFileResponse.map(
        (file) => `\`\`\` ${file.path}\n\n${file.content}\n\`\`\``,
      );

      setCodeFiles(
        codeFileResponse.map((file) => ({
          path: file.path ?? "",
          content: file.content ?? "",
        })),
      );
    }

    handleSubmit(e, {
      body: {
        evaluateChatMessageData: JSON.stringify(evaluation),
      },
    });

    setSttTranscript("");
    setIsEvaluating(false);
    setTextareaHeight(CHAT_INPUT_HEIGHT);
    textareaRef.current!.value = "";
    textareaRef.current!.disabled = false;
    textareaRef.current!.style.height = CHAT_INPUT_HEIGHT;
    textareaRef.current!.style.opacity = "1";
    textareaRef.current!.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("handleTextareaChange", e);
    handleInputChange(e);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_HEIGHT;
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
      setTextareaHeight(`${Math.min(scrollHeight, 200)}px`);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isCreatingArtifact) {
      const timer = setTimeout(() => {
        setShowLoadingCard(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowLoadingCard(false);
    }
  }, [isCreatingArtifact]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full flex-row space-x-4">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-row overflow-clip rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
        <div className="mx-auto mr-4 flex flex-1 flex-col">
          <div className="hide-scrollbar mb-4 flex-1 overflow-y-auto">
            {messages.map((m: Message, index: number) => (
              <div
                key={m.id}
                className={`mb-4 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] rounded-lg p-2 ${
                    m.role === "user"
                      ? "bg-aurora-50 text-dark-blue dark:bg-sky-500/40"
                      : "bg-white text-dark-blue dark:bg-slate-700 dark:text-slate-100"
                  }`}
                >
                  <MarkdownRenderer className={`markdown-chat px-1`}>
                    {m.content}
                  </MarkdownRenderer>
                  {isCreatingArtifact &&
                    index === messages.length - 1 &&
                    m.role === "assistant" && (
                      <AnimatePresence>
                        {showLoadingCard && (
                          <motion.div
                            className="m-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <LoadingCard evaluation={currentEvaluation} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                </div>
              </div>
            ))}
            {(isLoading || isEvaluating) && !hasStartedStreaming && (
              <div className="flex justify-start">
                <div className="inline-block max-w-[80%] rounded-lg bg-white/20 p-2 text-dark-blue dark:bg-slate-700 dark:text-slate-100">
                  <LoadingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={async (e) => {
              await onSubmit(e);
            }}
            className="relative flex flex-col"
          >
            <motion.div
              className={`${
                waveformActive
                  ? "border-aurora-500/50 bg-gradient-to-r from-aurora-500/30 via-aurora-50/30 to-aurora-500/30 text-transparent"
                  : ""
              } flex w-full items-center rounded-2xl border border-aurora-100 bg-aurora-50/30 dark:border-sky-600/30 dark:bg-slate-700`}
              animate={{
                padding: waveformActive ? "1.5rem" : "0.375rem",
              }}
              transition={{ duration: 0.3 }}
            >
              <textarea
                ref={textareaRef}
                className={`${
                  waveformActive
                    ? "text-red-500"
                    : "text-dark-blue dark:text-slate-100"
                } hide-scrollbar m-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 transition-all focus:ring-0 focus-visible:ring-0 `}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.metaKey) {
                    e.preventDefault();
                    void onSubmit(
                      e as unknown as React.FormEvent<HTMLFormElement>,
                    );
                  }
                }}
                placeholder={waveformActive ? "" : "Type your message..."}
                rows={1}
                style={{ height: textareaHeight }}
                disabled={waveformActive}
              />
              <div className="flex flex-row space-x-4">
                <button
                  type="button"
                  className={`${
                    waveformActive
                      ? "mr-5 text-blossom-500 hover:text-blossom-700"
                      : "text-aurora-500 hover:text-aurora-600"
                  } transform text-xl   dark:text-gray-300 dark:hover:text-gray-500`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={
                    isRecording ? "Stop recording" : "Start recording"
                  }
                >
                  <FontAwesomeIcon
                    icon={isRecording ? faStop : faMicrophone}
                    size={isRecording ? "2x" : "1x"}
                  />
                </button>
                <button
                  type="submit"
                  className={`${
                    waveformActive ? "hidden" : ""
                  } flex h-8 w-8 items-center justify-center rounded-full bg-aurora-500 text-white transition-colors hover:bg-aurora-600 focus-visible:outline-none disabled:bg-gray-300 dark:bg-sky-600 dark:hover:bg-sky-700 dark:disabled:bg-gray-600`}
                  disabled={
                    !input.trim() || isLoading || isEvaluating || waveformActive
                  }
                  aria-label="Send message - or use cmd + enter"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M11.3939 6.67973C11.7286 6.34499 12.2714 6.34499 12.6061 6.67973L16.4633 10.537C16.798 10.8717 16.798 11.4145 16.4633 11.7492C16.1286 12.084 15.5857 12.084 15.251 11.7492L12.8571 9.35534V16.7143C12.8571 17.1877 12.4734 17.5714 12 17.5714C11.5266 17.5714 11.1429 17.1877 11.1429 16.7143V9.35534L8.74902 11.7492C8.41428 12.084 7.87144 12.084 7.53669 11.7492C7.20195 11.4145 7.20195 10.8717 7.53669 10.537L11.3939 6.67973Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
              {waveformActive && (
                <div className="absolute left-1/2 top-5 flex -translate-x-1/2 transform justify-center">
                  <div className="flex">
                    {heights.map((height, index) => {
                      // Calculate a factor based on distance from the center
                      const centerIndex = heights.length / 2;
                      const distanceFromCenter = Math.abs(index - centerIndex);
                      const maxDistance = heights.length / 2;
                      const factor = 1 - distanceFromCenter / maxDistance;

                      // Apply the factor to the height
                      const adjustedHeight =
                        index > 0 ? Math.round(height * factor * 1.3) : 0; // Increased multiplier for more pronounced effect

                      return (
                        <motion.div
                          key={index}
                          className={`w-1 rounded-full ${
                            adjustedHeight > 100
                              ? "bg-aurora-500"
                              : adjustedHeight > 50
                                ? "bg-aurora-500/80"
                                : "bg-aurora-500/40"
                          }`}
                          style={{
                            height: "50px",
                            transformOrigin: "center",
                            marginLeft: `${Math.max(Math.round(maxHeight / 30), 6)}px`, // Adjusted for more bars
                          }}
                          animate={{
                            scaleY: Math.max(adjustedHeight, 20) / 128,
                          }}
                          transition={{
                            duration: 0.01,
                            ease: "easeInOut",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </form>
        </div>
      </div>
      {artifactContent && (
        <Artifact
          content={artifactContent}
          fileName={artifactFileName}
          language={artifactLanguage}
          codeFiles={codeFiles}
          filePath={artifactFilePath}
        />
      )}
    </div>
  );
}
