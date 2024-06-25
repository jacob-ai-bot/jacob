import { faArrowUp, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { Tooltip } from "react-tooltip";
import { type Message, Role } from "~/types";

interface Props {
  onSend: (message: Message) => void;
  isResponding?: boolean;
  loading?: boolean;
}

export const ChatInput: FC<Props> = ({
  onSend,
  isResponding = false,
  loading = false,
}) => {
  const [content, setContent] = useState<string>();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > 3000) {
      toast.error("Message limit is 3000 characters");
      return;
    }

    setContent(value);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 20MB`);
        return false;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name} is not a PNG or JPEG file`);
        return false;
      }
      return true;
    });
    setSelectedImages(validFiles);
  };

  const uploadImages = async () => {
    setIsUploading(true);
    const uploadPromises = selectedImages.map(async (image) => {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('imageType', image.type);
      formData.append('imageName', image.name);

      try {
        const response = await fetch('/api/image/upload', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.url;
      } catch (error) {
        toast.error(`Failed to upload ${image.name}`);
        return null;
      }
    });

    const urls = await Promise.all(uploadPromises);
    setIsUploading(false);
    return urls.filter(Boolean);
  };

  const handleSend = () => {
    if (!content) {
      alert("Please enter a message");
      return;
    }
    uploadImages().then((imageUrls) => {
      const messageContent = imageUrls.length > 0
        ? `${content}\n\nUploaded images:\n${imageUrls.join('\n')}`
        : content;
      onSend({ role: Role.USER, content: messageContent });
      setContent('');
    });
    setSelectedImages([]);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderUploadButton = () => (
    <button
      onClick={handleUploadClick}
      className="mr-2 h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
      disabled={isUploading || isResponding}
      data-tooltip-id="tooltip_upload"
      data-tooltip-content="Upload images"
    >
      <FontAwesomeIcon icon={faUpload} className={isUploading ? "animate-spin" : ""} />
    </button>
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isResponding || loading) return;
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef?.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div
      className={`flex w-full max-w-4xl flex-col items-start rounded-lg border border-gray-600 p-4 backdrop-blur-md ${
        isResponding || loading ? "opacity-50" : ""
      }`}
    >
      <textarea
        ref={textareaRef}
        className="w-full bg-transparent text-sm text-white text-opacity-80 placeholder-gray-400 outline-none"
        placeholder="Send a reply.."
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className="items-between flex w-full flex-row">
        <p className="mt-2 text-base text-white text-opacity-40">
          {content?.length ?? 0}/3000
        </p>
        <div className="mt-2 flex w-full items-center justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
          />
          {renderUploadButton()}
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding}
            data-tooltip-id="tooltip_chatinput"
            data-tooltip-content="Send message"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        </div>
      </div>
      <Tooltip
        id="tooltip_chatinput"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
      <Tooltip
        id="tooltip_upload"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
    </div>
  );
};