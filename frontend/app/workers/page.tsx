"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

type Worker = {
  id: number;
  farm_id: number;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function WorkersPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingWorkerId, setDeletingWorkerId] = useState<number | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setRole("");
    setPhone("");
    setEmail("");
    setHireDate("");
    setIsActive(true);
    setNotes("");
    setEditingWorkerId(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  async function loadWorkers(farmId: number) {
    setLoadingWorkers(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/workers?farm_id=${farmId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Worker request failed with status ${response.status}`,
        );
      }

      const data: Worker[] = await response.json();
      setWorkers(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load workers.",
      );
    } finally {
      setLoadingWorkers(false);
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
      setWorkers([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    closeForm();
    loadWorkers(selectedFarmId);
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  function openCreateForm() {
    resetForm();
    setError(null);
    setShowForm(true);
  }

  function openEditForm(worker: Worker) {
    setError(null);
    setEditingWorkerId(worker.id);
    setName(worker.name);
    setRole(worker.role ?? "");
    setPhone(worker.phone ?? "");
    setEmail(worker.email ?? "");
    setHireDate(worker.hire_date ?? "");
    setIsActive(worker.is_active);
    setNotes(worker.notes ?? "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFarmId === null) {
      setError("Select a farm before saving a worker.");
      return;
    }

    if (!name.trim()) {
      setError("Worker name is required.");
      return;
    }

    const isEditing = editingWorkerId !== null;

    const createPayload = {
      farm_id: selectedFarmId,
      name: name.trim(),
      role: role.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      hire_date: hireDate || null,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    const updatePayload = {
      name: name.trim(),
      role: role.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      hire_date: hireDate || null,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    const endpoint = isEditing
      ? `${API_URL}/api/v1/workers/${editingWorkerId}`
      : `${API_URL}/api/v1/workers`;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isEditing ? updatePayload : createPayload),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not ${isEditing ? "update" : "create"} worker. Server returned ${response.status}.`,
        );
      }

      const savedWorker: Worker = await response.json();

      if (isEditing) {
        setWorkers((currentWorkers) =>
          currentWorkers.map((worker) =>
            worker.id === savedWorker.id ? savedWorker : worker,
          ),
        );
      } else {
        setWorkers((currentWorkers) => [...currentWorkers, savedWorker]);
      }

      closeForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${isEditing ? "update" : "create"} worker.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(worker: Worker) {
    const shouldDelete = window.confirm(
      `Delete "${worker.name}"? Tasks assigned to this worker will become unassigned. This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingWorkerId(worker.id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/workers/${worker.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not delete worker. Server returned ${response.status}.`,
        );
      }

      setWorkers((currentWorkers) =>
        currentWorkers.filter((currentWorker) => currentWorker.id !== worker.id),
      );

      if (editingWorkerId === worker.id) {
        closeForm();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete worker.",
      );
    } finally {
      setDeletingWorkerId(null);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const activeWorkerCount = workers.filter((worker) => worker.is_active).length;

  const visibleWorkers = useMemo(
    () => (activeOnly ? workers.filter((worker) => worker.is_active) : workers),
    [activeOnly, workers],
  );

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
              Workforce management
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Workers
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Manage farm team members, contact details, roles, and availability.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedFarmId === null}
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
            type="button"
          >
            {showForm ? "Cancel" : "+ New worker"}
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
                Managing workers for{" "}
                <span className="font-semibold text-slate-700">
                  {selectedFarm.name}
                </span>
                {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
            <p className="text-sm font-medium text-sky-800">Active workers</p>
            <p className="mt-2 text-3xl font-bold text-sky-950">
              {activeWorkerCount}
            </p>
            <p className="mt-1 text-sm text-sky-800">
              of {workers.length} total team member
              {workers.length === 1 ? "" : "s"}
            </p>
          </section>
        </div>

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {editingWorkerId === null ? "Add worker" : "Edit worker"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingWorkerId === null
                ? `Add a team member for ${selectedFarm?.name ?? "the selected farm"}.`
                : "Update the worker’s details and availability."}
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Full name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Aarav Patel"
                  required
                  value={name}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Role
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="e.g., Farmhand"
                  value={role}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Phone
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g., 555-0100"
                  type="tel"
                  value={phone}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Email
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g., worker@example.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Hire date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setHireDate(event.target.value)}
                  type="date"
                  value={hireDate}
                />
              </label>

              <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  checked={isActive}
                  className="h-4 w-4 accent-emerald-700"
                  disabled={saving}
                  onChange={(event) => setIsActive(event.target.checked)}
                  type="checkbox"
                />
                Currently active
              </label>

              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Notes
                <textarea
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Certified to operate tractors and irrigation equipment"
                  value={notes}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving
                    ? editingWorkerId === null
                      ? "Adding worker…"
                      : "Saving changes…"
                    : editingWorkerId === null
                      ? "Add worker"
                      : "Save changes"}
                </button>

                <button
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  disabled={saving}
                  onClick={closeForm}
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
                {selectedFarm ? `${selectedFarm.name} workers` : "Workers"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleWorkers.length} shown of {workers.length} total team
                member{workers.length === 1 ? "" : "s"}
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              <input
                checked={activeOnly}
                className="h-4 w-4 accent-emerald-700"
                onChange={(event) => setActiveOnly(event.target.checked)}
                type="checkbox"
              />
              Show active workers only
            </label>
          </div>

          {loadingFarms || loadingWorkers ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading workers…
            </div>
          ) : selectedFarmId === null ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Workers belong to a farm. Create a farm before adding team
                members.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : visibleWorkers.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">{activeOnly ? "✓" : "👩‍🌾"}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {activeOnly ? "No active workers" : "No workers yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {activeOnly
                  ? "No currently active team members match this filter."
                  : "Add farmhands, equipment operators, and other team members to assign work."}
              </p>

              {!activeOnly ? (
                <button
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  onClick={openCreateForm}
                  type="button"
                >
                  Add your first worker
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleWorkers.map((worker) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={worker.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-50 text-xl">
                      👩‍🌾
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        worker.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {worker.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {worker.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {worker.role || "No role recorded"}
                  </p>

                  <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="text-right font-medium text-slate-700">
                        {worker.phone || "Not set"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="max-w-44 truncate text-right font-medium text-slate-700">
                        {worker.email || "Not set"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Hired</dt>
                      <dd className="text-right font-medium text-slate-700">
                        {formatDate(worker.hire_date)}
                      </dd>
                    </div>
                  </dl>

                  {worker.notes ? (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {worker.notes}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
                    <button
                      className="text-sm font-semibold text-sky-700 transition hover:text-sky-900 disabled:opacity-50"
                      disabled={deletingWorkerId === worker.id}
                      onClick={() => openEditForm(worker)}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingWorkerId === worker.id}
                      onClick={() => handleDelete(worker)}
                      type="button"
                    >
                      {deletingWorkerId === worker.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}