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
};

type Crop = {
  id: number;
  name: string;
  field_id: number;
  planting_date: string | null;
  expected_harvest_date: string | null;
  status: string;
  notes: string | null;
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

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "planned":
      return "bg-sky-100 text-sky-800";
    case "harvested":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function CropsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [fieldId, setFieldId] = useState("");
  const [name, setName] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [status, setStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
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
      setFields([]);
      setCrops([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    setFieldId("");
    setShowForm(false);

    async function loadFarmData() {
      setLoadingData(true);
      setError(null);

      try {
        const [fieldsResponse, cropsResponse] = await Promise.all([
          fetch(`${API_URL}/api/v1/fields?farm_id=${selectedFarmId}`),
          fetch(`${API_URL}/api/v1/crops?farm_id=${selectedFarmId}`),
        ]);

        if (!fieldsResponse.ok) {
          throw new Error(
            `Field request failed with status ${fieldsResponse.status}`,
          );
        }

        if (!cropsResponse.ok) {
          throw new Error(
            `Crop request failed with status ${cropsResponse.status}`,
          );
        }

        const [fieldData, cropData] = await Promise.all([
          fieldsResponse.json() as Promise<Field[]>,
          cropsResponse.json() as Promise<Crop[]>,
        ]);

        setFields(fieldData);
        setCrops(cropData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load crops.",
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadFarmData();
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedFieldId = Number(fieldId);

    if (!trimmedName) {
      setError("Crop name is required.");
      return;
    }

    if (!Number.isInteger(parsedFieldId) || parsedFieldId <= 0) {
      setError("Select a field before creating a crop.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/crops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field_id: parsedFieldId,
          name: trimmedName,
          planting_date: plantingDate || null,
          expected_harvest_date: harvestDate || null,
          status,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create crop. Server returned ${response.status}.`,
        );
      }

      const newCrop: Crop = await response.json();

      setCrops((currentCrops) => [...currentCrops, newCrop]);
      setFieldId("");
      setName("");
      setPlantingDate("");
      setHarvestDate("");
      setStatus("Active");
      setNotes("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the crop.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const fieldNameById = new Map(fields.map((field) => [field.id, field.name]));

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
              Crop planning
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Crops
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Track what is growing in each field, from planting through
              harvest.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedFarmId === null || fields.length === 0}
            onClick={() => {
              setError(null);
              setShowForm((visible) => !visible);
            }}
            type="button"
          >
            {showForm ? "Cancel" : "+ New crop"}
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
              Managing crops for{" "}
              <span className="font-semibold text-slate-700">
                {selectedFarm.name}
              </span>
              {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
            </p>
          ) : null}
        </div>

        {selectedFarmId !== null && !loadingData && fields.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="font-bold">Add a field before creating crops</h2>
            <p className="mt-2 text-sm">
              Crops must be assigned to a field. Create a field for this farm
              first, then return here to add crops.
            </p>
            <Link
              className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
              href="/fields"
            >
              Go to fields
            </Link>
          </div>
        ) : null}

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Create a crop</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a crop to a field on {selectedFarm?.name ?? "the selected farm"}.
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Crop name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Tomatoes"
                  required
                  value={name}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Field <span className="text-red-600">*</span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setFieldId(event.target.value)}
                  required
                  value={fieldId}
                >
                  <option value="">Select a field</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Planting date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setPlantingDate(event.target.value)}
                  type="date"
                  value={plantingDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Expected harvest
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setHarvestDate(event.target.value)}
                  type="date"
                  value={harvestDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Harvested">Harvested</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Cherry tomato variety"
                  value={notes}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating crop…" : "Create crop"}
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
              {selectedFarm ? `${selectedFarm.name} crops` : "All crops"}
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {crops.length} {crops.length === 1 ? "crop" : "crops"}
            </span>
          </div>

          {loadingFarms || loadingData ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading crops…
            </div>
          ) : selectedFarmId === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Create a farm before planning crops.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : fields.length > 0 && crops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌿</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No crops yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Add the first crop growing on this farm.
              </p>
              <button
                className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                onClick={() => setShowForm(true)}
                type="button"
              >
                Create your first crop
              </button>
            </div>
          ) : crops.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {crops.map((crop) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={crop.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-50 text-xl">
                      🌿
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(crop.status)}`}
                    >
                      {crop.status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {crop.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {fieldNameById.get(crop.field_id) ?? "Field unavailable"}
                  </p>

                  <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Planted</dt>
                      <dd className="text-right font-medium text-slate-700">
                        {formatDate(crop.planting_date)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Expected harvest</dt>
                      <dd className="text-right font-medium text-slate-700">
                        {formatDate(crop.expected_harvest_date)}
                      </dd>
                    </div>
                  </dl>

                  {crop.notes ? (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {crop.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}