"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

type Field = {
  id: number;
  name: string;
  farm_id: number;
  area_acres: number | null;
  soil_type: string | null;
  notes: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function FieldsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [name, setName] = useState("");
  const [areaAcres, setAreaAcres] = useState("");
  const [soilType, setSoilType] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        if (parsedFarmId && data.some((farm) => farm.id === parsedFarmId)) {
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
      setFields([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));

    async function loadFields() {
      setLoadingFields(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/v1/fields?farm_id=${selectedFarmId}`,
        );

        if (!response.ok) {
          throw new Error(`Field request failed with status ${response.status}`);
        }

        const data: Field[] = await response.json();
        setFields(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load fields.",
        );
      } finally {
        setLoadingFields(false);
      }
    }

    loadFields();
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
    setShowForm(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFarmId === null) {
      setError("Select a farm before creating a field.");
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Field name is required.");
      return;
    }

    const parsedArea = areaAcres.trim() ? Number(areaAcres) : null;

    if (parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) {
      setError("Area must be a number greater than zero.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/fields`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name: trimmedName,
          area_acres: parsedArea,
          soil_type: soilType.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create field. Server returned ${response.status}.`,
        );
      }

      const newField: Field = await response.json();

      setFields((currentFields) => [...currentFields, newField]);
      setName("");
      setAreaAcres("");
      setSoilType("");
      setNotes("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the field.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

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
              Fields
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Define the growing areas within each farm, including acreage,
              soil, and important field notes.
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
            {showForm ? "Cancel" : "+ New field"}
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

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              Managing fields for{" "}
              <span className="font-semibold text-slate-700">
                {selectedFarm.name}
              </span>
              {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
            </p>
          ) : null}
        </div>

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Create a field</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add an area of land to {selectedFarm?.name ?? "the selected farm"}.
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Field name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., North Field"
                  required
                  value={name}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Area in acres
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  inputMode="decimal"
                  min="0.01"
                  onChange={(event) => setAreaAcres(event.target.value)}
                  placeholder="e.g., 2.5"
                  step="0.01"
                  type="number"
                  value={areaAcres}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Soil type
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setSoilType(event.target.value)}
                  placeholder="e.g., Loam"
                  value={soilType}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Drip irrigation installed"
                  value={notes}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating field…" : "Create field"}
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
              {selectedFarm ? `${selectedFarm.name} fields` : "All fields"}
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {fields.length} {fields.length === 1 ? "field" : "fields"}
            </span>
          </div>

          {loadingFarms || loadingFields ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading fields…
            </div>
          ) : selectedFarmId === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Fields belong to farms. Add a farm before creating a field.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌾</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No fields yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Add your first growing area to begin planning crops and work.
              </p>
              <button
                className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                onClick={() => setShowForm(true)}
                type="button"
              >
                Create your first field
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={field.id}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-50 text-xl">
                    🌾
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {field.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {field.area_acres
                      ? `${field.area_acres} acres`
                      : "Area not set"}
                  </p>

                  <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Soil</dt>
                      <dd className="font-medium text-slate-700">
                        {field.soil_type ?? "Not set"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Notes</dt>
                      <dd className="max-w-40 text-right font-medium text-slate-700">
                        {field.notes ?? "None"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}