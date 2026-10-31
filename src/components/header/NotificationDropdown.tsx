"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { taskTrackerApi, type TrackerTaskDto } from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

function formatDue(iso?: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TrackerTaskDto[]>([]);
  const canSeeTasks = hasAnyPermission(user, [
    "tasks.view",
    "tasks.manage",
    "projects.view",
    "projects.manage",
    "sales.view",
    "sales.manage",
    "sales.full",
    "users.manage",
    "procurement.manage",
  ]);

  const load = useCallback(async () => {
    if (!canSeeTasks) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await taskTrackerApi.mine();
      setTasks(data.items || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [canSeeTasks]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const count = tasks.length;
  const notifying = count > 0;

  function toggleDropdown() {
    setIsOpen((v) => !v);
    if (!isOpen) void load();
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative dropdown-toggle flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        {notifying ? (
          <span className="absolute right-0 top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c4a574] px-1 text-[9px] font-bold text-[#1c1610]">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.4591 16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[420px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            My tasks
          </h5>
          <button
            type="button"
            onClick={toggleDropdown}
            className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400"
          >
            ✕
          </button>
        </div>

        <ul className="custom-scrollbar flex h-auto flex-1 flex-col overflow-y-auto">
          {loading ? (
            <li className="px-3 py-8 text-center text-sm text-gray-500">Loading…</li>
          ) : !canSeeTasks ? (
            <li className="px-3 py-8 text-center text-sm text-gray-500">
              No task access for this role.
            </li>
          ) : tasks.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-gray-500">
              No open tasks assigned to you.
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href="/task-tracker?mine=1"
                  onClick={closeDropdown}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efe6d8] text-[#5c4033]">
                    ✓
                  </span>
                  <span className="min-w-0 block">
                    <span className="mb-0.5 block text-sm font-medium text-gray-800 dark:text-white/90">
                      {task.title}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {task.status.replace(/_/g, " ")}
                      {" · "}
                      <span className={task.overdue ? "text-red-600" : ""}>
                        Due {formatDue(task.dueDate)}
                      </span>
                      {task.project?.name ? ` · ${task.project.name}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <Link
          href="/task-tracker?mine=1"
          onClick={closeDropdown}
          className="mt-2 block rounded-lg bg-[#5c4033] px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-[#4a3429]"
        >
          Open Task Tracker
        </Link>
      </Dropdown>
    </div>
  );
}
