"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/types";
import { CheckCircleIcon, XIcon, RefreshCcwIcon } from "@/components/ui/Icons";

interface QuizPanelProps {
  quiz: Quiz;
  onComplete?: (score: number, total: number) => void;
}

type Phase = "answering" | "submitted";

export default function QuizPanel({ quiz, onComplete }: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("answering");
  const [score, setScore] = useState(0);

  function selectOption(questionId: string, optionId: string) {
    if (phase === "submitted") return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleSubmit() {
    const correct = quiz.questions.filter(
      (q) => answers[q.id] === q.correctOptionId
    ).length;
    setScore(correct);
    setPhase("submitted");
    onComplete?.(correct, quiz.questions.length);
  }

  function handleRetry() {
    setAnswers({});
    setPhase("answering");
    setScore(0);
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  return (
    <section
      aria-labelledby="quiz-heading"
      className="card card-pop bg-purple-soft p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-4">
        <div>
          <p className="eyebrow">Knowledge Check</p>
          <h2 id="quiz-heading" className="text-2xl sm:text-3xl text-ink">
            Quick Quiz
          </h2>
        </div>
        {phase === "submitted" ? (
          <div className="flex items-center gap-2">
            <span
              className={`badge py-1 px-3 text-sm font-extrabold ${
                score === quiz.questions.length
                  ? "bg-fresh text-ink"
                  : score >= quiz.questions.length / 2
                  ? "bg-sun text-ink"
                  : "bg-white text-ink"
              }`}
            >
              Score: {score} / {quiz.questions.length}
            </span>
          </div>
        ) : (
          <span className="badge bg-white text-muted">
            {quiz.questions.length} questions
          </span>
        )}
      </div>

      {/* Questions list */}
      <ol className="mt-6 space-y-6">
        {quiz.questions.map((q, qi) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.correctOptionId;

          return (
            <li key={q.id}>
              <fieldset>
                <legend className="font-bold text-base text-ink mb-2">
                  <span className="font-display font-black text-purple mr-1.5">
                    {qi + 1}.
                  </span>
                  {q.question}
                </legend>

                <div className="mt-2 grid gap-2">
                  {q.options.map((opt) => {
                    const isSelected = selected === opt.id;
                    const isCorrectOpt = opt.id === q.correctOptionId;

                    let optionClasses = "bg-white text-ink hover:bg-cream";
                    if (phase === "submitted") {
                      if (isCorrectOpt) {
                        optionClasses = "bg-fresh text-ink font-bold shadow-pop-sm";
                      } else if (isSelected && !isCorrect) {
                        optionClasses = "bg-[#fee2e2] text-[#991b1b]";
                      }
                    } else if (isSelected) {
                      optionClasses = "bg-sun text-ink shadow-pop-sm";
                    }

                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-2 border-ink px-3 py-2.5 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${optionClasses}`}
                      >
                        <input
                          type="radio"
                          name={`quiz-${q.id}`}
                          value={opt.id}
                          checked={isSelected}
                          disabled={phase === "submitted"}
                          onChange={() => selectOption(q.id, opt.id)}
                          className="h-4 w-4 accent-purple cursor-pointer"
                        />
                        <span className="flex-1">{opt.text}</span>
                        {phase === "submitted" && isCorrectOpt && (
                          <CheckCircleIcon size={16} className="text-ink shrink-0" />
                        )}
                        {phase === "submitted" && isSelected && !isCorrect && (
                          <XIcon size={16} className="text-[#991b1b] shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Explanation feedback */}
                {phase === "submitted" && (
                  <div
                    className={`card p-3.5 mt-3 text-sm leading-relaxed ${
                      isCorrect ? "bg-white text-ink" : "bg-[#fef2f2] text-[#991b1b]"
                    }`}
                  >
                    <p className="font-bold mb-1">
                      {isCorrect ? "✓ Well done!" : "✗ Explanation:"}
                    </p>
                    <p>{q.explanation}</p>
                  </div>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {/* Action Footer */}
      <div className="mt-8 pt-4 border-t-2 border-ink flex flex-wrap items-center gap-3">
        {phase === "answering" ? (
          <>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="btn btn-purple"
            >
              Submit answers
            </button>
            {!allAnswered && (
              <span className="text-xs font-semibold text-muted">
                Answer all {quiz.questions.length} questions to submit.
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={handleRetry}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCcwIcon size={16} />
            Try Again
          </button>
        )}
      </div>
    </section>
  );
}
