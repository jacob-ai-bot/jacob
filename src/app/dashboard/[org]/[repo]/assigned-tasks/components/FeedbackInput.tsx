import React from "react";

interface FeedbackInputProps {
  feedback: string;
  setFeedback: (feedback: string) => void;
}

const FeedbackInput: React.FC<FeedbackInputProps> = ({
  feedback,
  setFeedback,
}) => {
  return (
    <div className="mt-4">
      <label
        htmlFor="feedback"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Plan Feedback
      </label>
      <textarea
        id="feedback"
        name="feedback"
        rows={4}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
    </div>
  );
};

export default FeedbackInput;
