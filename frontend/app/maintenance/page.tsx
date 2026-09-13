"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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
  next_service_date: string | null;
};

type MaintenanceLog = {
  id: number;
  equipment_id: number;
  service_date: string;
  description: string;
  cost: number | null;
  provider: string | null;
  notes: string | null;
  created_at: string;
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

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function MaintenancePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);

  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<
    number | null
  >(null);

  const [serviceDate, setServiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");

  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setServiceDate("");
    setDescription("");
    setCost("");
    setProvider("");
    setNotes("");
    setEditingLogId(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

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

      const queryEquipmentId = new URLSearchParams(
        window.location.search,
      ).get("equipment_id");

      const parsedEquipmentId = queryEquipmentId
        ? Number(queryEquipmentId)
        : null;

      if (
        parsedEquipmentId !== null &&
        data.some((item) => item.id === parsedEquipmentId)
      ) {
        setSelectedEquipmentId(parsedEquipmentId);
      } else if (data.length > 0) {
        setSelectedEquipmentId(data[0].id);
      } else {
        setSelectedEquipmentId(null);
      }
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

  async function loadLogs(equipmentId: number) {
    setLoadingLogs(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/maintenance-logs?equipment_id=${equipmentId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Maintenance-log request failed with status ${response.status}`,
        );
      }

      const data: MaintenanceLog[] = await response.json();
      setLogs(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load maintenance history.",
      );
    } finally {
      setLoadingLogs(false);
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
      setSelectedEquipmentId(null);
      setLogs([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    closeForm();
    setLogs([]);
    loadEquipment(selectedFarmId);
  }, [selectedFarmId]);

  useEffect(() => {
    if (selectedEquipmentId === null) {
      setLogs([]);
      return;
    }

    closeForm();
    loadLogs(selectedEquipmentId);
  }, [selectedEquipmentId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  function handleEquipmentChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setSelectedEquipmentId(Number(event.target.value));
  }

  function openCreateForm() {
    resetForm();
    setError(null);
    setShowForm(true);
  }

  function openEditForm(log: MaintenanceLog) {
    setError(null);
    setEditingLogId(log.id);
    setServiceDate(log.service_date);
    setDescription(log.description);
    setCost(log.cost === null ? "" : String(log.cost));
    setProvider(log.provider ?? "");
    setNotes(log.notes ?? "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedEquipmentId === null) {
      setError("Select equipment before saving a maintenance log.");
      return;
    }

    if (!serviceDate) {
      setError("Service date is required.");
      return;
    }

    if (!description.trim()) {
      setError("Maintenance description is required.");
      return;
    }

    const parsedCost = cost.trim() ? Number(cost) : null;

    if (
      parsedCost !== null &&
      (!Number.isFinite(parsedCost) || parsedCost < 0)
    ) {
      setError("Cost must be zero or a positive number.");
      return;
    }

    const isEditing = editingLogId !== null;

    const createPayload = {
      equipment_id: selectedEquipmentId,
      service_date: serviceDate,
      description: description.trim(),
      cost: parsedCost,
      provider: provider.trim() || null,
      notes: notes.trim() || null,
    };

    const updatePayload = {
      service_date: serviceDate,
      description: description.trim(),
      cost: parsedCost,
      provider: provider.trim() || null,
      notes: notes.trim() || null,
    };

    const endpoint = isEditing
      ? `${API_URL}/api/v1/maintenance-logs/${editingLogId}`
      : `${API_URL}/api/v1/maintenance-logs`;

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
            `Could not ${isEditing ? "update" : "create"} maintenance log. Server returned ${response.status}.`,
        );
      }

      const savedLog: MaintenanceLog = await response.json();

      if (isEditing) {
        setLogs((currentLogs) =>
          currentLogs.map((log) => (log.id === savedLog.id ? savedLog : log)),
        );
      } else {
        setLogs((currentLogs) => [savedLog, ...currentLogs]);
      }

      closeForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${isEditing ? "update" : "create"} maintenance log.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(log: MaintenanceLog) {
    const shouldDelete = window.confirm(
      `Delete the maintenance record "${log.description}" from ${formatDate(log.service_date)}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingLogId(log.id);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/maintenance-logs/${log.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not delete maintenance log. Server returned ${response.status}.`,
        );
      }

      setLogs((currentLogs) =>
        currentLogs.filter((currentLog) => currentLog.id !== log.id),
      );

      if (editingLogId === log.id) {
        closeForm();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete maintenance log.",
      );
    } finally {
      setDeletingLogId(null);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const selectedEquipment =
    equipment.find((item) => item.id === selectedEquipmentId) ?? null;

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
            href="/equipment"
          >
            ← Equipment
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Equipment servicing
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Maintenance logs
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Record, update, and organize inspections, repairs, and scheduled
              service for every equipment item.
            </p>
          </div>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedEquipmentId === null}
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
            type="button"
          >
            {showForm ? "Cancel" : "+ Add maintenance log"}
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

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              Current farm
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                Viewing assets at{" "}
                <span className="font-semibold text-slate-700">
                  {selectedFarm.name}
                </span>
                {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              Equipment item
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                disabled={loadingEquipment || equipment.length === 0}
                onChange={handleEquipmentChange}
                value={selectedEquipmentId ?? ""}
              >
                {equipment.length === 0 ? (
                  <option value="">No equipment available</option>
                ) : (
                  equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.asset_tag ? ` (${item.asset_tag})` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>

            {selectedEquipment ? (
              <p className="mt-3 text-sm text-slate-500">
                {selectedEquipment.category}
                {selectedEquipment.asset_tag
                  ? ` · ${selectedEquipment.asset_tag}`
                  : ""}
                {selectedEquipment.next_service_date
                  ? ` · Next service ${formatDate(
                      selectedEquipment.next_service_date,
                    )}`
                  : ""}
              </p>
            ) : null}
          </section>
        </div>

        {selectedFarmId !== null &&
        !loadingEquipment &&
        equipment.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="font-bold">Add equipment before logging service</h2>
            <p className="mt-2 text-sm">
              Maintenance records must belong to a specific equipment item.
              Create equipment for this farm first.
            </p>
            <Link
              className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
              href="/equipment"
            >
              Go to equipment
            </Link>
          </section>
        ) : null}

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {editingLogId === null
                ? "Add maintenance log"
                : "Edit maintenance log"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingLogId === null
                ? `Record completed work for ${selectedEquipment?.name ?? "the selected equipment"}.`
                : "Correct service details, recorded cost, provider, or notes."}
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Service date <span className="text-red-600">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setServiceDate(event.target.value)}
                  required
                  type="date"
                  value={serviceDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Cost
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  min="0"
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="e.g., 180"
                  step="0.01"
                  type="number"
                  value={cost}
                />
              </label>

              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Service description <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g., Oil change and filter replacement"
                  required
                  value={description}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Service provider
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setProvider(event.target.value)}
                  placeholder="e.g., Farm Equipment Service LLC"
                  value={provider}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Next service due in three months"
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
                    ? editingLogId === null
                      ? "Saving log…"
                      : "Saving changes…"
                    : editingLogId === null
                      ? "Save maintenance log"
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
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Service history
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedEquipment
                  ? `Maintenance records for ${selectedEquipment.name}`
                  : "Select equipment to view its service history."}
              </p>
            </div>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {logs.length} {logs.length === 1 ? "record" : "records"}
            </span>
          </div>

          {loadingFarms || loadingEquipment || loadingLogs ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading maintenance history…
            </div>
          ) : selectedEquipmentId === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🔧</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Select equipment
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Choose an equipment item to see its maintenance records.
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🔧</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No maintenance logs yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Record the first inspection, repair, or routine service.
              </p>
              <button
                className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                onClick={openCreateForm}
                type="button"
              >
                Add first maintenance log
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={log.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatDate(log.service_date)}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        {log.description}
                      </h3>
                      {log.provider ? (
                        <p className="mt-1 text-sm text-slate-600">
                          Provider: {log.provider}
                        </p>
                      ) : null}
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                      {formatCurrency(log.cost)}
                    </span>
                  </div>

                  {log.notes ? (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {log.notes}
                    </p>
                  ) : null}

                  <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                    <button
                      className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 disabled:opacity-50"
                      disabled={deletingLogId === log.id}
                      onClick={() => openEditForm(log)}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingLogId === log.id}
                      onClick={() => handleDelete(log)}
                      type="button"
                    >
                      {deletingLogId === log.id ? "Deleting…" : "Delete"}
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