import React, { createContext, useContext, useState } from "react";

export interface SparePartsFilters {
  categoria: string;
  marca: string;
  minPrice: string;
  maxPrice: string;
  estado: string;
  modeloCompatible: string;
}

interface SparePartsFilterContextType {
  filters: SparePartsFilters;
  setFilters: (filters: SparePartsFilters) => void;
}

const SparePartsFilterContext = createContext<SparePartsFilterContextType | undefined>(undefined);

export const SparePartsFilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filters, setFilters] = useState<SparePartsFilters>({
    categoria: "",
    marca: "",
    minPrice: "",
    maxPrice: "",
    estado: "disponible",
    modeloCompatible: "",
  });

  return (
    <SparePartsFilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </SparePartsFilterContext.Provider>
  );
};

export const useSparePartsFilters = () => {
  const context = useContext(SparePartsFilterContext);
  if (!context) {
    throw new Error("useSparePartsFilters must be used within a SparePartsFilterProvider");
  }
  return context;
};
