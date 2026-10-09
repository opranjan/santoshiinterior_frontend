"use client";

import React, { useEffect, useMemo, useState } from "react";
import AttendanceManager, { type EmployeeLite } from "@/components/hr/AttendanceManager";
import { hrApi } from "@/services/crmApi";
import { mapEmployee } from "@/lib/crmMappers";
import HrPageHeader from "./HrPageHeader";

export default function HrAttendancePage() {
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi
      .listEmployees({ limit: 200 })
      .then((data) => {
        setEmployees(
          (data.items || []).map((row) => {
            const emp = mapEmployee(row);
            const status = emp.status as EmployeeLite["status"];
            return {
              id: emp.id,
              name: emp.name,
              store: emp.store || "Main Branch",
              department: emp.department,
              status: status === "On Leave" || status === "Inactive" ? status : "Active",
            };
          })
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load attendance"))
      .finally(() => setLoading(false));
  }, []);

  const subtitle = useMemo(
    () =>
      loading
        ? "Loading daily presence…"
        : "Daily presence, late marks, and leave",
    [loading]
  );

  return (
    <div className="space-y-5">
      <HrPageHeader crumb="HR › Attendance" title="Attendance" subtitle={subtitle} />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
        <AttendanceManager employees={employees} />
      </div>
    </div>
  );
}
