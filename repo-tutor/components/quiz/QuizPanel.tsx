"use client";

import { useState } from "react";
import type { Quiz, QuizAnswer } from "@/lib/types";
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
    <div
      className="rounded-2xl border-2 overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--purple)", color: "#fff" }}
      >
        <div>
          <h3 className="font-bold text-lg">Knowledge Check</h3>
          <p className="text-sm opacity-80">{quiz.questions.length} questions</p>
        </div>
        {phase === "submitted" && (
          <div className="text-right">
            <div className="text-3xl font-black">
              {score}/{quiz.questions.length}
            </div>
            <div className="text-sm opacity-80">
              {score === quiz.questions.length ? "Perfect! 🎉" : score >= quiz.questions.length / 2 ? "Good work!" : "Keep studying!"}
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="p-6 space-y-8 bg-white">
        {quiz.questions.map((q, qi) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.correctOptionId;

          return (
            <div key={q.id}>
              <p className="font-bold mb-3" style={{ color: "var(--ink)" }}>
                <span
                  className="inline-block w-6 h-6 rounded-full text-xs font-black text-white text-center leading-6 mr-2"
                  style={{ background: "var(--purple)" }}
                >
                  {qi + 1}
                </span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isSelected = selected === opt.id;
                  const isCorrectOpt = opt.id === q.correctOptionId;
                  let bg = "var(--cream)";
                  let border = "var(--border)";
                  let textColor = "var(--ink)";

                  if (phase === "submitted") {
                    if (isCorrectOpt) {
                      bg = "#EDFCF2";
                      border = "#16a34a";
                      textColor = "#15803d";
                    } else if (isSelected && !isCorrect) {
                      bg = "#FEF2F2";
                      border = "#dc2626";
                      textColor = "#b91c1c";
                    }
                  } else if (isSelected) {
                    bg = "#F0EBFF";
                    border = "var(--purple)";
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(q.id, opt.id)}
                      disabled={phase === "submitted"}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3"
                      style={{ background: bg, borderColor: border, color: textColor }}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-xs"
                        style={{ borderColor: border }}
                      >
                        {phase === "submitted" && isCorrectOpt ? (
                          <CheckCircleIcon size={14} style={{ color: "#16a34a" } as React.CSSProperties} />
                        ) : phase === "submitted" && isSelected && !isCorrect ? (
                          <XIcon size={12} style={{ color: "#dc2626" } as React.CSSProperties} />
                        ) : isSelected ? (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--purple)" }} />
                        ) : null}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after submit) */}
              {phase === "submitted" && (
                <div
                  className="mt-3 p-3 rounded-xl text-sm"
                  style={{
                    background: isCorrect ? "#EDFCF2" : "#FEF2F2",
                    color: isCorrect ? "#15803d" : "#b91c1c",
                  }}
                >
                  <strong>{isCorrect ? "✓ Correct! " : "✗ Incorrect. "}</strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}

        {/* Action buttons */}
        <div className="pt-2 flex gap-3">
          {phase === "answering" ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--purple)" }}
            >
              Submit Answers
            </button>
          ) : (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold border-2 transition-all hover:opacity-80"
              style={{ borderColor: "var(--purple)", color: "var(--purple)" }}
            >
              <RefreshCcwIcon size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
