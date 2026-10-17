"use client";

import { useState } from "react";
import type { PublicQuiz, Quiz, QuizAttemptResult } from "@/lib/types";
import { CheckCircleIcon, XIcon, RefreshCcwIcon } from "@/components/ui/Icons";

interface QuizPanelProps {
  quiz: Quiz | PublicQuiz;
  /** Demo/bundled quizzes are scored in the browser (they ship their answers). */
  onComplete?: (score: number, total: number) => void;
  /**
   * Live quizzes never ship answers. When provided, answers are sent to the server,
   * which scores them against the stored quiz and returns the graded result.
   */
  submit?: (answers: { questionId: string; selectedOptionId: string }[]) => Promise<QuizAttemptResult>;
  onGraded?: (result: QuizAttemptResult) => void;
}

type Phase = "answering" | "submitting" | "submitted";

export default function QuizPanel({ quiz, onComplete, submit, onGraded }: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("answering");
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [localScore, setLocalScore] = useState(0);
  const [error, setError] = useState("");

  const total = quiz.questions.length;
  const score = result ? result.score : localScore;
  const locked = phase !== "answering";

  function selectOption(questionId: string, optionId: string) {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit() {
    setError("");
    if (submit) {
      setPhase("submitting");
      try {
        const r = await submit(quiz.questions.map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] })));
        setResult(r);
        setPhase("submitted");
        onGraded?.(r);
      } catch (e) {
        setPhase("answering");
        setError(e instanceof Error ? e.message : "Could not submit your answers. Please try again.");
      }
      return;
    }
    const correct = (quiz as Quiz).questions.filter((q) => answers[q.id] === q.correctOptionId).length;
    setLocalScore(correct);
    setPhase("submitted");
    onComplete?.(correct, total);
  }

  function handleRetry() {
    setAnswers({});
    setPhase("answering");
    setResult(null);
    setLocalScore(0);
    setError("");
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  function gradeOf(q: Quiz["questions"][number] | PublicQuiz["questions"][number]) {
    if (result) {
      const r = result.results.find((x) => x.questionId === q.id);
      return r ? { correctId: r.correctOptionId, explanation: r.explanation } : null;
    }
    const full = q as Quiz["questions"][number];
    return full.correctOptionId ? { correctId: full.correctOptionId, explanation: full.explanation } : null;
  }

  return (
    <section aria-labelledby="quiz-heading" className="card card-pop bg-purple-soft p-5 sm:p-6">
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
                score === total ? "bg-fresh text-ink" : score >= total / 2 ? "bg-sun text-ink" : "bg-white text-ink"
              }`}
            >
              Score: {score} / {total}
            </span>
          </div>
        ) : (
          <span className="badge bg-white text-muted">{total} questions</span>
        )}
      </div>

      {/* Questions list */}
      <ol className="mt-6 space-y-6">
        {quiz.questions.map((q, qi) => {
          const selected = answers[q.id];
          const grade = phase === "submitted" ? gradeOf(q) : null;
          const isCorrect = !!grade && selected === grade.correctId;

          return (
            <li key={q.id}>
              <fieldset>
                <legend className="font-bold text-base text-ink mb-2">
                  <span className="font-display font-black text-purple mr-1.5">{qi + 1}.</span>
                  {q.question}
                </legend>

                <div className="mt-2 grid gap-2">
                  {q.options.map((opt) => {
                    const isSelected = selected === opt.id;
                    const isCorrectOpt = !!grade && opt.id === grade.correctId;

                    let optionClasses = "bg-white text-ink hover:bg-cream";
                    if (grade) {
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
                          disabled={locked}
                          onChange={() => selectOption(q.id, opt.id)}
                          className="h-4 w-4 accent-purple cursor-pointer"
                        />
                        <span className="flex-1">{opt.text}</span>
                        {grade && isCorrectOpt && <CheckCircleIcon size={16} className="text-ink shrink-0" />}
                        {grade && isSelected && !isCorrect && <XIcon size={16} className="text-[#991b1b] shrink-0" />}
                      </label>
                    );
                  })}
                </div>

                {/* Explanation feedback */}
                {grade && (
                  <div
                    className={`card p-3.5 mt-3 text-sm leading-relaxed ${
                      isCorrect ? "bg-white text-ink" : "bg-[#fef2f2] text-[#991b1b]"
                    }`}
                  >
                    <p className="font-bold mb-1">{isCorrect ? "✓ Well done!" : "✗ Explanation:"}</p>
                    <p>{grade.explanation}</p>
                  </div>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-[#991b1b]">
          {error}
        </p>
      )}

      {/* Action Footer */}
      <div className="mt-8 pt-4 border-t-2 border-ink flex flex-wrap items-center gap-3">
        {phase !== "submitted" ? (
          <>
            <button type="button" onClick={handleSubmit} disabled={!allAnswered || phase === "submitting"} className="btn btn-purple">
              {phase === "submitting" ? "Checking…" : "Submit answers"}
            </button>
            {!allAnswered && (
              <span className="text-xs font-semibold text-muted">Answer all {total} questions to submit.</span>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={handleRetry} className="btn btn-secondary flex items-center gap-2">
              <RefreshCcwIcon size={16} />
              Try Again
            </button>
            {result && (
              <span className="text-xs font-semibold text-muted" role="status">
                {result.passed
                  ? "Passed. Your attempt was saved."
                  : "Not passed yet (60% needed to complete the lesson). Your attempt was saved."}
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
