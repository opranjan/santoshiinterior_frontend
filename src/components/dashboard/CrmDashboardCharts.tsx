"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const GOLD = "#c4a574";
const TONES = ["#d4b896", "#c4a574", "#9a7748", "#7d6139", "#5c472c", "#111111"];

function monthKey(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-IN", { month: "short" }),
    };
  });
}

export default function CrmDashboardCharts({
  pipeline,
  stores,
  quotations,
  leads,
}: {
  pipeline: Array<{ stage: string; count: number }>;
  stores: Array<{ store: string; leads: number; projects: number }>;
  quotations: Array<{ status: string; amount: number; createdAt: string }>;
  leads: Array<{ createdAt: string }>;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const ink = dark ? "#f4efe6" : "#111111";
  const muted = dark ? "#b5aa9c" : "#8a8175";
  const legend = dark ? "#d8d0c3" : "#6b645b";
  const grid = dark ? "#2c2820" : "#eadfcf";
  const paper = dark ? "#111111" : "#fffdf8";
  const months = useMemo(() => lastSixMonths(), []);

  const activity = useMemo(() => {
    const leadCounts = months.map(
      (month) => leads.filter((row) => monthKey(row.createdAt) === month.key).length
    );
    const quoteAmounts = months.map((month) =>
      quotations
        .filter((row) => monthKey(row.createdAt) === month.key)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0)
    );
    const storeLeads = stores.map((s) => s.leads);
    const storeProjects = stores.map((s) => s.projects);
    const hasTime = leadCounts.some(Boolean) || quoteAmounts.some(Boolean);
    return { leadCounts, quoteAmounts, storeLeads, storeProjects, hasTime };
  }, [leads, quotations, stores, months]);

  const pipelineChart = useMemo(() => {
    if (!pipeline.length || pipeline.every((s) => !s.count)) {
      return { labels: ["No leads yet"], values: [1], empty: true, total: 0 };
    }
    return {
      labels: pipeline.map((s) => s.stage),
      values: pipeline.map((s) => s.count),
      empty: false,
      total: pipeline.reduce((sum, s) => sum + s.count, 0),
    };
  }, [pipeline]);

  const baseChart: ApexOptions["chart"] = {
    fontFamily: "Times New Roman, serif",
    toolbar: { show: false },
    animations: { enabled: true, easing: "easeinout", speed: 900 },
    background: "transparent",
    foreColor: muted,
    dropShadow: { enabled: true, color: GOLD, top: 8, left: 0, blur: 8, opacity: 0.18 },
  };

  const graphOptions: ApexOptions = activity.hasTime
    ? {
        chart: { ...baseChart, stacked: false },
        colors: [GOLD, ink],
        stroke: { curve: "smooth", width: [3, 3] },
        markers: { size: 5, strokeWidth: 2, strokeColors: paper, hover: { size: 7 } },
        fill: {
          type: ["gradient", "solid"],
          gradient: {
            shadeIntensity: 1,
            opacityFrom: dark ? 0.45 : 0.55,
            opacityTo: 0.04,
            stops: [0, 90, 100],
          },
        },
        dataLabels: { enabled: false },
        grid: { borderColor: grid, strokeDashArray: 4, padding: { left: 8, right: 8 } },
        xaxis: {
          categories: months.map((m) => m.label),
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: muted } },
        },
        yaxis: [
          {
            labels: { style: { colors: muted }, formatter: (v) => String(Math.round(v)) },
            title: { text: "Leads", style: { color: GOLD, fontSize: "11px" } },
          },
          {
            opposite: true,
            labels: {
              style: { colors: muted },
              formatter: (v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${Math.round(v)}`),
            },
            title: { text: "Quotes", style: { color: muted, fontSize: "11px" } },
          },
        ],
        legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: legend } },
        tooltip: {
          theme: dark ? "dark" : "light",
          y: {
            formatter: (v, opts) =>
              opts.seriesIndex === 1
                ? `₹ ${Number(v).toLocaleString("en-IN")}`
                : `${Math.round(v)} leads`,
          },
        },
      }
    : {
        chart: { ...baseChart, stacked: false },
        colors: [GOLD, ink],
        stroke: { curve: "smooth", width: 3 },
        markers: { size: 5, strokeWidth: 2, strokeColors: paper, hover: { size: 7 } },
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: dark ? 0.4 : 0.5,
            opacityTo: 0.05,
            stops: [0, 90, 100],
          },
        },
        dataLabels: { enabled: false },
        grid: { borderColor: grid, strokeDashArray: 4 },
        xaxis: {
          categories: stores.length ? stores.map((s) => s.store) : ["No data"],
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: muted }, rotate: -15, hideOverlappingLabels: true },
        },
        yaxis: { labels: { style: { colors: muted }, formatter: (v) => String(Math.round(v)) } },
        legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: legend } },
        tooltip: { theme: dark ? "dark" : "light" },
      };

  const graphSeries = activity.hasTime
    ? [
        { name: "New leads", type: "area", data: activity.leadCounts },
        { name: "Quotation value", type: "line", data: activity.quoteAmounts },
      ]
    : [
        { name: "Leads", type: "area", data: activity.storeLeads.length ? activity.storeLeads : [0] },
        { name: "Projects", type: "line", data: activity.storeProjects.length ? activity.storeProjects : [0] },
      ];

  const chartOptions: ApexOptions = {
    chart: { ...baseChart, dropShadow: { enabled: false } },
    labels: pipelineChart.labels,
    colors: pipelineChart.empty ? [grid] : TONES,
    legend: { position: "bottom", fontSize: "12px", labels: { colors: legend } },
    dataLabels: { enabled: !pipelineChart.empty, style: { fontSize: "11px" } },
    stroke: { colors: [paper], width: 3 },
    tooltip: { theme: dark ? "dark" : "light" },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            name: { show: true, fontSize: "12px", color: muted },
            value: {
              show: true,
              fontSize: "26px",
              fontFamily: "Times New Roman, serif",
              color: ink,
            },
            total: {
              show: true,
              label: "Pipeline",
              color: GOLD,
              formatter: () => String(pipelineChart.total),
            },
          },
        },
      },
    },
  };

  const card =
    "rounded-2xl border border-[#eadfcf] bg-white shadow-[0_12px_32px_rgba(28,22,16,0.04)] dark:border-gray-800 dark:bg-white/[0.03]";

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <section className={`${card} dash-panel dash-chart overflow-hidden p-5 xl:col-span-7`}>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9a7748]">Graph</p>
        <h2 className="mt-1 font-serif text-2xl tracking-tight text-gray-800 dark:text-white/90">
          {activity.hasTime ? "Activity trend" : "Leads vs projects"}
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {activity.hasTime
            ? "Leads and quotation value over the last six months."
            : "Branch comparison from live dashboard data."}
        </p>
        <div className="mt-3">
          <Chart
            key={`graph-${theme}-${activity.hasTime ? "time" : "stores"}`}
            options={graphOptions}
            series={graphSeries}
            type="area"
            height={320}
          />
        </div>
      </section>

      <section className={`${card} dash-panel dash-chart overflow-hidden p-5 xl:col-span-5`}>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9a7748]">Chart</p>
        <h2 className="mt-1 font-serif text-2xl tracking-tight text-gray-800 dark:text-white/90">
          Pipeline mix
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Share of leads in each stage.</p>
        <div className="mt-2">
          <Chart
            key={`chart-${theme}-${pipelineChart.labels.join("-")}`}
            options={chartOptions}
            series={pipelineChart.values}
            type="donut"
            height={320}
          />
        </div>
      </section>
    </div>
  );
}
