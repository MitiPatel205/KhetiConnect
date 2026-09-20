"use client";

import { useCallback, useEffect, useState } from "react";

export type Farm = {
  id: number;
  name: string;
  location: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const SELECTED_FARM_STORAGE_KEY = "selectedFarmId";

type UseSelectedFarmResult = {
  farms: Farm[];
  selectedFarmId: number | null;
  currentFarm: Farm | null;
  loadingFarms: boolean;
  farmsError: string | null;
  selectFarm: (farmId: number) => void;
  refreshFarms: () => Promise<void>;
};

export function useSelectedFarm(): UseSelectedFarmResult {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [farmsError, setFarmsError] = useState<string | null>(null);

  const refreshFarms = useCallback(async () => {
    setLoadingFarms(true);
    setFarmsError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/farms`);

      if (!response.ok) {
        throw new Error(
          `Farm request failed with status ${response.status}`,
        );
      }

      const data: Farm[] = await response.json();
      setFarms(data);

      const savedFarmId = window.localStorage.getItem(
        SELECTED_FARM_STORAGE_KEY,
      );
      const parsedFarmId = savedFarmId ? Number(savedFarmId) : null;
      const savedFarmExists = data.some(
        (farm) => farm.id === parsedFarmId,
      );

      if (savedFarmExists && parsedFarmId !== null) {
        setSelectedFarmId(parsedFarmId);
      } else if (data.length > 0) {
        setSelectedFarmId(data[0].id);
      } else {
        setSelectedFarmId(null);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load farms.";

      setFarmsError(message);
      setFarms([]);
      setSelectedFarmId(null);
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  useEffect(() => {
    void refreshFarms();
  }, [refreshFarms]);

  const selectFarm = useCallback((farmId: number) => {
    setSelectedFarmId(farmId);
    window.localStorage.setItem(
      SELECTED_FARM_STORAGE_KEY,
      String(farmId),
    );
  }, []);

  const currentFarm =
    farms.find((farm) => farm.id === selectedFarmId) ?? null;

  return {
    farms,
    selectedFarmId,
    currentFarm,
    loadingFarms,
    farmsError,
    selectFarm,
    refreshFarms,
  };
}