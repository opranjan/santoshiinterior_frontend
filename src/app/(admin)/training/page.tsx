import TrainingWorkspace from "@/components/training/TrainingWorkspace";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Training" };

export default function Page() {
  return <TrainingWorkspace />;
}
