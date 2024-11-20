import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faStop,
  faSpinner,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const CHAT_INPUT_HEIGHT = "40px";

interface SpeechToTextInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (message: string) => Promise<void> | void;
  isLoading: boolean;
  minHeight?: string;
  placeholder?: string;
  shouldSubmitOnEnter?: boolean;
}

export interface SpeechToTextAreaRef {
  focus: () => void;
  clear: () => void;
}

export const SpeechToTextArea = forwardRef<
  SpeechToTextAreaRef,
  SpeechToTextInputProps
>(
  (
    {
      value,
      onChange,
      onSubmit,
      isLoading,
      minHeight = CHAT_INPUT_HEIGHT,
      placeholder = "Type your message...",
      shouldSubmitOnEnter = true,
    },
    ref,
  ) => {
    const [isRecording, setIsRecording] = useState(false);
    const [waveformActive, setWaveformActive] = useState(false);
    const [heights, setHeights] = useState<number[]>(new Array(40).fill(20));
    const [maxHeight, setMaxHeight] = useState(0);
    const [textareaHeight, setTextareaHeight] = useState(minHeight);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
      const prepareMicrophone = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setMediaStream(stream);
        } catch (error) {
          console.error("Microphone access denied:", error);
          toast.error("Microphone access is required to use voice recording.");
        }
      };

      void prepareMicrophone();

      // Cleanup when component unmounts
      return () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startRecording = async () => {
      let stream = mediaStream;

      if (!stream || stream.getAudioTracks().length === 0) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMediaStream(stream);
        } catch (error) {
          console.error("Microphone access denied:", error);
          toast.error("Microphone access is required to use voice recording.");
          return;
        }
      }

      setIsRecording(true);
      setWaveformActive(true);

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      let mimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        console.error("No supported MIME type found for MediaRecorder.");
        toast.error("Recording is not supported in this browser.");
        setIsRecording(false);
        setWaveformActive(false);
        return;
      }

      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateHeights = () => {
        analyser.getByteFrequencyData(dataArray);
        const maxFrequency = Math.max(...dataArray);
        setMaxHeight(maxFrequency);
        setHeights(Array.from(dataArray.slice(0, 40)));
        animationFrameIdRef.current = requestAnimationFrame(updateHeights);
      };
      updateHeights();

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        console.log("Data available:", event.data.size);
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Recorder stopped");
        if (audioCtxRef.current) {
          await audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
        if (animationFrameIdRef.current)
          cancelAnimationFrame(animationFrameIdRef.current);
        setIsRecording(false);
        setWaveformActive(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("Audio Blob size:", audioBlob.size);

        if (audioBlob.size === 0) {
          console.error("Audio Blob is empty.");
          toast.error("Recording failed. Please try again.");
          return;
        }

        const transcription = await fetchTranscription(audioBlob);
        if (transcription) {
          await submitTranscription(transcription);
        }
      };

      mediaRecorderRef.current.start();
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };

    const fetchTranscription = async (
      audioBlob: Blob,
    ): Promise<string | null> => {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        console.log("FormData file size:", audioBlob.size);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          toast.error("Transcription failed.");
          return null;
        }

        const data = await response.json();
        return data.text.trim();
      } catch (error) {
        console.error("Transcription error:", error);
        toast.error("An error occurred during transcription.");
        return null;
      } finally {
        setIsTranscribing(false);
      }
    };

    const handleTextareaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
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

    const handleSubmit = async (transcription?: string) => {
      if (onSubmit) {
        const messageToSubmit = transcription ?? value;
        if (messageToSubmit.trim()) {
          // Clear the text area
          onChange({
            target: { value: "" },
          } as React.ChangeEvent<HTMLTextAreaElement>);
          if (textareaRef.current) {
            textareaRef.current.value = "";
          }
          adjustTextareaHeight();
          await onSubmit(messageToSubmit);
        }
      }
    };

    const submitTranscription = async (transcription: string) => {
      if (onSubmit) {
        await handleSubmit(transcription);
      } else {
        // Set the text area value to the transcription
        if (textareaRef.current) {
          textareaRef.current.value = transcription;
          onChange({
            target: { value: transcription },
          } as React.ChangeEvent<HTMLTextAreaElement>);
          adjustTextareaHeight();
        }
      }
    };

    const handleImageUpload = async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png, image/jpeg";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (!["image/png", "image/jpeg"].includes(file.type)) {
          toast.error("File must be a PNG or JPEG image.");
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          toast.error("File size must be under 20MB.");
          return;
        }

        setIsUploading(true);

        try {
          // Convert file to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(",")[1];

            const response = await fetch("/api/image/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: base64String,
                imageType: file.type,
                imageName: file.name,
                shouldResize: true,
              }),
            });

            if (!response.ok) {
              throw new Error("Image upload failed");
            }

            const data = await response.json();
            if (data.success && data.url) {
              const imageMarkdown = `![snapshot](${data.url})`;
              const newValue = value + (value ? "\n" : "") + imageMarkdown;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLTextAreaElement>);
              adjustTextareaHeight();
            } else {
              throw new Error("Invalid response from server");
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Image upload error:", error);
          toast.error("Image upload failed. Please try again.");
        } finally {
          setIsUploading(false);
        }
      };
      input.click();
    };

    // Expose methods to the parent component
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        if (textareaRef.current) {
          textareaRef.current.value = "";
          onChange({
            target: { value: "" },
          } as React.ChangeEvent<HTMLTextAreaElement>);
          adjustTextareaHeight();
        }
      },
    }));

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
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
          } hide-scrollbar flex h-full w-full items-center overflow-hidden overflow-y-scroll rounded-2xl border border-aurora-100 bg-aurora-50/30 dark:border-sky-600/30 dark:bg-slate-700`}
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
            } ${
              isLoading ? "opacity-50" : ""
            } hide-scrollbar transition-height m-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-0 focus-visible:ring-0`}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (shouldSubmitOnEnter || e.shiftKey || e.ctrlKey || e.altKey)
              ) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={waveformActive ? "" : placeholder}
            rows={1}
            style={{
              minHeight: waveformActive ? textareaHeight : minHeight,
            }}
            disabled={waveformActive}
          />
          <div className="hide-scrollbar mr-2 mt-auto flex flex-row space-x-4">
            <button
              type="button"
              className={`${
                isUploading
                  ? "text-blossom-500 hover:text-blossom-700"
                  : "text-aurora-500 hover:text-aurora-600"
              } transform text-xl dark:text-gray-300 dark:hover:text-gray-500`}
              onClick={handleImageUpload}
              aria-label="Upload image"
              disabled={isUploading || isRecording}
            >
              {isUploading ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faUpload} />
              )}
            </button>
            <button
              type="button"
              className={`${
                waveformActive
                  ? "z-20 mr-5 text-blossom-500 hover:text-blossom-700"
                  : "text-aurora-500 hover:text-aurora-600"
              } transform text-xl dark:text-gray-300 dark:hover:text-gray-500`}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              disabled={isTranscribing || isUploading}
            >
              {isTranscribing ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon
                  icon={isRecording ? faStop : faMicrophone}
                  size={isRecording ? "2x" : "1x"}
                />
              )}
            </button>
            {onSubmit && (
              <button
                type="submit"
                className={`${
                  waveformActive ? "hidden" : ""
                } flex h-8 w-8 items-center justify-center rounded-full bg-aurora-500 text-white transition-colors hover:bg-aurora-600 focus-visible:outline-none disabled:bg-gray-300 dark:bg-sky-600 dark:hover:bg-sky-700 dark:disabled:bg-gray-600`}
                disabled={
                  !value.trim() || isLoading || waveformActive || isUploading
                }
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
            )}
          </div>
          {waveformActive && (
            <div className="absolute left-1/2 top-5 flex -translate-x-1/2 transform justify-center">
              <div className="flex">
                {heights.map((height, index) => {
                  const centerIndex = heights.length / 2;
                  const distanceFromCenter = Math.abs(index - centerIndex);
                  const maxDistance = heights.length / 2;
                  const factor = 1 - distanceFromCenter / maxDistance;
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
  },
);

SpeechToTextArea.displayName = "SpeechToTextArea";

export default SpeechToTextArea;
