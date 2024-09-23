import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faStop } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const CHAT_INPUT_HEIGHT = "40px";

interface SpeechToTextInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  minHeight?: string;
  placeholder?: string;
}

export function SpeechToTextArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  minHeight = CHAT_INPUT_HEIGHT,
  placeholder = "Type your message...",
}: SpeechToTextInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);
  const [sttTranscript, setSttTranscript] = useState("");
  const [heights, setHeights] = useState(new Array(40).fill(20));
  const [maxHeight, setMaxHeight] = useState(0);
  const [textareaHeight, setTextareaHeight] = useState(minHeight);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          //   toast.error(`Speech recognition error: ${event.error}`);
          setIsRecording(false);
          setWaveformActive(false);
        };
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
      toast.warn("Speech Recognition API not supported in this browser.");
    }
  }, []);

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
          analyser.fftSize = 128;
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

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false);
      setWaveformActive(false);
      recognitionRef.current.stop();
      // Update the parent component's input value
      const event = {
        target: { value: sttTranscript },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
      adjustTextareaHeight();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(e);
    adjustTextareaHeight();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex flex-col"
      style={{
        minHeight: minHeight,
      }}
    >
      <motion.div
        className={`${
          waveformActive
            ? "border-aurora-500/50 bg-gradient-to-r from-aurora-500/30 via-aurora-50/30 to-aurora-500/30 text-transparent"
            : ""
        } flex h-full w-full items-center rounded-2xl border border-aurora-100 bg-aurora-50/30 dark:border-sky-600/30 dark:bg-slate-700`}
        animate={{
          padding: waveformActive ? "1.5rem" : "0.375rem",
        }}
        transition={{ duration: 0.3 }}
      >
        <textarea
          ref={textareaRef}
          className={`${
            waveformActive
              ? "text-transparent"
              : "text-dark-blue dark:text-slate-100"
          } ${isLoading ? "opacity-50" : ""} hide-scrollbar transition-height m-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0`}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey) {
              e.preventDefault();
              void onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
            }
          }}
          placeholder={waveformActive ? "" : placeholder}
          rows={1}
          style={{
            minHeight: waveformActive ? textareaHeight : minHeight,
          }}
          disabled={waveformActive}
        />
        <div className="mt-auto flex flex-row space-x-4">
          <button
            type="button"
            className={`${
              waveformActive
                ? "mr-5 text-blossom-500 hover:text-blossom-700"
                : "text-aurora-500 hover:text-aurora-600"
            } transform text-xl dark:text-gray-300 dark:hover:text-gray-500`}
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
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
            disabled={!value.trim() || isLoading || waveformActive}
            aria-label="Send message - or use cmd + enter"
          >
            {/* Send button icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* SVG path */}
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
                  index > 0 ? Math.round(height * factor * 1.3) : 0;

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
                      marginLeft: `${Math.max(
                        Math.round(maxHeight / 30),
                        6,
                      )}px`,
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
  );
}

export default SpeechToTextArea;
