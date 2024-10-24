import React, { useState } from "react";
import { api } from "~/trpc/react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { type Research } from "~/types";

interface QuestionsForUserProps {
  questions: Research[];
  todoId: number;
  issueId: number;
}

const QuestionsForUser: React.FC<QuestionsForUserProps> = ({
  questions,
  todoId,
  issueId,
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>(
    questions?.reduce(
      (acc, question) => {
        acc[question.id!] = question.answer ?? "";
        return acc;
      },
      {} as Record<number, string>,
    ),
  );

  const { mutateAsync: submitUserAnswers } =
    api.todos.submitUserAnswers.useMutation();

  const handleAnswerChange = (id: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitUserAnswers({
        todoId,
        issueId,
        answers,
      });
      toast.success("Answers submitted successfully!");
    } catch (error) {
      console.error("Error submitting answers:", error);
      toast.error("Failed to submit answers.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-aurora-700 dark:text-aurora-300">
        Questions for User
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((question) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-aurora-100 p-4 dark:bg-aurora-800"
          >
            <p className="mb-2 font-medium text-aurora-800 dark:text-aurora-200">
              {question.question}
            </p>
            <textarea
              className="w-full rounded-md border border-aurora-300 bg-white p-2 text-aurora-900 dark:border-aurora-600 dark:bg-aurora-900 dark:text-aurora-100"
              rows={3}
              value={answers[question.id!] ?? ""}
              onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
              placeholder="Enter your answer here..."
            />
          </motion.div>
        ))}
        <button
          type="submit"
          className="rounded-md bg-aurora-500 px-4 py-2 text-white hover:bg-aurora-600 dark:bg-aurora-600 dark:hover:bg-aurora-500"
        >
          Submit Answers
        </button>
      </form>
    </div>
  );
};

export default QuestionsForUser;
