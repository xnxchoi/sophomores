"use client";
import { createStore } from "zustand/vanilla";
import {
  cloneDevice,
  DEFAULT_DEVICE,
  type HA_DEVICE
} from "./detectDevice";

export type { HA_DEVICE };
export { DEFAULT_DEVICE };

export type DeviceStore = HA_DEVICE & {
  localStorage: boolean;
  setStorageAvailable: (l: boolean) => void;
  hydrateDevice: (detected: HA_DEVICE) => void;
};
export const createDeviceStore = (l: HA_DEVICE = DEFAULT_DEVICE) => {
  return createStore<DeviceStore>()((set, get) => ({
    ...cloneDevice(l),
    localStorage: false,
    setStorageAvailable: (available) => set({ localStorage: available }),
    hydrateDevice: (detected) => {
      const current = get();
      set({
        ...cloneDevice(detected),
        localStorage: current.localStorage
      });
    }
  }));
};
