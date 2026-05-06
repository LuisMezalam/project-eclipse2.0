/**
 * SharedParametersContext
 *
 * Centralises the cross-tab "Unified Statistical Framework" state that was
 * previously threaded through Index.tsx via prop-drilling.
 *
 * Any child component can read the shared parameters and, when sync is active,
 * push updates back so all tabs stay in lock-step.
 */

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

// ─── Shape ────────────────────────────────────────────────────
export interface SharedParameters {
  // Load moments
  loadMean: number;        // kN/m
  loadVariance: number;    // (kN/m)²
  loadSkewness: number;
  loadKurtosis: number;

  // Beam
  beamLength: number;      // m

  // Resistance
  resistanceMean: number;  // MPa
  resistanceCoV: number;

  // Derived (read-only)
  loadCoV: number;
  activeStressMean: number | null; // Pa, supplied by the live beam solver
  activeStressCoV: number | null;
  derivedStressMean: number;
  derivedStressCoV: number;
}

export interface SharedParametersActions {
  setLoadMean: (v: number) => void;
  setLoadVariance: (v: number) => void;
  setLoadSkewness: (v: number) => void;
  setLoadKurtosis: (v: number) => void;
  setBeamLength: (v: number) => void;
  setResistanceMean: (v: number) => void;
  setResistanceCoV: (v: number) => void;
  setActiveStressMean: (v: number | null) => void;
  setActiveStressCoV: (v: number | null) => void;

  // Sync / cross-reference UI state
  syncEnabled: boolean;
  setSyncEnabled: (v: boolean) => void;
  crossRefOpen: boolean;
  setCrossRefOpen: (v: boolean) => void;

  /** Convenience: true when sync is enabled AND the cross-ref panel is open */
  isSynced: boolean;

  // Active tab
  activeTab: string;
  setActiveTab: (v: string) => void;
}

export type SharedParametersContextValue = SharedParameters & SharedParametersActions;

const SharedParametersCtx = createContext<SharedParametersContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────
export function SharedParametersProvider({ children }: { children: ReactNode }) {
  // Active tab
  const [activeTab, setActiveTab] = useState("reliability");

  // Cross-reference UI
  const [crossRefOpen, setCrossRefOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Load moments
  const [loadMean, setLoadMean] = useState(12);
  const [loadVariance, setLoadVariance] = useState(16);
  const [loadSkewness, setLoadSkewness] = useState(0.3);
  const [loadKurtosis, setLoadKurtosis] = useState(3.2);

  // Beam
  const [beamLength, setBeamLength] = useState(6);

  // Resistance
  const [resistanceMean, setResistanceMean] = useState(250);
  const [resistanceCoV, setResistanceCoV] = useState(0.1);

  // Live structural demand pushed by interactive beam tools.
  const [activeStressMean, setActiveStressMean] = useState<number | null>(null);
  const [activeStressCoV, setActiveStressCoV] = useState<number | null>(null);

  // Derived values
  const loadCoV = loadMean > 0 ? Math.sqrt(loadVariance) / loadMean : 0.2;
  const staticDerivedStressMean = loadMean * 1000 * beamLength * beamLength / (8 * 1e-4);
  const derivedStressMean = activeStressMean ?? staticDerivedStressMean;
  const derivedStressCoV = activeStressCoV ?? loadCoV;

  const isSynced = syncEnabled && crossRefOpen;

  const value = useMemo<SharedParametersContextValue>(
    () => ({
      // Values
      loadMean,
      loadVariance,
      loadSkewness,
      loadKurtosis,
      beamLength,
      resistanceMean,
      resistanceCoV,
      loadCoV,
      activeStressMean,
      activeStressCoV,
      derivedStressMean,
      derivedStressCoV,

      // Setters
      setLoadMean,
      setLoadVariance,
      setLoadSkewness,
      setLoadKurtosis,
      setBeamLength,
      setResistanceMean,
      setResistanceCoV,
      setActiveStressMean,
      setActiveStressCoV,

      // Sync state
      syncEnabled,
      setSyncEnabled,
      crossRefOpen,
      setCrossRefOpen,
      isSynced,

      // Tab
      activeTab,
      setActiveTab,
    }),
    [
      loadMean, loadVariance, loadSkewness, loadKurtosis,
      beamLength, resistanceMean, resistanceCoV,
      loadCoV, activeStressMean, activeStressCoV, derivedStressMean, derivedStressCoV,
      syncEnabled, crossRefOpen, isSynced,
      activeTab,
    ],
  );

  return (
    <SharedParametersCtx.Provider value={value}>
      {children}
    </SharedParametersCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useSharedParameters(): SharedParametersContextValue {
  const ctx = useContext(SharedParametersCtx);
  if (!ctx) {
    throw new Error("useSharedParameters must be used within a SharedParametersProvider");
  }
  return ctx;
}
