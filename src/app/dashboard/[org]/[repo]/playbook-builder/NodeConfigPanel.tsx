import React from "react";
import { type Node } from "@xyflow/react";

interface NodeConfigPanelProps {
  node: Node;
  onChange: (updatedNode: Node) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onChange,
}) => {
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        [name]: value,
      },
    };
    onChange(updatedNode);
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case "actionNode":
        return (
          <>
            <label>
              Action Type:
              <select
                name="actionType"
                value={node.data.actionType}
                onChange={handleChange}
              >
                <option value="llmCall">LLM Call</option>
                <option value="fileOperation">File Operation</option>
                <option value="gitCommand">Git Command</option>
              </select>
            </label>
            {node.data.actionType === "llmCall" && (
              <>
                <label>
                  Model:
                  <select
                    name="model"
                    value={node.data.model}
                    onChange={handleChange}
                  >
                    <option value="sonnet">Sonnet</option>
                    <option value="gpt4o">GPT-4o</option>
                    <option value="gemini">Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="gpt4o-mini">GPT-4o Mini</option>
                    <option value="claude-haiku">Claude Haiku</option>
                  </select>
                </label>
                <label>
                  Prompt:
                  <textarea
                    name="prompt"
                    value={node.data.prompt}
                    onChange={handleChange}
                  />
                </label>
              </>
            )}
            {/* Add more specific fields for other action types */}
          </>
        );
      case "controlFlowNode":
        return (
          <label>
            Condition:
            <input
              type="text"
              name="condition"
              value={node.data.condition}
              onChange={handleChange}
            />
          </label>
        );
      case "annotationNode":
        return (
          <label>
            Note:
            <textarea
              name="note"
              value={node.data.note}
              onChange={handleChange}
            />
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 4,
        background: "white",
        padding: 10,
        borderRadius: 5,
      }}
    >
      <h3>Configure {node.type}</h3>
      <label>
        Label:
        <input
          type="text"
          name="label"
          value={node.data.label}
          onChange={handleChange}
        />
      </label>
      {renderConfigFields()}
    </div>
  );
};

export default NodeConfigPanel;
