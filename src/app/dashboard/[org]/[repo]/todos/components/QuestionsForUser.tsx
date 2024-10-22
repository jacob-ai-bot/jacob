import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

interface Question {
  id: number;
  question: string;
  answer: string;
}

interface QuestionsForUserProps {
  questions: Question[];
  todoId: number;
  issueId: number;
}

const QuestionsForUser: React.FC<QuestionsForUserProps> = ({
  questions,
  todoId,
  issueId,
}) => {
  const [openQuestions, setOpenQuestions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { mutate: updateResearch } = api.todos.updateResearch.useMutation({
    onSuccess: () => {
      toast.success("Answer submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit answer");
    },
  });

  const toggleQuestion = (id: number) => {
    setOpenQuestions((prev) =>
      prev.includes(id)
        ? prev.filter((questionId) => questionId !== id)
        : [...prev, id]
    );
  };

  const handleAnswerChange = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (id: number) => {
    const answer = answers[id];
    if (answer) {
      updateResearch({ todoId, issueId, questionId: id, answer });
    }
  };

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-aurora-700 dark:text-aurora-300">
        Questions for User
      </h3>
      <p className="text-sm text-aurora-900/80 dark:text-aurora-200/80">
        Please answer these questions to provide more context for the issue.
      </p>
      {questions.map((item) => (
        <div
          key={item.id}
          className="mb-4 rounded-lg border border-aurora-200 bg-aurora-50 p-4 dark:border-aurora-700 dark:bg-aurora-900/20"
        >
          <button
            onClick={() => toggleQuestion(item.id)}
            className="flex w-full items-center justify-between text-left"
          >
            <h4 className="text-lg font-medium text-aurora-800 dark:text-aurora-200">
              {item.question}
            </h4>
            <FontAwesomeIcon
              icon={openQuestions.includes(item.id) ? faChevronUp : faChevronDown}
              className="ml-2 text-aurora-500 transition-transform dark:text-aurora-400"
            />
          </button>
          <AnimatePresence initial={false}>
            {openQuestions.includes(item.id) && (
              <motion.div
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={{
                  open: { opacity: 1, height: "auto", marginTop: 16 },
                  collapsed: { opacity: 0, height: 0, marginTop: 0 },
                }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className="markdown-chat mb-4">
                  <MarkdownRenderer>{item.answer}</MarkdownRenderer>
                </div>
                <textarea
                  value={answers[item.id] || ""}
                  onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                  className="w-full rounded-md border border-aurora-300 bg-white p-2 text-aurora-900 dark:border-aurora-600 dark:bg-aurora-800 dark:text-aurora-100"
                  rows={4}
                  placeholder="Type your answer here..."
                />
                <button
                  onClick={() => handleSubmit(item.id)}
                  className="mt-2 rounded-full bg-aurora-500 px-4 py-2 text-white transition-colors hover:bg-aurora-600 dark:bg-aurora-600 dark:hover:bg-aurora-500"
                >
                  Submit Answer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default QuestionsForUser;