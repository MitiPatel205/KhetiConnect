"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName) {
      setError("Farm name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/farms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          location: trimmedLocation || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create farm. Server returned ${response.status}.`,
        );
      }

      const newFarm: Farm = await response.json();

      setFarms((currentFarms) => [...currentFarms, newFarm]);
      window.localStorage.setItem("selectedFarmId", String(newFarm.id));

      setName("");
      setLocation("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the farm.",
      );
    } finally {
      setSaving(false);
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
              Create and organize the farms you manage. Select a newly created
              farm automatically when you return to the dashboard.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            onClick={() => {
              setError(null);
              setShowForm((visible) => !visible);
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
            <h2 className="text-lg font-bold text-slate-900">Create a farm</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add the basic information needed to begin organizing your farm.
            </p>

            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
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

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating farm…" : "Create farm"}
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              All farms
            </h2>
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
                onClick={() => setShowForm(true)}
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

                  <Link
                    className="mt-5 inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
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
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}