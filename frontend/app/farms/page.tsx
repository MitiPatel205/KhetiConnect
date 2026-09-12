"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
  size_acres: number | null;
  notes: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function formatAcreage(sizeAcres: number | null) {
  if (sizeAcres === null) {
    return "Acreage not set";
  }

  return `${sizeAcres} ${sizeAcres === 1 ? "acre" : "acres"}`;
}

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [sizeAcres, setSizeAcres] = useState("");
  const [notes, setNotes] = useState("");

  const [editingFarmId, setEditingFarmId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingFarmId, setDeletingFarmId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFarms() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/farms`);

      if (!response.ok) {
        throw new Error(`Farm request failed with status ${response.status}`);
      }

      const data: Farm[] = await response.json();
      setFarms(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load farms.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFarms();
  }, []);

  function resetForm() {
    setName("");
    setLocation("");
    setSizeAcres("");
    setNotes("");
    setEditingFarmId(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function openCreateForm() {
    resetForm();
    setError(null);
    setShowForm(true);
  }

  function openEditForm(farm: Farm) {
    setError(null);
    setEditingFarmId(farm.id);
    setName(farm.name);
    setLocation(farm.location ?? "");
    setSizeAcres(farm.size_acres === null ? "" : String(farm.size_acres));
    setNotes(farm.notes ?? "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedSizeAcres = sizeAcres.trim() ? Number(sizeAcres) : null;

    if (!trimmedName) {
      setError("Farm name is required.");
      return;
    }

    if (
      parsedSizeAcres !== null &&
      (!Number.isFinite(parsedSizeAcres) || parsedSizeAcres <= 0)
    ) {
      setError("Farm size must be a number greater than zero.");
      return;
    }

    const isEditing = editingFarmId !== null;

    const payload = {
      name: trimmedName,
      location: location.trim() || null,
      size_acres: parsedSizeAcres,
      notes: notes.trim() || null,
    };

    const endpoint = isEditing
      ? `${API_URL}/api/v1/farms/${editingFarmId}`
      : `${API_URL}/api/v1/farms`;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not ${isEditing ? "update" : "create"} farm. Server returned ${response.status}.`,
        );
      }

      const savedFarm: Farm = await response.json();

      if (isEditing) {
        setFarms((currentFarms) =>
          currentFarms.map((farm) =>
            farm.id === savedFarm.id ? savedFarm : farm,
          ),
        );
      } else {
        setFarms((currentFarms) => [...currentFarms, savedFarm]);
        window.localStorage.setItem("selectedFarmId", String(savedFarm.id));
      }

      closeForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${isEditing ? "update" : "create"} farm.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(farm: Farm) {
    const savedFarmId = window.localStorage.getItem("selectedFarmId");
    const selectedFarmId = savedFarmId ? Number(savedFarmId) : null;

    if (farm.id === selectedFarmId) {
      setError(
        `You cannot delete "${farm.name}" because it is currently selected. Select another farm from the dashboard first.`,
      );
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${farm.name}"? Fields, crops, tasks, inventory, equipment, and maintenance records associated with this farm may also be removed. This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingFarmId(farm.id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/farms/${farm.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not delete farm. Server returned ${response.status}.`,
        );
      }

      setFarms((currentFarms) =>
        currentFarms.filter((currentFarm) => currentFarm.id !== farm.id),
      );

      if (editingFarmId === farm.id) {
        closeForm();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete farm.",
      );
    } finally {
      setDeletingFarmId(null);
    }
  }

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
              Farm workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Your farms
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Create, update, and organize the farms you manage.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
            type="button"
          >
            {showForm ? "Cancel" : "+ New farm"}
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

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {editingFarmId === null ? "Create a farm" : "Edit farm"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingFarmId === null
                ? "Add the basic information needed to begin organizing your farm."
                : "Update this farm’s name, location, acreage, or notes."}
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Farm name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Sunrise Acres"
                  required
                  value={name}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Location
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g., Sussex County, New Jersey"
                  value={location}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Farm size in acres
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  min="0.01"
                  onChange={(event) => setSizeAcres(event.target.value)}
                  placeholder="e.g., 24.5"
                  step="0.01"
                  type="number"
                  value={sizeAcres}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Family-owned vegetable farm"
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
                    ? editingFarmId === null
                      ? "Creating farm…"
                      : "Saving changes…"
                    : editingFarmId === null
                      ? "Create farm"
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All farms</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {farms.length} {farms.length === 1 ? "farm" : "farms"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading farms…
            </div>
          ) : farms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌾</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No farms yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Create your first farm to begin managing fields, crops, and
                daily work.
              </p>
              <button
                className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                onClick={openCreateForm}
                type="button"
              >
                Create your first farm
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {farms.map((farm) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={farm.id}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                    🌱
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {farm.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {farm.location ?? "Location not set"}
                  </p>

                  <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    {formatAcreage(farm.size_acres)}
                  </p>

                  {farm.notes ? (
                    <p className="mt-3 text-sm text-slate-600">{farm.notes}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
                    <Link
                      className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
                      href="/"
                      onClick={() =>
                        window.localStorage.setItem(
                          "selectedFarmId",
                          String(farm.id),
                        )
                      }
                    >
                      Open dashboard →
                    </Link>

                    <button
                      className="text-sm font-semibold text-sky-700 transition hover:text-sky-900 disabled:opacity-50"
                      disabled={deletingFarmId === farm.id}
                      onClick={() => openEditForm(farm)}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingFarmId === farm.id}
                      onClick={() => handleDelete(farm)}
                      type="button"
                    >
                      {deletingFarmId === farm.id ? "Deleting…" : "Delete"}
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