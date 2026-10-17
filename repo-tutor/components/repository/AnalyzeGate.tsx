"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiRequestError } from "@/lib/client/api";
import { AlertCircleIcon, RefreshCcwIcon } from "@/components/ui/Icons";

interface Props {
  owner: string;
  name: string;
  /** Start immediately (used right after the landing-page form is submitted). */
  autoStart?: boolean;
}

type State =
  | { phase: "idle" }
  | { phase: "working"; label: string }
  | { phase: "error"; message: string; retryable: boolean };

const POLL_MS = 1500;
const MAX_WAIT_MS = 4 * 60_000;

/**
 * Starts a real repository analysis and shows honest progress.
 * On success it navigates to the repository dashboard; on failure it shows the server's message and a retry.
 */
export default function AnalyzeGate({ owner, name, autoStart = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "idle" });
  const started = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setState({ phase: "working", label: "Contacting GitHub…" });
    try {
      const start = await api<{ id: number; status: string }>("/api/analyze", { body: { url: `https://github.com/${owner}/${name}` } });
      const deadline = Date.now() + MAX_WAIT_MS;
      let status = start.status;
      while (alive.current && status !== "completed" && status !== "failed") {
        if (Date.now() > deadline) throw new ApiRequestError(0, "TIMEOUT", "This is taking longer than expected. You can retry; finished work is cached.", true);
        setState({ phase: "working", label: status === "queued" ? "Waiting for a free worker…" : "Reading files and building your course…" });
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await api<{ status: string; error?: { message: string; retryable: boolean } }>(`/api/analyze/${start.id}`);
        status = s.status;
        if (status === "failed") throw new ApiRequestError(0, "FAILED", s.error?.message ?? "The analysis failed.", !!s.error?.retryable);
      }
      if (status === "completed" && alive.current) router.refresh();
    } catch (e) {
      if (!alive.current) return;
      const err = e as ApiRequestError;
      setState({ phase: "error", message: err.message || "Something went wrong.", retryable: err.retryable !== false });
    }
  }, [owner, name, router]);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void run();
    }
  }, [autoStart, run]);

  return (
    <div className="card card-pop mx-auto max-w-xl p-6 text-center" aria-live="polite">
      <Image src="/mascot.png" alt="" width={96} height={96} className={`mx-auto ${state.phase === "working" ? "animate-pulse" : ""}`} />
      <h1 className="mt-3 text-2xl text-ink">
        {owner}
        <span className="text-muted">/</span>
        <span className="text-purple">{name}</span>
      </h1>

      {state.phase === "idle" && (
        <>
          <p className="mt-3 text-muted">
            This repository hasn&apos;t been analysed yet. Repo Tutor will read its public files from GitHub (never running them) and build a learning path from what it finds.
          </p>
          <button type="button" onClick={run} className="btn btn-primary btn-lg mt-5">
            Analyse this repository
          </button>
        </>
      )}

      {state.phase === "working" && (
        <p className="mt-3 font-semibold text-ink" role="status">
          {state.label}
        </p>
      )}

      {state.phase === "error" && (
        <>
          <p role="alert" className="mt-3 flex items-start justify-center gap-2 text-left text-sm font-semibold text-[#991b1b]">
            <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </p>
          {state.retryable && (
            <button type="button" onClick={run} className="btn btn-secondary mt-5 inline-flex items-center gap-2">
              <RefreshCcwIcon size={16} />
              Try again
            </button>
          )}
        </>
      )}
    </div>
  );
}
