"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PaymentRow = {
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  paidDate?: string | null;
  createdAt?: string;
};
type OrderRow = { amount?: number; orderState?: string; createdAt?: string };

const GOLD = "#c4a574";

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

export default function VendorDashboardCharts({
  payments,
  orders,
}: {
  payments: PaymentRow[];
  orders: OrderRow[];
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const ink = dark ? "#f4efe6" : "#111111";
  const muted = dark ? "#b5aa9c" : "#8a8175";
  const legend = dark ? "#d8d0c3" : "#6b645b";
  const grid = dark ? "#2c2820" : "#e4d9c8";
  const months = useMemo(() => lastSixMonths(), []);

  const payoutSeries = useMemo(() => {
    const paid = months.map((month) =>
      payments
        .filter((row) => String(row.status || "").toUpperCase() === "PAID" && monthKey(row.paidDate || row.createdAt) === month.key)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0)
    );
    const pending = months.map((month) =>
      payments
        .filter((row) => String(row.status || "").toUpperCase() !== "PAID" && monthKey(row.createdAt) === month.key)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0)
    );
    const orderCounts = months.map(
      (month) => orders.filter((row) => monthKey(row.createdAt) === month.key).length
    );
    return { paid, pending, orderCounts };
  }, [months, payments, orders]);

  const orderMix = useMemo(() => {
    const buckets = {
      Accepted: 0,
      Partial: 0,
      Delivered: 0,
      Rejected: 0,
      Other: 0,
    };
    orders.forEach((row) => {
      const state = String(row.orderState || "");
      if (state === "ORDER_ACCEPTED") buckets.Accepted += 1;
      else if (state === "PARTIALLY_DELIVERED") buckets.Partial += 1;
      else if (state === "FULLY_DELIVERED") buckets.Delivered += 1;
      else if (state === "ORDER_REJECTED") buckets.Rejected += 1;
      else buckets.Other += 1;
    });
    const labels = Object.keys(buckets);
    const values = Object.values(buckets);
    if (values.every((n) => n === 0)) return { labels: ["No orders yet"], values: [1], empty: true };
    return { labels, values, empty: false };
  }, [orders]);

  const paidTotal = payments
    .filter((row) => String(row.status || "").toUpperCase() === "PAID")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingTotal = payments
    .filter((row) => String(row.status || "").toUpperCase() !== "PAID")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payoutShare = paidTotal + pendingTotal;
  const paidPct = payoutShare > 0 ? Math.round((paidTotal / payoutShare) * 100) : 0;

  const areaOptions: ApexOptions = {
    chart: {
      fontFamily: "Times New Roman, serif",
      toolbar: { show: false },
      animations: { enabled: true, speed: 900 },
      background: "transparent",
      foreColor: muted,
    },
    colors: [GOLD, ink],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: dark ? 0.35 : 0.45, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    grid: { borderColor: grid, strokeDashArray: 4 },
    xaxis: {
      categories: months.map((m) => m.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: muted } },
    },
    yaxis: [
      { labels: { style: { colors: muted }, formatter: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))) } },
      { opposite: true, labels: { style: { colors: muted }, formatter: (v) => String(Math.round(v)) } },
    ],
    legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: legend } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v, opts) => (opts.seriesIndex === 1 ? `${v} orders` : `₹ ${Number(v).toLocaleString("en-IN")}`) } },
  };

  const donutOptions: ApexOptions = {
    chart: { fontFamily: "Times New Roman, serif", animations: { enabled: true, speed: 800 }, background: "transparent", foreColor: muted },
    labels: orderMix.labels,
    colors: orderMix.empty ? [grid] : [GOLD, "#9a7748", ink, muted, grid],
    legend: { position: "bottom", fontSize: "12px", labels: { colors: legend } },
    dataLabels: { enabled: !orderMix.empty },
    stroke: { colors: [dark ? "#161411" : "#fbf8f2"] },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: { show: true, fontSize: "12px", color: muted },
            value: { show: true, fontSize: "22px", fontFamily: "Times New Roman, serif", color: ink },
            total: { show: true, label: "Orders", color: GOLD, formatter: () => String(orders.length) },
          },
        },
      },
    },
  };

  const radialOptions: ApexOptions = {
    chart: { fontFamily: "Times New Roman, serif", animations: { enabled: true, speed: 900 }, background: "transparent" },
    colors: [GOLD],
    plotOptions: {
      radialBar: {
        hollow: { size: "62%" },
        track: { background: grid },
        dataLabels: {
          name: { offsetY: 18, color: GOLD, fontSize: "12px" },
          value: { offsetY: -12, fontSize: "28px", fontFamily: "Times New Roman, serif", color: ink, formatter: (v) => `${v}%` },
        },
      },
    },
    labels: ["Received"],
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="vendor-card vendor-rise vendor-rise-delay-2 p-5 xl:col-span-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a7748]">Six-month activity</p>
        <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Payouts and orders</h2>
        <div className="mt-3">
          <Chart
            key={`activity-${theme}`}
            options={areaOptions}
            series={[
              { name: "Paid", type: "area", data: payoutSeries.paid },
              { name: "Orders", type: "line", data: payoutSeries.orderCounts },
            ]}
            type="line"
            height={280}
          />
        </div>
      </section>

      <section className="vendor-card vendor-rise vendor-rise-delay-3 p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a7748]">Order mix</p>
        <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Delivery status</h2>
        <div className="mt-2">
          <Chart key={`mix-${theme}`} options={donutOptions} series={orderMix.values} type="donut" height={280} />
        </div>
      </section>

      <section className="vendor-card vendor-rise vendor-rise-delay-4 p-5 xl:col-span-3">
        <div className="grid items-center gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a7748]">Collections</p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Paid vs pending</h2>
            <Chart key={`radial-${theme}`} options={radialOptions} series={[paidPct]} type="radialBar" height={220} />
          </div>
          <div className="min-w-0">
            <Chart
              key={`bars-${theme}`}
              options={{
                ...areaOptions,
                chart: { ...areaOptions.chart, stacked: true },
                colors: [GOLD, dark ? "#3a342c" : "#d8d0c3"],
                yaxis: { labels: { style: { colors: muted }, formatter: (v) => `₹ ${Math.round(v).toLocaleString("en-IN")}` } },
                legend: { position: "top", horizontalAlign: "left", labels: { colors: legend } },
                tooltip: { y: { formatter: (v) => `₹ ${Number(v).toLocaleString("en-IN")}` } },
              }}
              series={[
                { name: "Received", data: payoutSeries.paid },
                { name: "Pending", data: payoutSeries.pending },
              ]}
              type="bar"
              height={220}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
