"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

type Equipment = {
  id: number;
  farm_id: number;
  name: string;
  category: string;
  asset_tag: string | null;
  condition: string;
  purchase_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const CONDITIONS = ["Excellent", "Good", "Fair", "Needs Repair"] as const;

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

function isMaintenanceDue(item: Equipment) {
  if (!item.next_service_date) {
    return false;
  }

  const today = new Date();
  const nextService = new Date(`${item.next_service_date}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  return nextService <= today;
}

function conditionClass(condition: string) {
  switch (condition.toLowerCase()) {
    case "excellent":
      return "bg-emerald-100 text-emerald-800";
    case "good":
      return "bg-sky-100 text-sky-800";
    case "fair":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

export default function EquipmentPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tractor");
  const [assetTag, setAssetTag] = useState("");
  const [condition, setCondition] = useState("Good");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [notes, setNotes] = useState("");

  const [maintenanceDueOnly, setMaintenanceDueOnly] = useState(false);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEquipment(farmId: number) {
    setLoadingEquipment(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/equipment?farm_id=${farmId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Equipment request failed with status ${response.status}`,
        );
      }

      const data: Equipment[] = await response.json();
      setEquipment(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load equipment.",
      );
    } finally {
      setLoadingEquipment(false);
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
      setEquipment([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    setShowForm(false);
    loadEquipment(selectedFarmId);
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFarmId === null) {
      setError("Select a farm before adding equipment.");
      return;
    }

    if (!name.trim()) {
      setError("Equipment name is required.");
      return;
    }

    if (!category.trim()) {
      setError("Equipment category is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/equipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name: name.trim(),
          category: category.trim(),
          asset_tag: assetTag.trim() || null,
          condition,
          purchase_date: purchaseDate || null,
          last_service_date: lastServiceDate || null,
          next_service_date: nextServiceDate || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create equipment. Server returned ${response.status}.`,
        );
      }

      const newEquipment: Equipment = await response.json();

      setEquipment((currentEquipment) => [...currentEquipment, newEquipment]);
      setName("");
      setCategory("Tractor");
      setAssetTag("");
      setCondition("Good");
      setPurchaseDate("");
      setLastServiceDate("");
      setNextServiceDate("");
      setNotes("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create equipment.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const dueItems = equipment.filter(isMaintenanceDue);

  const visibleEquipment = useMemo(
    () =>
      maintenanceDueOnly
        ? equipment.filter(isMaintenanceDue)
        : equipment,
    [equipment, maintenanceDueOnly],
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
              Asset management
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Equipment
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Track farm machinery, service schedules, and equipment condition.
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
            {showForm ? "Cancel" : "+ New equipment"}
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
                Managing equipment for{" "}
                <span className="font-semibold text-slate-700">
                  {selectedFarm.name}
                </span>
                {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">
              Maintenance due
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {dueItems.length}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              item{dueItems.length === 1 ? "" : "s"} need attention
            </p>
          </section>
        </div>

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Add equipment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Record a machine, vehicle, tool, or other asset for{" "}
              {selectedFarm?.name ?? "the selected farm"}.
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Equipment name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., John Deere Tractor"
                  required
                  value={name}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category <span className="text-red-600">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="e.g., Tractor"
                  required
                  value={category}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Asset tag
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setAssetTag(event.target.value)}
                  placeholder="e.g., TR-001"
                  value={assetTag}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Condition
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setCondition(event.target.value)}
                  value={condition}
                >
                  {CONDITIONS.map((equipmentCondition) => (
                    <option
                      key={equipmentCondition}
                      value={equipmentCondition}
                    >
                      {equipmentCondition}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Purchase date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  type="date"
                  value={purchaseDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Last service date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setLastServiceDate(event.target.value)}
                  type="date"
                  value={lastServiceDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Next service date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNextServiceDate(event.target.value)}
                  type="date"
                  value={nextServiceDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Change oil every 200 hours"
                  value={notes}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Adding equipment…" : "Add equipment"}
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
                {selectedFarm
                  ? `${selectedFarm.name} equipment`
                  : "Equipment"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleEquipment.length} shown of {equipment.length} total
                items
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              <input
                checked={maintenanceDueOnly}
                className="h-4 w-4 accent-emerald-700"
                onChange={(event) =>
                  setMaintenanceDueOnly(event.target.checked)
                }
                type="checkbox"
              />
              Show maintenance due only
            </label>
          </div>

          {loadingFarms || loadingEquipment ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading equipment…
            </div>
          ) : selectedFarmId === null ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Equipment belongs to a farm. Create a farm before recording
                assets.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : visibleEquipment.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">{maintenanceDueOnly ? "✓" : "🚜"}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {maintenanceDueOnly
                  ? "No maintenance is due"
                  : "No equipment yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {maintenanceDueOnly
                  ? "The currently visible equipment has no past-due service dates."
                  : "Add tractors, tools, vehicles, and machinery to keep maintenance organized."}
              </p>
              {!maintenanceDueOnly ? (
                <button
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  onClick={() => setShowForm(true)}
                  type="button"
                >
                  Add your first equipment item
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleEquipment.map((item) => {
                const maintenanceDue = isMaintenanceDue(item);

                return (
                  <article
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      maintenanceDue ? "border-amber-300" : "border-slate-200"
                    }`}
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-xl">
                        🚜
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {maintenanceDue ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            Service due
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${conditionClass(item.condition)}`}
                        >
                          {item.condition}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.category}
                      {item.asset_tag ? ` · ${item.asset_tag}` : ""}
                    </p>

                    <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Last service</dt>
                        <dd className="text-right font-medium text-slate-700">
                          {formatDate(item.last_service_date)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Next service</dt>
                        <dd
                          className={`text-right font-medium ${
                            maintenanceDue ? "text-amber-800" : "text-slate-700"
                          }`}
                        >
                          {formatDate(item.next_service_date)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Purchased</dt>
                        <dd className="text-right font-medium text-slate-700">
                          {formatDate(item.purchase_date)}
                        </dd>
                      </div>
                    </dl>

                    {item.notes ? (
                      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        {item.notes}
                      </p>
                    ) : null}
                    <Link
  className="mt-4 inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
  href={`/maintenance?equipment_id=${item.id}`}
>
  View maintenance history →
</Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}