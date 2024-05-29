import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC } from "react";
import { type Message } from "~/types";
import { toast } from "react-toastify";

interface Props {
  message: Message;
  messageHistory: Message[];
  onCreateNewTask: (messages: Message[]) => void;
  onUpdateIssue: (messages: Message[]) => void;
  loading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const ChatMessage: FC<Props> = ({
  message,
  messageHistory,
  onCreateNewTask,
  onUpdateIssue,
  loading,
  setUploading,
}) => {
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      const isValidType =
        file.type === "image/png" || file.type === "image/jpeg";
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB
      if (!isValidType) {
        toast.error("Only PNG and JPEG images are allowed.");
      }
      if (!isValidSize) {
        toast.error("Image must be under 20MB.");
      }
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const data: { url: string } = await response.json();
        return data.url;
      });

      const urls: string[] = await Promise.all(uploadPromises);
      // Handle the URLs as needed, e.g., send them with a chat message
      console.log("Uploaded URLs:", urls);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Image upload failed: ${error.message}`);
      } else {
        toast.error("Image upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div>{message.content}</div>
      <input
        type="file"
        accept="image/png, image/jpeg"
        multiple
        className="hidden"
        id={`image-upload-${message.content}`}
        onChange={handleImageUpload}
      />
      <label
        htmlFor={`image-upload-${message.content}`}
        className="cursor-pointer"
      >
        <FontAwesomeIcon icon={faUpload} size="2x" />
      </label>
    </div>
  );
};
