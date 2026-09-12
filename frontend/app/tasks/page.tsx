"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

type Task = {
  id: number;
  title: string;
  farm_id: number;
  due_date: string | null;
  priority: string;
  status: string;
  description: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TASK_STATUSES = ["To Do", "In Progress", "Completed"] as const;
const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function priorityClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "in progress":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status.toLowerCase() === "completed") {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(`${task.due_date}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export default function TasksPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To Do");
  const [description, setDescription] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks(farmId: number) {
    setLoadingTasks(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/tasks?farm_id=${farmId}`,
      );

      if (!response.ok) {
        throw new Error(`Task request failed with status ${response.status}`);
      }

      const data: Task[] = await response.json();
      setTasks(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load tasks.",
      );
    } finally {
      setLoadingTasks(false);
    }
  }

  useEffect(() => {
    async function loadFarms() {
      try {
        const response = await fetch(`${API_URL}/api/v1/farms`);

        if (!response.ok) {
          throw new Error(`Farm request failed with status ${response.status}`);
        }

        const data: Farm[] = await response.json();
        setFarms(data);

        const savedFarmId = window.localStorage.getItem("selectedFarmId");
        const parsedFarmId = savedFarmId ? Number(savedFarmId) : null;

        if (
          parsedFarmId !== null &&
          data.some((farm) => farm.id === parsedFarmId)
        ) {
          setSelectedFarmId(parsedFarmId);
        } else if (data.length > 0) {
          setSelectedFarmId(data[0].id);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load farms.",
        );
      } finally {
        setLoadingFarms(false);
      }
    }

    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarmId === null) {
      setTasks([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    setShowForm(false);
    loadTasks(selectedFarmId);
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFarmId === null) {
      setError("Select a farm before creating a task.");
      return;
    }

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          title: title.trim(),
          due_date: dueDate || null,
          priority,
          status,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create task. Server returned ${response.status}.`,
        );
      }

      const newTask: Task = await response.json();
      setTasks((currentTasks) => [...currentTasks, newTask]);

      setTitle("");
      setDueDate("");
      setPriority("Medium");
      setStatus("To Do");
      setDescription("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(task: Task, nextStatus: string) {
    setUpdatingTaskId(task.id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not update task. Server returned ${response.status}.`,
        );
      }

      const updatedTask: Task = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === updatedTask.id ? updatedTask : currentTask,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus =
          statusFilter === "All" || task.status === statusFilter;

        const matchesPriority =
          priorityFilter === "All" || task.priority === priorityFilter;

        return matchesStatus && matchesPriority;
      }),
    [tasks, statusFilter, priorityFilter],
  );

  const openTaskCount = tasks.filter(
    (task) => task.status.toLowerCase() !== "completed",
  ).length;

  const completedTaskCount = tasks.filter(
    (task) => task.status.toLowerCase() === "completed",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-emerald-950/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link className="flex items-center gap-3" href="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-emerald-950">
              🌱
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">KhetiConnect</p>
              <p className="text-xs text-emerald-100">
                Farm management, connected
              </p>
            </div>
          </Link>

          <Link
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            href="/"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Daily operations
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Tasks
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Plan farm work, set priorities, and mark completed work as it is
              finished.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedFarmId === null}
            onClick={() => {
              setError(null);
              setShowForm((visible) => !visible);
            }}
            type="button"
          >
            {showForm ? "Cancel" : "+ New task"}
          </button>
        </div>

        {error ? (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              Current farm
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:max-w-md"
                disabled={loadingFarms || farms.length === 0}
                onChange={handleFarmChange}
                value={selectedFarmId ?? ""}
              >
                {farms.length === 0 ? (
                  <option value="">No farms available</option>
                ) : (
                  farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            {selectedFarm ? (
              <p className="mt-3 text-sm text-slate-500">
                Managing tasks for{" "}
                <span className="font-semibold text-slate-700">
                  {selectedFarm.name}
                </span>
                {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-sm font-medium text-sky-800">Open tasks</p>
              <p className="mt-2 text-3xl font-bold text-sky-950">
                {openTaskCount}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">
                Completed
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">
                {completedTaskCount}
              </p>
            </div>
          </section>
        </div>

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Create a task</h2>
            <p className="mt-1 text-sm text-slate-500">
              Schedule work for {selectedFarm?.name ?? "the selected farm"}.
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Task title <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g., Inspect irrigation lines"
                  required
                  value={title}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Due date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setDueDate(event.target.value)}
                  type="date"
                  value={dueDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Priority
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setPriority(event.target.value)}
                  value={priority}
                >
                  {TASK_PRIORITIES.map((taskPriority) => (
                    <option key={taskPriority} value={taskPriority}>
                      {taskPriority}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Initial status
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  {TASK_STATUSES.map((taskStatus) => (
                    <option key={taskStatus} value={taskStatus}>
                      {taskStatus}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Description
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional work details"
                  value={description}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating task…" : "Create task"}
                </button>
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedFarm ? `${selectedFarm.name} tasks` : "All tasks"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredTasks.length} shown of {tasks.length} total
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-600 sm:w-40"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="All">All statuses</option>
                  {TASK_STATUSES.map((taskStatus) => (
                    <option key={taskStatus} value={taskStatus}>
                      {taskStatus}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Priority
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-600 sm:w-36"
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  value={priorityFilter}
                >
                  <option value="All">All priorities</option>
                  {TASK_PRIORITIES.map((taskPriority) => (
                    <option key={taskPriority} value={taskPriority}>
                      {taskPriority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loadingFarms || loadingTasks ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading tasks…
            </div>
          ) : selectedFarmId === null ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Tasks belong to a farm. Create a farm before scheduling work.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">✓</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {tasks.length === 0
                  ? "Add your first task to begin planning daily work."
                  : "Change or clear the filters to see more tasks."}
              </p>
              {tasks.length === 0 ? (
                <button
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  onClick={() => setShowForm(true)}
                  type="button"
                >
                  Create your first task
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <article
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                    key={task.id}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <button
                        aria-label={
                          task.status === "Completed"
                            ? `Mark ${task.title} as to do`
                            : `Mark ${task.title} as completed`
                        }
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                          task.status === "Completed"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 text-transparent hover:border-emerald-600"
                        }`}
                        disabled={updatingTaskId === task.id}
                        onClick={() =>
                          updateTaskStatus(
                            task,
                            task.status === "Completed" ? "To Do" : "Completed",
                          )
                        }
                        type="button"
                      >
                        ✓
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`font-bold ${
                              task.status === "Completed"
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </h3>
                          {isOverdue(task) ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
                              Overdue
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Due {formatDate(task.due_date)}
                          {task.description ? ` · ${task.description}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(task.status)}`}
                      >
                        {updatingTaskId === task.id
                          ? "Updating…"
                          : task.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}