import React, { createContext, useContext, useState } from "react";

export interface Filters {
  marca: string;
  linea: string;
  minPrice: string;
  maxPrice: string;
  combustible: string;
  transmision: string;
  estado: string;
  tipo: string;
}

interface FilterContextType {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filters, setFilters] = useState<Filters>({
    marca: "",
    linea: "",
    minPrice: "",
    maxPrice: "",
    combustible: "",
    transmision: "",
    estado: "disponible",
    tipo: "",
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
};
