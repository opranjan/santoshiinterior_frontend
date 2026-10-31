import { Suspense } from "react";
import TaskTrackerWorkspace from "@/components/tasks/TaskTrackerWorkspace";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Task Tracker" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TaskTrackerWorkspace />
    </Suspense>
  );
}
