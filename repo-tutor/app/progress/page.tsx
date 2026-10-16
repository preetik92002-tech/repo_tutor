import ProgressView from "@/components/progress/ProgressView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Progress — Repo Tutor",
  description: "Track your learning progress, completed lessons, and quiz scores across open-source repositories.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
