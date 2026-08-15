"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { leadsApi, projectsApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";

export type ConvertLeadInfo = {
  id: string;
  clientName: string;
  projectName?: string;
};

type ProjectOption = {
  id: string;
  name: string;
  clientName?: string;
  leadId?: string | null;
};

type Props = {
  lead: ConvertLeadInfo | null;
  onClose: () => void;
  onSuccess: (result: {
    project: { id: string; name: string };
    lead: { id: string };
  }) => void;
};

type AssignMode = "existing" | "new";

export default function ConvertLeadToProjectModal({
  lead,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<AssignMode>("existing");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lead) return;

    setMode("existing");
    setError("");
    setSelectedProjectId("");

    let cancelled = false;
    (async () => {
      try {
        setLoadingProjects(true);
        const data = await projectsApi.list({ limit: 200 });
        if (cancelled) return;
        const items = (data.items || []).map((row) => ({
          id: String(row.id),
          name: String(row.name || "Untitled project"),
          clientName: row.clientName ? String(row.clientName) : undefined,
          leadId: row.leadId ? String(row.leadId) : null,
        }));
        setProjects(items);
        const firstAvailable = items.find((p) => !p.leadId);
        if (firstAvailable) setSelectedProjectId(firstAvailable.id);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lead]);

  const availableProjects = useMemo(
    () => projects.filter((p) => !p.leadId),
    [projects]
  );

  const assignExisting = async () => {
    if (!lead || busy || !selectedProjectId) return;
    setBusy(true);
    setError("");
    try {
      const result = await leadsApi.convertToProject(lead.id, {
        projectId: selectedProjectId,
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to assign project"
      );
    } finally {
      setBusy(false);
    }
  };

  const goToCreateProject = () => {
    if (!lead) return;
    onClose();
    router.push(`/projects?fromLead=${encodeURIComponent(lead.id)}`);
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Assign lead to project
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Link <strong>{lead.clientName}</strong> to an existing project or
          create a new one on the Projects page. Lead status will be set to Won
          after the project is saved.
        </p>

        <div className="mt-5 flex gap-2 rounded-xl bg-gray-50 p-1 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "existing"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            Choose existing
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "new"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            Create new
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mt-4">
            <Label htmlFor="existingProject">Select project</Label>
            {loadingProjects ? (
              <p className="mt-2 text-sm text-gray-500">Loading projects…</p>
            ) : availableProjects.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500 dark:border-gray-700">
                No unassigned projects available. Use{" "}
                <strong>Create new</strong> to open the Projects form.
              </p>
            ) : (
              <select
                id="existingProject"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              >
                <option value="">Select a project…</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.clientName ? ` · ${project.clientName}` : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1.5 text-xs text-gray-400">
              Only projects not linked to another lead are shown.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              Create on Projects page
            </p>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
              You&apos;ll go to{" "}
              <strong>Projects</strong> in the sidebar with a new project form
              prefilled from lead <strong>{lead.clientName}</strong> — client,
              phone, store, budget, scope, and more.
            </p>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-error-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {mode === "existing" ? (
            <Button
              size="sm"
              onClick={() => void assignExisting()}
              disabled={busy || !selectedProjectId}
            >
              {busy ? "Saving…" : "Assign to Project"}
            </Button>
          ) : (
            <Button size="sm" onClick={goToCreateProject}>
              Continue to Projects
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
