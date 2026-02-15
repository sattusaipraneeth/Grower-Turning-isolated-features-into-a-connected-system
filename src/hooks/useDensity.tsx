import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Density = "comfortable" | "compact";

type DensityContextValue = {
  density: Density;
  toggleDensity: () => void;
  setDensity: (d: Density) => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    try {
      const saved = localStorage.getItem("green-home-density");
      if (saved === "compact" || saved === "comfortable") return saved;
    } catch { void 0 }
    return "comfortable";
  });

  useEffect(() => {
    try {
      localStorage.setItem("green-home-density", density);
    } catch { void 0 }
  }, [density]);

  const setDensity = (d: Density) => setDensityState(d);
  const toggleDensity = () => setDensityState((prev) => (prev === "comfortable" ? "compact" : "comfortable"));

  const value = useMemo(() => ({ density, toggleDensity, setDensity }), [density]);
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity must be used within DensityProvider");
  return ctx;
}
