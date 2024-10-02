"use client";

export type ChatModel = {
  description: string;
  modelName: string;
  provider: "openai" | "anthropic" | "google" | "groq";
};

export const ChatModels: ChatModel[] = [
  {
    description: "Claude 3.5 Sonnet",
    modelName: "claude-3-5-sonnet-20240620",
    provider: "anthropic",
  },
  { description: "GPT 4o", modelName: "gpt-4o-2024-08-06", provider: "openai" },
  //   {
  //     description: "Gemini 1.5 Pro",
  //     modelName: "gemini-1.5-pro-latest",
  //     provider: "google",
  //   },
  //   {
  //     description: "Gemini 1.5 Flash",
  //     modelName: "gemini-1.5-flash-latest",
  //     provider: "google",
  //   },
  {
    description: "Groq Llama 3.2 90b",
    modelName: "llama-3.2-90b-text-preview",
    provider: "groq",
  },
  {
    description: "o1 Preview",
    modelName: "o1-preview-2024-09-12",
    provider: "openai",
  },
  {
    description: "o1 Mini",
    modelName: "o1-mini-2024-09-12",
    provider: "openai",
  },
];

interface ModelSelectorProps {
  selectedModel: ChatModel;
  onModelChange: (model: ChatModel) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
}) => {
  return (
    <div className="mb-2">
      {/* <label
        htmlFor="model-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Select Model
      </label> */}
      <select
        id="model-select"
        value={selectedModel.modelName}
        onChange={(e) => {
          const selected = ChatModels.find(
            (m) => m.modelName === e.target.value,
          );
          if (selected) onModelChange(selected);
        }}
        className=" block w-full rounded-md border-gray-300 text-sm shadow-sm backdrop-blur-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        {ChatModels.map((model) => (
          <option key={model.modelName} value={model.modelName}>
            {model.description}
          </option>
        ))}
      </select>
    </div>
  );
};
