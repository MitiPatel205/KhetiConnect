"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

type InventoryItem = {
  id: number;
  farm_id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  supplier: string | null;
  expiry_date: string | null;
  notes: string | null;
  is_low_stock: boolean;
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

function quantityLabel(item: InventoryItem) {
  return `${item.quantity} ${item.unit}`;
}

export default function InventoryPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Seeds");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [supplier, setSupplier] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems(farmId: number) {
    setLoadingItems(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/inventory?farm_id=${farmId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Inventory request failed with status ${response.status}`,
        );
      }

      const data: InventoryItem[] = await response.json();
      setItems(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load inventory.",
      );
    } finally {
      setLoadingItems(false);
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
      setItems([]);
      return;
    }

    window.localStorage.setItem("selectedFarmId", String(selectedFarmId));
    setShowForm(false);
    loadItems(selectedFarmId);
  }, [selectedFarmId]);

  function handleFarmChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFarmId(Number(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFarmId === null) {
      setError("Select a farm before creating an inventory item.");
      return;
    }

    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    if (!unit.trim()) {
      setError("Unit is required, for example packets, bags, liters, or kg.");
      return;
    }

    const parsedQuantity = Number(quantity);
    const parsedReorderLevel = Number(reorderLevel);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError("Quantity must be a number that is zero or greater.");
      return;
    }

    if (!Number.isFinite(parsedReorderLevel) || parsedReorderLevel < 0) {
      setError("Reorder level must be a number that is zero or greater.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name: name.trim(),
          category: category.trim(),
          quantity: parsedQuantity,
          unit: unit.trim(),
          reorder_level: parsedReorderLevel,
          supplier: supplier.trim() || null,
          expiry_date: expiryDate || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          responseBody ||
            `Could not create item. Server returned ${response.status}.`,
        );
      }

      const newItem: InventoryItem = await response.json();

      setItems((currentItems) => [...currentItems, newItem]);
      setName("");
      setCategory("Seeds");
      setQuantity("");
      setUnit("");
      setReorderLevel("");
      setSupplier("");
      setExpiryDate("");
      setNotes("");
      setShowForm(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create inventory item.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const lowStockItems = items.filter((item) => item.is_low_stock);

  const visibleItems = useMemo(
    () => (lowStockOnly ? items.filter((item) => item.is_low_stock) : items),
    [items, lowStockOnly],
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
              Supply tracking
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Inventory
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Keep track of seeds, fertilizer, supplies, and stock that needs
              reordering.
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
            {showForm ? "Cancel" : "+ New item"}
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
                Managing stock for{" "}
                <span className="font-semibold text-slate-700">
                  {selectedFarm.name}
                </span>
                {selectedFarm.location ? ` · ${selectedFarm.location}` : ""}.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">Low stock</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {lowStockItems.length}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              item{lowStockItems.length === 1 ? "" : "s"} need attention
            </p>
          </section>
        </div>

        {showForm ? (
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Create an inventory item
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a supply record for {selectedFarm?.name ?? "the selected farm"}.
            </p>

            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <label className="text-sm font-medium text-slate-700">
                Item name <span className="text-red-600">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Tomato Seeds"
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
                  placeholder="e.g., Seeds"
                  required
                  value={category}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Current quantity <span className="text-red-600">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  min="0"
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="e.g., 4"
                  required
                  step="any"
                  type="number"
                  value={quantity}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Unit <span className="text-red-600">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="e.g., packets, bags, liters"
                  required
                  value={unit}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Reorder level <span className="text-red-600">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  min="0"
                  onChange={(event) => setReorderLevel(event.target.value)}
                  placeholder="e.g., 5"
                  required
                  step="any"
                  type="number"
                  value={reorderLevel}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Supplier
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setSupplier(event.target.value)}
                  placeholder="e.g., Local Seed Co."
                  value={supplier}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Expiry date
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  type="date"
                  value={expiryDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  disabled={saving}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g., Store in a cool, dry place"
                  value={notes}
                />
              </label>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating item…" : "Create item"}
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
                {selectedFarm ? `${selectedFarm.name} inventory` : "Inventory"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleItems.length} shown of {items.length} total items
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              <input
                checked={lowStockOnly}
                className="h-4 w-4 accent-emerald-700"
                onChange={(event) => setLowStockOnly(event.target.checked)}
                type="checkbox"
              />
              Show low stock only
            </label>
          </div>

          {loadingFarms || loadingItems ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading inventory…
            </div>
          ) : selectedFarmId === null ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🌱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Create a farm first
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Inventory belongs to a farm. Create a farm before recording
                supplies.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/farms"
              >
                Go to farms
              </Link>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">{lowStockOnly ? "✓" : "📦"}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {lowStockOnly ? "No low-stock items" : "No inventory yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {lowStockOnly
                  ? "All currently visible supplies are above their reorder levels."
                  : "Add seeds, fertilizer, fuel, or other farm supplies."}
              </p>
              {!lowStockOnly ? (
                <button
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  onClick={() => setShowForm(true)}
                  type="button"
                >
                  Create your first item
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <article
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    item.is_low_stock
                      ? "border-amber-300"
                      : "border-slate-200"
                  }`}
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                      📦
                    </div>
                    {item.is_low_stock ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        In stock
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.category}
                    {item.supplier ? ` · ${item.supplier}` : ""}
                  </p>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current quantity
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {quantityLabel(item)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Reorder at {item.reorder_level} {item.unit}
                    </p>
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Expiry</dt>
                      <dd className="text-right font-medium text-slate-700">
                        {formatDate(item.expiry_date)}
                      </dd>
                    </div>
                  </dl>

                  {item.notes ? (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {item.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}