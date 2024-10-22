"use client";

export type ChatModel = {
  description: string;
  modelName: string;
  provider: "openai" | "anthropic" | "google" | "groq";
  inputTokenPrice?: number;
  outputTokenPrice?: number;
};

export const ChatModels: ChatModel[] = [
  {
    description: "Claude 3.5 Sonnet",
    modelName: "claude-3-5-sonnet-20240620",
    provider: "anthropic",
    inputTokenPrice: 3,
    outputTokenPrice: 15,
  },
  {
    description: "GPT 4o",
    modelName: "gpt-4o-2024-08-06",
    provider: "openai",
    inputTokenPrice: 2.5,
    outputTokenPrice: 10,
  },
  {
    description: "Groq Llama 3.2 90b",
    modelName: "llama-3.2-90b-text-preview",
    provider: "groq",
  },
  {
    description: "o1 Preview",
    modelName: "o1-preview-2024-09-12",
    provider: "openai",
    inputTokenPrice: 15,
    outputTokenPrice: 60,
  },
  {
    description: "o1 Mini",
    modelName: "o1-mini-2024-09-12",
    provider: "openai",
    inputTokenPrice: 3,
    outputTokenPrice: 12,
  },
  {
    description: "Claude 3.5 Sonnet 24-1022",
    modelName: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    inputTokenPrice: 3,
    outputTokenPrice: 15,
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
            {model.description} - ${model.inputTokenPrice ?? "N/A"}/M input, ${model.outputTokenPrice ?? "N/A"}/M output
          </option>
        ))}
      </select>
    </div>
  );
};
