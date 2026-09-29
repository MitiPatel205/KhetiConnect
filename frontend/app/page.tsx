"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSelectedFarm } from "../hooks/use-selected-farm";

type UpcomingTask = {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  status: string;
};

type DashboardData = {
  summary: {
    total_fields: number;
    active_crops: number;
    open_tasks: number;
    active_workers: number;
    unassigned_open_tasks: number;
    overdue_tasks: number;
    completed_tasks: number;
    low_stock_items: number;
    maintenance_due: number;
  };
  upcoming_tasks: UpcomingTask[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function formatDueDate(dateValue: string) {
  const dueDate = new Date(`${dateValue}T00:00:00`);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const dayDifference = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDifference === 0) {
    return "Due today";
  }

  if (dayDifference === 1) {
    return "Due tomorrow";
  }

  if (dayDifference === -1) {
    return "Due yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dueDate);
}

function priorityClass(priority: string) {
  const normalized = priority.toLowerCase();

  if (normalized === "urgent") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (normalized === "high") {
    return "bg-orange-100 text-orange-700 ring-orange-200";
  }

  if (normalized === "medium") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 ring-emerald-200";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalized === "in progress") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function Home() {
  const {
    farms,
    selectedFarmId,
    currentFarm,
    loadingFarms,
    farmsError,
    selectFarm,
  } = useSelectedFarm();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    if (selectedFarmId === null) {
      setDashboard(null);
      return;
    }

    async function loadDashboard() {
      setLoadingDashboard(true);
      setDashboardError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/v1/dashboard/summary?farm_id=${selectedFarmId}`,
        );

        if (!response.ok) {
          throw new Error(
            `Dashboard request failed with status ${response.status}`,
          );
        }

        const data: DashboardData = await response.json();
        setDashboard(data);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load dashboard data.";

        setDashboardError(message);
        setDashboard(null);
      } finally {
        setLoadingDashboard(false);
      }
    }

    void loadDashboard();
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    selectFarm(Number(event.target.value));
  }

  if (loadingFarms) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm font-medium text-slate-600">
          Loading your farms…
        </p>
      </main>
    );
  }

  if (farmsError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            KhetiConnect unavailable
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            We could not load your farm data.
          </h1>
          <p className="mt-3 text-slate-600">{farmsError}</p>
          <p className="mt-4 text-sm text-slate-500">
            Confirm that FastAPI is running at{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              http://127.0.0.1:8000
            </code>
            .
          </p>
        </section>
      </main>
    );
  }

  if (farms.length === 0 || selectedFarmId === null) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div aria-hidden="true" className="text-4xl">
            🌱
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Start with your first farm
          </h1>
          <p className="mt-3 text-slate-600">
            No farms are available yet. Create a farm to begin organizing your
            fields, tasks, inventory, and equipment.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            href="/farms"
          >
            Manage farms
          </Link>
        </section>
      </main>
    );
  }

  const summary = dashboard?.summary;
  const upcomingTasks = dashboard?.upcoming_tasks ?? [];
  const overdueTasks = summary?.overdue_tasks ?? 0;
  const unassignedTasks = summary?.unassigned_open_tasks ?? 0;

  const cards = [
    {
      label: "Open tasks",
      value: summary?.open_tasks ?? "—",
      note:
        overdueTasks > 0
          ? `${overdueTasks} overdue`
          : "Work scheduled and assigned",
      icon: "✓",
      color: "bg-sky-50 text-sky-700",
      href: "/tasks",
    },
    {
      label: "Low stock",
      value: summary?.low_stock_items ?? "—",
      note: "Items below reorder level",
      icon: "▣",
      color: "bg-amber-50 text-amber-700",
      href: "/inventory",
    },
    {
      label: "Maintenance due",
      value: summary?.maintenance_due ?? "—",
      note: "Equipment requiring service",
      icon: "⚙",
      color: "bg-rose-50 text-rose-700",
      href: "/equipment",
    },
    {
      label: "Active workers",
      value: summary?.active_workers ?? "—",
      note: "Available team members",
      icon: "♙",
      color: "bg-indigo-50 text-indigo-700",
      href: "/workers",
    },
    {
      label: "Total fields",
      value: summary?.total_fields ?? "—",
      note: "Fields managed",
      icon: "▦",
      color: "bg-emerald-50 text-emerald-700",
      href: "/fields",
    },
    {
      label: "Active crops",
      value: summary?.active_crops ?? "—",
      note: "Currently growing",
      icon: "✿",
      color: "bg-lime-50 text-lime-700",
      href: "/crops",
    },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Farm overview
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back to {currentFarm?.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                {currentFarm?.location ?? "Location not set"} · Stay on top of
                farm operations, tasks, inventory alerts, and equipment
                maintenance.
              </p>
            </div>

            <label className="flex w-full items-center gap-3 text-sm xl:w-auto">
              <span className="shrink-0 font-semibold text-slate-700">
                Current farm
              </span>
              <select
                aria-label="Select farm"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 xl:w-56"
                onChange={handleFarmChange}
                value={selectedFarmId}
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              href="/tasks"
            >
              + Add task
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              href="/inventory"
            >
              + Add inventory
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              href="/maintenance"
            >
              + Log maintenance
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <nav
          aria-label="Mobile navigation"
          className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          <Link
            className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
            href="/"
          >
            Dashboard
          </Link>
          <Link
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            href="/tasks"
          >
            Tasks
          </Link>
          <Link
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            href="/inventory"
          >
            Inventory
          </Link>
          <Link
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            href="/equipment"
          >
            Equipment
          </Link>
          <Link
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            href="/workers"
          >
            Workers
          </Link>
        </nav>

        {dashboardError ? (
          <div
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            role="alert"
          >
            The farm list loaded, but this dashboard could not refresh:{" "}
            {dashboardError}
          </div>
        ) : null}

        <section aria-label="Farm summary">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                href={card.href}
                key={card.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${card.color}`}
                  >
                    {card.icon}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                  {loadingDashboard ? "…" : card.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{card.note}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  className="text-lg font-bold text-slate-900 outline-none transition hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600"
                  href="/tasks"
                >
                  Upcoming tasks
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  Keep your farm work on schedule.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {loadingDashboard ? "…" : summary?.open_tasks ?? 0} open
              </span>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {loadingDashboard ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading tasks…
                </div>
              ) : upcomingTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No upcoming tasks. Your schedule is clear.
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <article
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    key={task.id}
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {task.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDueDate(task.due_date)} · {task.status}
                      </p>
                    </div>

                    <div className="flex w-fit flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(task.status)}`}
                      >
                        {task.status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${priorityClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>

            <Link
              className="mt-5 inline-flex text-sm font-semibold text-emerald-700 outline-none transition hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600"
              href="/tasks"
            >
              View all tasks →
            </Link>
          </div>

          <aside className="rounded-2xl bg-emerald-950 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold text-lime-300">
              Attention needed
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Keep the operation moving.
            </h2>

            <div className="mt-6 space-y-3">
              <Link
                className="block rounded-xl bg-white/10 p-4 outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-lime-300"
                href="/inventory"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-50">
                    Low stock items
                  </p>
                  <span className="text-xs font-semibold text-lime-300">
                    View inventory →
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {loadingDashboard ? "…" : summary?.low_stock_items ?? 0}
                </p>
                <p className="mt-1 text-sm text-emerald-100">
                  Items below their reorder level.
                </p>
              </Link>

              <Link
                className="block rounded-xl bg-white/10 p-4 outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-lime-300"
                href="/equipment"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-50">
                    Maintenance due
                  </p>
                  <span className="text-xs font-semibold text-lime-300">
                    View equipment →
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {loadingDashboard ? "…" : summary?.maintenance_due ?? 0}
                </p>
                <p className="mt-1 text-sm text-emerald-100">
                  Equipment items requiring service.
                </p>
              </Link>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {overdueTasks > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-amber-200">
                      Overdue tasks
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {loadingDashboard ? "…" : overdueTasks}
                    </p>
                    <p className="mt-1 text-sm text-emerald-100">
                      Review overdue work and update task owners.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-lime-300">
                      ✓ No overdue tasks
                    </p>
                    <p className="mt-2 text-sm text-emerald-100">
                      All scheduled work is on track.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-emerald-100">
                  Completed tasks
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {loadingDashboard ? "…" : summary?.completed_tasks ?? 0}
                </p>
                <p className="mt-1 text-sm text-emerald-100">
                  {unassignedTasks > 0
                    ? `${unassignedTasks} open task${unassignedTasks === 1 ? "" : "s"} still need an owner.`
                    : "Every open task has an assigned owner."}
                </p>
              </div>
            </div>

            <Link
              className="mt-5 inline-flex text-sm font-semibold text-lime-300 outline-none transition hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300"
              href="/tasks"
            >
              Review all tasks →
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}