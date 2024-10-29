import React from "react";
import Modal from "react-modal";
import CodeViewer from "./CodeViewer";

interface CodeModalProps {
  filePath: string;
  isOpen: boolean;
  onClose: () => void;
}

const CodeModal: React.FC<CodeModalProps> = ({ filePath, isOpen, onClose }) => {
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "80%",
      maxHeight: "80%",
      padding: "20px",
      borderRadius: "8px",
      border: "none",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Code Viewer"
      ariaHideApp={false}
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{filePath}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="flex-grow overflow-auto">
          <CodeViewer filePath={filePath} />
        </div>
      </div>
    </Modal>
  );
};

export default CodeModal;
