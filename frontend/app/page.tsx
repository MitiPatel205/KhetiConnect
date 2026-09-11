"use client";

import { useEffect, useState } from "react";

type UpcomingTask = {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  status: string;
};

type DashboardData = {
  farm: {
    id: number;
    name: string;
    location: string | null;
  };
  summary: {
    total_fields: number;
    active_crops: number;
    open_tasks: number;
    overdue_tasks: number;
    completed_tasks: number;
    low_stock_items: number;
    maintenance_due: number;
  };
  upcoming_tasks: UpcomingTask[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function priorityClass(priority: string) {
  const normalized = priority.toLowerCase();

  if (normalized === "high" || normalized === "urgent") {
    return "bg-red-100 text-red-700 ring-red-200";
  }

  if (normalized === "medium") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 ring-emerald-200";
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/dashboard/summary?farm_id=1`,
        );

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data: DashboardData = await response.json();
        setDashboard(data);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load dashboard data.";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        Loading KhetiConnect dashboard…
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Dashboard unavailable
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            We could not load your farm data.
          </h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <p className="mt-4 text-sm text-slate-500">
            Confirm that the FastAPI server is running at{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              http://127.0.0.1:8000
            </code>
            .
          </p>
        </section>
      </main>
    );
  }

  const { farm, summary, upcoming_tasks } = dashboard;

  const cards = [
    {
      label: "Total Fields",
      value: summary.total_fields,
      note: "Fields managed",
      icon: "▦",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Active Crops",
      value: summary.active_crops,
      note: "Currently growing",
      icon: "✿",
      color: "bg-lime-50 text-lime-700",
    },
    {
      label: "Open Tasks",
      value: summary.open_tasks,
      note: `${summary.overdue_tasks} overdue`,
      icon: "✓",
      color: "bg-sky-50 text-sky-700",
    },
    {
      label: "Low Stock",
      value: summary.low_stock_items,
      note: "Items need attention",
      icon: "▣",
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-emerald-950/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-emerald-950">
              🌱
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">KhetiConnect</p>
              <p className="text-xs text-emerald-100">
                Farm management, connected
              </p>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{farm.name}</p>
            <p className="text-xs text-emerald-200">
              {farm.location ?? "Location not set"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1 text-sm">
            <a
              className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 font-semibold text-emerald-800"
              href="/"
            >
              <span>⌂</span>
              Dashboard
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              href="#fields"
            >
              <span>▦</span>
              Fields
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              href="#crops"
            >
              <span>✿</span>
              Crops
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              href="#tasks"
            >
              <span>✓</span>
              Tasks
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              href="#inventory"
            >
              <span>▣</span>
              Inventory
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              href="#equipment"
            >
              <span>⚙</span>
              Equipment
            </a>
          </nav>
        </aside>

        <section>
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Farm overview
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Welcome back to {farm.name}
              </h1>
              <p className="mt-2 text-slate-600">
                Review today’s work and the health of your farm operation.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="font-semibold">{summary.completed_tasks}</span>{" "}
              completed tasks
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                key={card.label}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${card.color}`}
                  >
                    {card.icon}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-bold tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{card.note}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              id="tasks"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Upcoming tasks</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your farm work on schedule.
                  </p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {summary.open_tasks} open
                </span>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {upcoming_tasks.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    No upcoming tasks. Your schedule is clear.
                  </div>
                ) : (
                  upcoming_tasks.map((task) => (
                    <article
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      key={task.id}
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {task.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Due {formatDate(task.due_date)} · {task.status}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${priorityClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-emerald-950 p-6 text-white shadow-sm">
              <p className="text-sm font-semibold text-lime-300">
                Attention needed
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Keep the operation moving.
              </h2>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-sm text-emerald-100">Low stock items</p>
                  <p className="mt-1 text-2xl font-bold">
                    {summary.low_stock_items}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-sm text-emerald-100">Maintenance due</p>
                  <p className="mt-1 text-2xl font-bold">
                    {summary.maintenance_due}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-sm text-emerald-100">Overdue tasks</p>
                  <p className="mt-1 text-2xl font-bold">
                    {summary.overdue_tasks}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}