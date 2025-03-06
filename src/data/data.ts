import React, { createContext, useContext, ReactNode, useState } from 'react';
import { MarketingData } from "../a&p/marketing";

// Type definitions
export const MARKET_OPTIONS = ["New York", "New Jersey", "Connecticut"] as const;

export const ITEM_OPTIONS = [
  "The Balvenie 12 12x75",
  "The Balvenie 21 3x75",
  "Hendrick's Original 6x175",
  "Hendrick's Original 6x75",
  "Glenfiddich 12 12x75",
  "Glenfiddich 12 Sherry 12x75",
] as const;

export const FORECAST_LOGIC_OPTIONS = [
  "3 Month",
  "6 Month",
  "Run Rate",
  "Benchmark",
  "Flat",
  "Custom",
] as const;

export type ForecastLogic = (typeof FORECAST_LOGIC_OPTIONS)[number];

// Add new type definitions for brand structure
export interface BrandInfo {
  brand: string;
  variant: string;
}

// Update item options with brand info
export const ITEM_DETAILS: Record<(typeof ITEM_OPTIONS)[number], BrandInfo> = {
  "The Balvenie 12 12x75": { brand: "The Balvenie", variant: "The Balvenie 12" },
  "The Balvenie 21 3x75": { brand: "The Balvenie", variant: "The Balvenie 21" },
  "Hendrick's Original 6x175": { brand: "Hendrick's", variant: "Hendrick's Original" },
  "Hendrick's Original 6x75": { brand: "Hendrick's", variant: "Hendrick's Original" },
  "Glenfiddich 12 12x75": { brand: "Glenfiddich", variant: "Glenfiddich 12" },
  "Glenfiddich 12 Sherry 12x75": { brand: "Glenfiddich", variant: "Glenfiddich 12 Sherry" },
} as const;

// Update ForecastData interface
export interface ForecastData {
  id: string;
  market: string;
  item: string;
  brand: string;
  variant: string;
  forecastLogic: ForecastLogic;
  commentary?: string;
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  quarters?: {
    [key: string]: {
      value: number;
      isActual: boolean;
    };
  };
}

// Add growth rate configuration
export const GROWTH_RATE_CONFIG = {
  "3 Month": () => (Math.random() * 0.1) - 0.05,  // -5% to +5%
  "6 Month": () => (Math.random() * 0.1) - 0.05,
  "Run Rate": () => (Math.random() * 0.1) - 0.05,
  "Benchmark": () => (Math.random() * 0.1) - 0.05,
  "Flat": () => 0, // 0% growth
  "Custom": () => 0, // No automatic growth
} as const;

// Helper function to generate random forecast data
function generateRandomForecastData(
  id: string,
  market: string,
  item: string,
  brandInfo: BrandInfo
): ForecastData {
  // Generate a base value between 50 and 500
  const baseValue = Math.floor(Math.random() * 450) + 50;
  
  // Generate random growth between -5% and +15% for each month
  const months: ForecastData['months'] = {
    JAN: { value: baseValue, isActual: true },
    FEB: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    MAR: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    APR: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    MAY: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    JUN: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    JUL: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    AUG: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    SEP: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    OCT: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    NOV: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
    DEC: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.05))), isActual: false },
  };

  // Randomly select a forecast logic
  const logicOptions = [...FORECAST_LOGIC_OPTIONS];
  const randomLogic = logicOptions[Math.floor(Math.random() * logicOptions.length)];

  return {
    id,
    market,
    item,
    brand: brandInfo.brand,
    variant: brandInfo.variant,
    forecastLogic: randomLogic,
    months,
  };
}

// Generate initial data for all combinations
export const initialData: ForecastData[] = (() => {
  let id = 1;
  const data: ForecastData[] = [];

  MARKET_OPTIONS.forEach(market => {
    ITEM_OPTIONS.forEach(item => {
      data.push(
        generateRandomForecastData(
          id.toString(),
          market,
          item,
          ITEM_DETAILS[item]
        )
      );
      id++;
    });
  });

  return data;
})();

// Add budget generation function
function generateBudgetData(forecastData: ForecastData[]): ForecastData[] {
  return forecastData.map(forecast => {
    const budgetMonths = Object.entries(forecast.months).reduce((acc, [month, data]) => {
      // Generate random variation between -5% and +5% from forecast
      const variation = (Math.random() * 0.1) - 0.05; // -5% to +5%
      const budgetValue = Math.round(data.value * (1 + variation));
      
      return {
        ...acc,
        [month]: {
          value: budgetValue,
          isActual: data.isActual,
          isBudget: true
        }
      };
    }, {});

    return {
      ...forecast,
      id: `budget-${forecast.id}`,
      months: budgetMonths,
      isBudget: true
    };
  });
}

// Generate budget data based on initial forecast data
export const initialBudgetData = generateBudgetData(initialData);

// Add new types for shipments
export const TARGET_DOI_OPTIONS = ["30 Days", "45 Days", "60 Days", "Custom"] as const;
export type TargetDOI = (typeof TARGET_DOI_OPTIONS)[number];

export type ShipmentType = "DI" | "Warehouse";

export interface ShipmentData extends Omit<ForecastData, 'forecastLogic'> {
  targetDOI: TargetDOI;
  endInv: number;
  shipmentType: ShipmentType;
  leadTime: number;
}

// Add lead time configuration
export const LEAD_TIMES: Record<ShipmentType, number> = {
  DI: 60,
  Warehouse: 30,
};

// Helper function to generate random shipment data
function generateRandomShipmentData(
  id: string,
  market: string,
  item: string,
  brandInfo: BrandInfo,
  depletionData: ForecastData
): ShipmentData {
  // Calculate average monthly depletions
  const monthlyValues = Object.values(depletionData.months).map(m => m.value);
  const avgMonthlyDepletions = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
  
  // Generate random on-hand between 2x and 3x average monthly depletions
  const endInv = Math.round(avgMonthlyDepletions * (2 + Math.random()));
  
  // Randomly assign shipment type
  const shipmentType: ShipmentType = Math.random() > 0.5 ? "DI" : "Warehouse";
  
  return {
    id,
    market,
    item,
    brand: brandInfo.brand,
    variant: brandInfo.variant,
    targetDOI: "30 Days",
    endInv,
    shipmentType,
    leadTime: LEAD_TIMES[shipmentType],
    months: { ...depletionData.months },
  };
}

// Generate initial shipment data
export const initialShipmentData: ShipmentData[] = initialData.map((depletion) =>
  generateRandomShipmentData(
    `shipment-${depletion.id}`,
    depletion.market,
    depletion.item,
    ITEM_DETAILS[depletion.item as keyof typeof ITEM_DETAILS],
    depletion
  )
);

// Add new overhead related constants and types
export const DIVISION_OPTIONS = [
  "Breakthru",
  "RNDC",
  "Franchise and Independent",
  "National Accounts"
] as const;

export const OVERHEAD_ACTIVITIES = [
  { code: "51000", activity: "Salaries & Benefits" },
  { code: "52000", activity: "Technology & Systems" },
  { code: "53000", activity: "Office Supplies" },
  { code: "54000", activity: "Professional Services" },
  { code: "55000", activity: "Travel & Entertainment" },
  { code: "56000", activity: "Facilities & Maintenance" },
] as const;

export interface OverheadData {
  id: string;
  division: string;
  glCode: string;
  activity: string;
  commentary?: string;
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
}

// Generate initial overhead data
function generateRandomOverheadData(): OverheadData[] {
  const data: OverheadData[] = [];
  let id = 1;

  DIVISION_OPTIONS.forEach(division => {
    OVERHEAD_ACTIVITIES.forEach(({ code, activity }) => {
      // Generate base value between 10000 and 50000
      const baseValue = Math.floor(Math.random() * 40000) + 10000;
      
      const months = {
        JAN: { value: baseValue, isActual: true },  // Only January is actual
        FEB: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        MAR: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        APR: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        MAY: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        JUN: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        JUL: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        AUG: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        SEP: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        OCT: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        NOV: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
        DEC: { value: Math.floor(baseValue * (1 + (Math.random() * 0.2 - 0.1))), isActual: false },
      };

      data.push({
        id: id.toString(),
        division,
        glCode: code,
        activity,
        months,
      });
      id++;
    });
  });

  return data;
}

export const initialOverheadData = generateRandomOverheadData();

// Generate budget data for overhead
function generateOverheadBudgetData(overheadData: OverheadData[]): OverheadData[] {
  return overheadData.map(overhead => {
    const budgetMonths = Object.entries(overhead.months).reduce((acc, [month, data]) => {
      const variation = (Math.random() * 0.1) - 0.05; // -5% to +5%
      const budgetValue = Math.round(data.value * (1 + variation));
      
      return {
        ...acc,
        [month]: {
          value: budgetValue,
          isActual: data.isActual,
          isBudget: true
        }
      };
    }, {});

    return {
      ...overhead,
      id: `budget-${overhead.id}`,
      months: budgetMonths,
      isBudget: true
    };
  });
}

export const initialOverheadBudgetData = generateOverheadBudgetData(initialOverheadData);

// Add growth rates to the context
export interface ForecastContextType {
  forecastData: ForecastData[];
  budgetData: ForecastData[];
  updateForecastData: (newData: ForecastData[]) => void;
  updateSingleForecast: (updatedForecast: ForecastData) => void;
  getGrowthRate: (logic: ForecastLogic) => number;
  shipmentData: ShipmentData[];
  updateShipmentData: (newData: ShipmentData[]) => void;
  updateSingleShipment: (updatedShipment: ShipmentData) => void;
  overheadData: OverheadData[];
  overheadBudgetData: OverheadData[];
  updateOverheadData: (newData: OverheadData[]) => void;
  marketingData: MarketingData[];
  updateMarketingData: (data: MarketingData[]) => void;
}

const defaultContextValue: ForecastContextType = {
  forecastData: initialData,
  budgetData: initialBudgetData,
  updateForecastData: () => undefined,
  updateSingleForecast: () => undefined,
  getGrowthRate: () => 0,
  shipmentData: initialShipmentData,
  updateShipmentData: () => undefined,
  updateSingleShipment: () => undefined,
  overheadData: initialOverheadData,
  overheadBudgetData: initialOverheadBudgetData,
  updateOverheadData: () => undefined,
  marketingData: [
    {
      id: "1",
      brandVariant: "The Balvenie 12",
      glAccount: "50001",
      type: "CMI",
      programName: "POS",
      months: {
        JAN: { value: 1000, isActual: true },
        FEB: { value: 2000, isActual: false },
        MAR: { value: 3000, isActual: false },
        APR: { value: 2500, isActual: false },
        MAY: { value: 2800, isActual: false },
        JUN: { value: 3200, isActual: false },
        JUL: { value: 3500, isActual: false },
        AUG: { value: 3300, isActual: false },
        SEP: { value: 3100, isActual: false },
        OCT: { value: 2900, isActual: false },
        NOV: { value: 2700, isActual: false },
        DEC: { value: 1200, isActual: false },
      },
    },
    {
      id: "2",
      brandVariant: "The Balvenie 12",
      glAccount: "50002",
      type: "Advertising",
      programName: "Trade Event",
      months: {
        JAN: { value: 1500, isActual: true },
        FEB: { value: 2500, isActual: false },
        MAR: { value: 3500, isActual: false },
        APR: { value: 3000, isActual: false },
        MAY: { value: 3200, isActual: false },
        JUN: { value: 3800, isActual: false },
        JUL: { value: 4000, isActual: false },
        AUG: { value: 3700, isActual: false },
        SEP: { value: 3400, isActual: false },
        OCT: { value: 3200, isActual: false },
        NOV: { value: 3000, isActual: false },
        DEC: { value: 1800, isActual: false },
      },
    },
    {
      id: "3",
      brandVariant: "The Glenfiddich 12",
      glAccount: "50003",
      type: "Promotions",
      programName: "Sampling",
      months: {
        JAN: { value: 2000, isActual: true },
        FEB: { value: 2200, isActual: false },
        MAR: { value: 2400, isActual: false },
        APR: { value: 2600, isActual: false },
        MAY: { value: 2800, isActual: false },
        JUN: { value: 3000, isActual: false },
        JUL: { value: 3200, isActual: false },
        AUG: { value: 3400, isActual: false },
        SEP: { value: 3600, isActual: false },
        OCT: { value: 3800, isActual: false },
        NOV: { value: 4000, isActual: false },
        DEC: { value: 4200, isActual: false },
      },
    },
    {
      id: "4",
      brandVariant: "The Glenfiddich 12",
      glAccount: "50004",
      type: "CMI",
      programName: "Window Display",
      months: {
        JAN: { value: 3000, isActual: true },
        FEB: { value: 3100, isActual: false },
        MAR: { value: 3200, isActual: false },
        APR: { value: 3300, isActual: false },
        MAY: { value: 3400, isActual: false },
        JUN: { value: 3500, isActual: false },
        JUL: { value: 3600, isActual: false },
        AUG: { value: 3700, isActual: false },
        SEP: { value: 3800, isActual: false },
        OCT: { value: 3900, isActual: false },
        NOV: { value: 4000, isActual: false },
        DEC: { value: 4100, isActual: false },
      },
    },
    {
      id: "5",
      brandVariant: "Hendrick's Original",
      glAccount: "50005",
      type: "Advertising",
      programName: "Trade Event",
      months: {
        JAN: { value: 2500, isActual: true },
        FEB: { value: 2700, isActual: false },
        MAR: { value: 2900, isActual: false },
        APR: { value: 3100, isActual: false },
        MAY: { value: 3300, isActual: false },
        JUN: { value: 3500, isActual: false },
        JUL: { value: 3700, isActual: false },
        AUG: { value: 3900, isActual: false },
        SEP: { value: 4100, isActual: false },
        OCT: { value: 4300, isActual: false },
        NOV: { value: 4500, isActual: false },
        DEC: { value: 4700, isActual: false },
      },
    },
    {
      id: "6",
      brandVariant: "Hendrick's Original",
      glAccount: "50006",
      type: "Promotions",
      programName: "Incentive",
      months: {
        JAN: { value: 1800, isActual: true },
        FEB: { value: 2000, isActual: false },
        MAR: { value: 2200, isActual: false },
        APR: { value: 2400, isActual: false },
        MAY: { value: 2600, isActual: false },
        JUN: { value: 2800, isActual: false },
        JUL: { value: 3000, isActual: false },
        AUG: { value: 3200, isActual: false },
        SEP: { value: 3400, isActual: false },
        OCT: { value: 3600, isActual: false },
        NOV: { value: 3800, isActual: false },
        DEC: { value: 4000, isActual: false },
      },
    },
  ],
  updateMarketingData: () => undefined,
};

// Create context with a default value
export const ForecastContext = createContext<ForecastContextType>(defaultContextValue);

// Context provider component
interface ForecastProviderProps {
  children: ReactNode;
}

export const ForecastProvider = ({ children }: ForecastProviderProps): JSX.Element => {
  const [forecastData, setForecastData] = useState<ForecastData[]>(initialData);
  const [budgetData] = useState<ForecastData[]>(initialBudgetData);
  const [shipmentData, setShipmentData] = useState<ShipmentData[]>(initialShipmentData);
  const [overheadData, setOverheadData] = useState<OverheadData[]>(initialOverheadData);
  const [overheadBudgetData] = useState<OverheadData[]>(initialOverheadBudgetData);
  const [marketingData, setMarketingData] = useState<MarketingData[]>([
    {
      id: "1",
      brandVariant: "The Balvenie 12",
      glAccount: "50001",
      type: "CMI",
      programName: "POS",
      months: {
        JAN: { value: 1000, isActual: true },
        FEB: { value: 2000, isActual: false },
        MAR: { value: 3000, isActual: false },
        APR: { value: 2500, isActual: false },
        MAY: { value: 2800, isActual: false },
        JUN: { value: 3200, isActual: false },
        JUL: { value: 3500, isActual: false },
        AUG: { value: 3300, isActual: false },
        SEP: { value: 3100, isActual: false },
        OCT: { value: 2900, isActual: false },
        NOV: { value: 2700, isActual: false },
        DEC: { value: 1200, isActual: false },
      },
    },
    {
      id: "2",
      brandVariant: "The Balvenie 12",
      glAccount: "50002",
      type: "Advertising",
      programName: "Trade Event",
      months: {
        JAN: { value: 1500, isActual: true },
        FEB: { value: 2500, isActual: false },
        MAR: { value: 3500, isActual: false },
        APR: { value: 3000, isActual: false },
        MAY: { value: 3200, isActual: false },
        JUN: { value: 3800, isActual: false },
        JUL: { value: 4000, isActual: false },
        AUG: { value: 3700, isActual: false },
        SEP: { value: 3400, isActual: false },
        OCT: { value: 3200, isActual: false },
        NOV: { value: 3000, isActual: false },
        DEC: { value: 1800, isActual: false },
      },
    },
    {
      id: "3",
      brandVariant: "The Glenfiddich 12",
      glAccount: "50003",
      type: "Promotions",
      programName: "Sampling",
      months: {
        JAN: { value: 2000, isActual: true },
        FEB: { value: 2200, isActual: false },
        MAR: { value: 2400, isActual: false },
        APR: { value: 2600, isActual: false },
        MAY: { value: 2800, isActual: false },
        JUN: { value: 3000, isActual: false },
        JUL: { value: 3200, isActual: false },
        AUG: { value: 3400, isActual: false },
        SEP: { value: 3600, isActual: false },
        OCT: { value: 3800, isActual: false },
        NOV: { value: 4000, isActual: false },
        DEC: { value: 4200, isActual: false },
      },
    },
    {
      id: "4",
      brandVariant: "The Glenfiddich 12",
      glAccount: "50004",
      type: "CMI",
      programName: "Window Display",
      months: {
        JAN: { value: 3000, isActual: true },
        FEB: { value: 3100, isActual: false },
        MAR: { value: 3200, isActual: false },
        APR: { value: 3300, isActual: false },
        MAY: { value: 3400, isActual: false },
        JUN: { value: 3500, isActual: false },
        JUL: { value: 3600, isActual: false },
        AUG: { value: 3700, isActual: false },
        SEP: { value: 3800, isActual: false },
        OCT: { value: 3900, isActual: false },
        NOV: { value: 4000, isActual: false },
        DEC: { value: 4100, isActual: false },
      },
    },
    {
      id: "5",
      brandVariant: "Hendrick's Original",
      glAccount: "50005",
      type: "Advertising",
      programName: "Trade Event",
      months: {
        JAN: { value: 2500, isActual: true },
        FEB: { value: 2700, isActual: false },
        MAR: { value: 2900, isActual: false },
        APR: { value: 3100, isActual: false },
        MAY: { value: 3300, isActual: false },
        JUN: { value: 3500, isActual: false },
        JUL: { value: 3700, isActual: false },
        AUG: { value: 3900, isActual: false },
        SEP: { value: 4100, isActual: false },
        OCT: { value: 4300, isActual: false },
        NOV: { value: 4500, isActual: false },
        DEC: { value: 4700, isActual: false },
      },
    },
    {
      id: "6",
      brandVariant: "Hendrick's Original",
      glAccount: "50006",
      type: "Promotions",
      programName: "Incentive",
      months: {
        JAN: { value: 1800, isActual: true },
        FEB: { value: 2000, isActual: false },
        MAR: { value: 2200, isActual: false },
        APR: { value: 2400, isActual: false },
        MAY: { value: 2600, isActual: false },
        JUN: { value: 2800, isActual: false },
        JUL: { value: 3000, isActual: false },
        AUG: { value: 3200, isActual: false },
        SEP: { value: 3400, isActual: false },
        OCT: { value: 3600, isActual: false },
        NOV: { value: 3800, isActual: false },
        DEC: { value: 4000, isActual: false },
      },
    },
  ]);
  
  // Cache growth rates for consistency
  const [growthRates] = useState(() => 
    Object.fromEntries(
      Object.entries(GROWTH_RATE_CONFIG).map(([key, generator]) => [
        key,
        generator()
      ])
    )
  );

  const getGrowthRate = (logic: ForecastLogic): number => {
    return growthRates[logic];
  };

  const updateForecastData = (newData: ForecastData[]) => {
    setForecastData(newData);
  };

  const updateSingleForecast = (updatedForecast: ForecastData) => {
    setForecastData(prevData =>
      prevData.map(forecast => 
        forecast.id === updatedForecast.id ? updatedForecast : forecast
      )
    );
  };

  const updateShipmentData = (newData: ShipmentData[]) => {
    setShipmentData(newData);
  };

  const updateSingleShipment = (updatedShipment: ShipmentData) => {
    setShipmentData(prevData =>
      prevData.map(shipment => 
        shipment.id === updatedShipment.id ? updatedShipment : shipment
      )
    );
  };

  const updateOverheadData = (newData: OverheadData[]) => {
    setOverheadData(newData);
  };

  const updateMarketingData = (data: MarketingData[]) => {
    setMarketingData(data);
  };

  const contextValue = {
    forecastData,
    budgetData,
    updateForecastData,
    updateSingleForecast,
    getGrowthRate,
    shipmentData,
    updateShipmentData,
    updateSingleShipment,
    overheadData,
    overheadBudgetData,
    updateOverheadData,
    marketingData,
    updateMarketingData,
  };

  return React.createElement(
    ForecastContext.Provider,
    { value: contextValue },
    children
  );
};

// Custom hook for using the forecast context
export const useForecast = (): ForecastContextType => {
  const context = useContext(ForecastContext);
  if (!context) {
    throw new Error('useForecast must be used within a ForecastProvider');
  }
  return context;
};

export type Brand = 'all' | 'brand1' | 'brand2' | 'brand3';

export interface SalesData {
  month: string;
  brand: Brand;
  sales: number;
}

export const salesData: SalesData[] = [
  { month: 'Jan', brand: 'brand1', sales: 1000 },
  { month: 'Feb', brand: 'brand1', sales: 1200 },
  { month: 'Mar', brand: 'brand1', sales: 900 },
  // ... add more months
  { month: 'Jan', brand: 'brand2', sales: 800 },
  { month: 'Feb', brand: 'brand2', sales: 1100 },
  { month: 'Mar', brand: 'brand2', sales: 1300 },
  // ... add more months
  { month: 'Jan', brand: 'brand3', sales: 1200 },
  { month: 'Feb', brand: 'brand3', sales: 1400 },
  { month: 'Mar', brand: 'brand3', sales: 1100 },
  // ... add more months
];

export interface VenueData {
  name: string;
  type: 'On Premise' | 'Off Premise';
}

export const VENUE_DATA: VenueData[] = [
  // Off Premise (Retailers)
  { name: "Total Wine & More", type: "Off Premise" },
  { name: "BevMo!", type: "Off Premise" },
  { name: "Wine & Spirits Mart", type: "Off Premise" },
  { name: "Liquor Warehouse", type: "Off Premise" },
  { name: "Crown Liquors", type: "Off Premise" },
  { name: "ABC Fine Wine & Spirits", type: "Off Premise" },
  { name: "Bottle King", type: "Off Premise" },
  { name: "Buy Rite Liquors", type: "Off Premise" },
  { name: "Gary's Wine & Marketplace", type: "Off Premise" },
  { name: "Stew Leonard's Wines", type: "Off Premise" },
  { name: "Canal's Bottlestop", type: "Off Premise" },
  { name: "Joe Canal's Discount Liquor", type: "Off Premise" },
  { name: "Wine Legend", type: "Off Premise" },
  { name: "Wine Library", type: "Off Premise" },
  { name: "Wegmans Wine & Spirits", type: "Off Premise" },
  { name: "ShopRite Liquors", type: "Off Premise" },
  { name: "Warehouse Wines & Spirits", type: "Off Premise" },
  { name: "Astor Wines & Spirits", type: "Off Premise" },
  { name: "Bottle Grove", type: "Off Premise" },
  { name: "Wine Chateau", type: "Off Premise" },
  // On Premise (Bars/Restaurants)
  { name: "The Capital Grille", type: "On Premise" },
  { name: "Morton's Steakhouse", type: "On Premise" },
  { name: "Ruth's Chris Steak House", type: "On Premise" },
  { name: "Del Frisco's", type: "On Premise" },
  { name: "The Palm Restaurant", type: "On Premise" },
  { name: "Blue Ribbon Brasserie", type: "On Premise" },
  { name: "Peter Luger Steakhouse", type: "On Premise" },
  { name: "Carmine's", type: "On Premise" },
  { name: "The Modern", type: "On Premise" },
  { name: "Le Bernardin", type: "On Premise" },
  { name: "Daniel", type: "On Premise" },
  { name: "Gramercy Tavern", type: "On Premise" },
  { name: "The Dead Rabbit", type: "On Premise" },
  { name: "Death & Co", type: "On Premise" },
  { name: "PDT (Please Don't Tell)", type: "On Premise" },
  { name: "Employees Only", type: "On Premise" },
  { name: "The NoMad Bar", type: "On Premise" },
  { name: "Dante", type: "On Premise" },
  { name: "Attaboy", type: "On Premise" },
  { name: "The Clover Club", type: "On Premise" }
];

// Helper function to generate random transaction data
export interface TransactionData {
  vipId: string;
  date: string;
  venue: VenueData;
  volume: number;
}

export function generateTransactionData(totalVolume: number): TransactionData[] {
  const transactions: TransactionData[] = [];
  let remainingVolume = totalVolume;
  
  while (remainingVolume > 0) {
    // Generate random percentage between 4-6%
    const percentage = Math.random() * (0.06 - 0.04) + 0.04;
    let volume = Math.round(totalVolume * percentage);
    
    // Ensure we don't exceed the total
    if (volume > remainingVolume) {
      volume = remainingVolume;
    }
    
    // Generate random date from previous month
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    
    transactions.push({
      vipId: Math.floor(10000 + Math.random() * 90000).toString(),
      date: date.toISOString().split('T')[0],
      venue: VENUE_DATA[Math.floor(Math.random() * VENUE_DATA.length)],
      volume
    });
    
    remainingVolume -= volume;
  }
  
  return transactions;
}

// Add after other type definitions

export interface IWSRData {
  id: string;
  category1: string;
  brand: string;
  brandLine: string;
  owner: string;
  country: string;
  volume2016: number;
  volume2017: number;
  volume2018: number;
  volume2019: number;
  volume2020: number;
}

export const IWSR_DATA: IWSRData[] = [
  {
    id: "1",
    category1: "Spirits",
    brand: "Crown Royal",
    brandLine: "Crown Royal Deluxe",
    owner: "Diageo",
    country: "Canada",
    volume2016: 45250.0,
    volume2017: 47320.0,
    volume2018: 49180.0,
    volume2019: 51240.0,
    volume2020: 54320.0
  },
  {
    id: "2",
    category1: "Spirits",
    brand: "Hennessy",
    brandLine: "Hennessy VS",
    owner: "LVMH",
    country: "France",
    volume2016: 38750.0,
    volume2017: 41200.0,
    volume2018: 43800.0,
    volume2019: 45900.0,
    volume2020: 47200.0
  },
  {
    id: "3",
    category1: "Spirits",
    brand: "Jack Daniel's",
    brandLine: "Jack Daniel's Old No. 7",
    owner: "Brown-Forman",
    country: "United States",
    volume2016: 52640.0,
    volume2017: 54890.0,
    volume2018: 57120.0,
    volume2019: 59340.0,
    volume2020: 61250.0
  },
  {
    id: "4",
    category1: "Spirits",
    brand: "Smirnoff",
    brandLine: "Smirnoff Red",
    owner: "Diageo",
    country: "United States",
    volume2016: 42180.0,
    volume2017: 43560.0,
    volume2018: 44920.0,
    volume2019: 46150.0,
    volume2020: 47840.0
  },
  {
    id: "5",
    category1: "Spirits",
    brand: "Bacardi",
    brandLine: "Bacardi Superior",
    owner: "Bacardi Limited",
    country: "Puerto Rico",
    volume2016: 35420.0,
    volume2017: 36180.0,
    volume2018: 37240.0,
    volume2019: 38150.0,
    volume2020: 39260.0
  },
  {
    id: "6",
    category1: "Spirits",
    brand: "Johnnie Walker",
    brandLine: "Johnnie Walker Black Label",
    owner: "Diageo",
    country: "United Kingdom",
    volume2016: 28750.0,
    volume2017: 29840.0,
    volume2018: 31220.0,
    volume2019: 32460.0,
    volume2020: 33180.0
  },
  {
    id: "7",
    category1: "Spirits",
    brand: "Grey Goose",
    brandLine: "Grey Goose Original",
    owner: "Bacardi Limited",
    country: "France",
    volume2016: 24150.0,
    volume2017: 25320.0,
    volume2018: 26480.0,
    volume2019: 27560.0,
    volume2020: 28420.0
  },
  {
    id: "8",
    category1: "Spirits",
    brand: "Patron",
    brandLine: "Patron Silver",
    owner: "Bacardi Limited",
    country: "Mexico",
    volume2016: 21840.0,
    volume2017: 23150.0,
    volume2018: 24680.0,
    volume2019: 25920.0,
    volume2020: 26750.0
  },
  {
    id: "9",
    category1: "Spirits",
    brand: "Don Julio",
    brandLine: "Don Julio Blanco",
    owner: "Diageo",
    country: "Mexico",
    volume2016: 18420.0,
    volume2017: 19840.0,
    volume2018: 21560.0,
    volume2019: 23480.0,
    volume2020: 25640.0
  },
  {
    id: "10",
    category1: "Spirits",
    brand: "Absolut",
    brandLine: "Absolut Original",
    owner: "Pernod Ricard",
    country: "Sweden",
    volume2016: 32150.0,
    volume2017: 31840.0,
    volume2018: 31520.0,
    volume2019: 31280.0,
    volume2020: 30950.0
  }
];

// Add after other interfaces
export interface RateData {
  id: string;
  skuId: string;
  skuName: string;
  cogs: number;
  rpc: number;
  commentary?: string;
}

// Add after other constants
export const RATES_DATA: RateData[] = [
  // Glenfiddich SKUs
  {
    id: "1",
    skuId: "292125",
    skuName: "Glenfiddich 12 8x12x50ml 40.0 RO DIS TR US",
    cogs: 72.50,
    rpc: 165.00
  },
  {
    id: "2",
    skuId: "290124",
    skuName: "Glenfiddich 12 24x375ml 40.0 CK DIV TR US",
    cogs: 75.80,
    rpc: 168.50
  },
  {
    id: "3",
    skuId: "251773",
    skuName: "Glenfiddich 12 12x750ml 40.0 AG TTW TR US",
    cogs: 78.90,
    rpc: 172.00
  },
  {
    id: "4",
    skuId: "251775",
    skuName: "Glenfiddich 12 12x1L 40.0 CK WRD TR US",
    cogs: 82.40,
    rpc: 178.00
  },
  {
    id: "5",
    skuId: "321062",
    skuName: "Glenfiddich 12 6x1.75L 40.0 SC WRD TR US",
    cogs: 85.60,
    rpc: 182.00
  },
  {
    id: "6",
    skuId: "294345",
    skuName: "Glenfiddich 15 Solera 6x750ml 40.0 Repack DIV CK TR US",
    cogs: 88.90,
    rpc: 195.00
  },
  {
    id: "7",
    skuId: "252183",
    skuName: "Glenfiddich 15 12x750ml 40.0 AG TTW TR US",
    cogs: 89.50,
    rpc: 198.00
  },
  {
    id: "8",
    skuId: "252186",
    skuName: "Glenfiddich 15 12x1L 40.0 CK WRD TR US",
    cogs: 92.30,
    rpc: 205.00
  },
  {
    id: "9",
    skuId: "278066",
    skuName: "Glenfiddich 18 6x750ml 43.0 AG TTW TR US",
    cogs: 94.80,
    rpc: 215.00
  },
  {
    id: "10",
    skuId: "276582",
    skuName: "Glenfiddich 21 Gran Res 3x750ml 40.0 AG RGB TR US",
    cogs: 97.20,
    rpc: 235.00
  },
  // Continue with more Glenfiddich SKUs...

  // Balvenie SKUs
  {
    id: "20",
    skuId: "171292",
    skuName: "Balvenie 12 Doublewood 96x50ml 43.0 RO DIV DY US GV",
    cogs: 76.40,
    rpc: 169.00
  },
  {
    id: "21",
    skuId: "247680",
    skuName: "Balvenie 12 Doublewood 12x200ml 43.0 CK TUB DY US",
    cogs: 77.90,
    rpc: 171.50
  },
  {
    id: "22",
    skuId: "170290",
    skuName: "Balvenie 12 Dblwd 6x750ml 43.0 REPACK",
    cogs: 79.50,
    rpc: 175.00
  },
  // Continue with more Balvenie SKUs...

  // Hendrick's SKUs
  {
    id: "40",
    skuId: "106319",
    skuName: "Hendrick's 96x50ml 44.0 RO DIS RD US",
    cogs: 71.20,
    rpc: 162.00
  },
  {
    id: "41",
    skuId: "284530",
    skuName: "Hendrick's 12x375ml 44.0 AG WRA DY US",
    cogs: 72.80,
    rpc: 164.50
  },
  {
    id: "42",
    skuId: "284535",
    skuName: "Hendrick's 6x750ml 44.0 AG WRA DY US",
    cogs: 74.50,
    rpc: 168.00
  },
  // Continue with more Hendrick's SKUs...

  // Monkey Shoulder SKUs
  {
    id: "60",
    skuId: "284923",
    skuName: "Monkey Shoulder 6x750ml 43.0 AG WRA RD US",
    cogs: 70.50,
    rpc: 160.00
  },
  {
    id: "61",
    skuId: "284521",
    skuName: "Monkey Shoulder 6x1L 43.0 AG WRA RD US",
    cogs: 73.20,
    rpc: 165.00
  },
  // Continue with remaining SKUs...
];

// Add new type definitions for profit model
export interface StateMapping {
  state: string;
  code: string;
  division: string;
}

export const STATE_MAPPINGS: StateMapping[] = [
  { state: "Alaska", code: "USAAK1", division: "RNDC" },
  { state: "Alabama", code: "USAAL1", division: "RNDC" },
  { state: "Arkansas", code: "USAAR1", division: "Franchise and Independent" },
  { state: "Arizona", code: "USAAZ1", division: "RNDC" },
  { state: "California", code: "USACA1", division: "RNDC" },
  { state: "Colorado", code: "USACO1", division: "Breakthru" },
  { state: "Connecticut", code: "USACT1", division: "Franchise and Independent" },
  { state: "District Of Columbia", code: "USADC1", division: "Breakthru" },
  { state: "Delaware", code: "USADE1", division: "Breakthru" },
  { state: "Florida", code: "USAFL1", division: "Breakthru" },
  // ... add all other states following the mapping you provided
];

export const BRAND_OPTIONS = [
  "Glenfiddich",
  "Batch & Bottle",
  "Aerstone",
  "Monkey Shoulder",
  "Grant's",
  "Hazelwood",
  "Gibson's",
  "Fistful of Bourbon",
  "Clan MacGregor",
  "Raynal",
  "Solerno",
  "Leyenda Del Milagro",
  "Tullamore D.E.W.",
  "Reyka",
  "Drambuie",
  "Sailor Jerry",
  "Hendrick's",
  "The Balvenie",
  "Hudson"
] as const;

export type ProfitModelBrand = typeof BRAND_OPTIONS[number];

export interface ProfitData {
  division: string;
  state: string;
  brand: ProfitModelBrand;
  months: {
    [key: string]: {
      volume: number;
      shipments: number;
      revenue: number;
      customerDiscount: number;
      distributionCosts: number;
      cogs: number;
      advertising: number;
      promotions: number;
      cmi: number;
      isActual: boolean;
    };
  };
}

// Generate random profit data
function generateRandomProfitData(): ProfitData[] {
  const data: ProfitData[] = [];
  
  STATE_MAPPINGS.forEach(stateMapping => {
    BRAND_OPTIONS.forEach(brand => {
      const baseVolume = Math.floor(Math.random() * 1000) + 200;
      const months: ProfitData['months'] = {
        JAN: generateMonthData(baseVolume, true),
        FEB: generateMonthData(baseVolume, false),
        MAR: generateMonthData(baseVolume, false),
        APR: generateMonthData(baseVolume, false),
        MAY: generateMonthData(baseVolume, false),
        JUN: generateMonthData(baseVolume, false),
        JUL: generateMonthData(baseVolume, false),
        AUG: generateMonthData(baseVolume, false),
        SEP: generateMonthData(baseVolume, false),
        OCT: generateMonthData(baseVolume, false),
        NOV: generateMonthData(baseVolume, false),
        DEC: generateMonthData(baseVolume, false),
      };

      data.push({
        division: stateMapping.division,
        state: stateMapping.state,
        brand,
        months,
      });
    });
  });

  return data;
}

function generateMonthData(baseVolume: number, isActual: boolean) {
  const volume = baseVolume * (0.9 + Math.random() * 0.2);
  const shipments = volume * (0.95 + Math.random() * 0.1); // Shipments close to depletions
  const revenue = volume * (100 + Math.random() * 20);
  const customerDiscount = revenue * 0.1;
  const cogs = (revenue - customerDiscount) * 0.4;
  const distributionCosts = (revenue - customerDiscount) * 0.05;
  const advertising = (revenue - customerDiscount) * 0.08;
  const promotions = (revenue - customerDiscount) * 0.04;
  const cmi = (revenue - customerDiscount) * 0.02;

  return {
    volume: Math.round(volume),
    shipments: Math.round(shipments),
    revenue: Math.round(revenue),
    customerDiscount: Math.round(customerDiscount),
    distributionCosts: Math.round(distributionCosts),
    cogs: Math.round(cogs),
    advertising: Math.round(advertising),
    promotions: Math.round(promotions),
    cmi: Math.round(cmi),
    isActual,
  };
}

export const initialProfitData = generateRandomProfitData();

// Add National Account options
export const NATIONAL_ACCOUNT_OPTIONS = [
  "Total Wine & More",
  "BevMo!",
  "ABC Fine Wine & Spirits",
  "Spec's",
  "Binny's Beverage Depot"
] as const;

// Add type for national accounts
export type NationalAccount = typeof NATIONAL_ACCOUNT_OPTIONS[number];

// Add interface for national account profit data
export interface NationalAccountProfitData {
  account: NationalAccount;
  brand: ProfitModelBrand;
  months: {
    [key: string]: {
      volume: number;
      shipments: number;
      revenue: number;
      customerDiscount: number;
      distributionCosts: number;
      cogs: number;
      advertising: number;
      promotions: number;
      cmi: number;
      isActual: boolean;
    };
  };
}

// Generate random national account profit data
function generateRandomNationalAccountProfitData(): NationalAccountProfitData[] {
  const data: NationalAccountProfitData[] = [];
  
  NATIONAL_ACCOUNT_OPTIONS.forEach(account => {
    BRAND_OPTIONS.forEach(brand => {
      const baseVolume = Math.floor(Math.random() * 1000) + 200;
      const months: NationalAccountProfitData['months'] = {
        JAN: generateMonthData(baseVolume, true),
        FEB: generateMonthData(baseVolume, false),
        MAR: generateMonthData(baseVolume, false),
        APR: generateMonthData(baseVolume, false),
        MAY: generateMonthData(baseVolume, false),
        JUN: generateMonthData(baseVolume, false),
        JUL: generateMonthData(baseVolume, false),
        AUG: generateMonthData(baseVolume, false),
        SEP: generateMonthData(baseVolume, false),
        OCT: generateMonthData(baseVolume, false),
        NOV: generateMonthData(baseVolume, false),
        DEC: generateMonthData(baseVolume, false),
      };

      data.push({
        account,
        brand,
        months,
      });
    });
  });

  return data;
}

export const initialNationalAccountProfitData = generateRandomNationalAccountProfitData();

// Add after other interfaces
export interface SKUMasterData {
  sku_id: string;
  size_pack_id: string;
  size_id: string;
  brand_variant_id: string;
  brand_id: string;
  brand_grouping_id: string;
  sku_desc: string;
  size_pack_desc: string;
  size_desc: string;
  brand_variant_name: string;
  brand_name: string;
  brand_grouping_name: string;
  sku: string;
  size_pack: string;
  size: string;
  brand_variant: string;
  brand: string;
  brand_grouping: string;
}

// Add initial data
export const SKU_MASTER_DATA: SKUMasterData[] = [
  {
    sku_id: "292125",
    size_pack_id: "BS6GF001",
    size_id: "BS5GF001",
    brand_variant_id: "BS4GF001",
    brand_id: "BS31010",
    brand_grouping_id: "BS2100",
    sku_desc: "Glenfiddich 12 8x12x50ml 40.0 RO DIS TR US",
    size_pack_desc: "96x5",
    size_desc: "5",
    brand_variant_name: "Glenfiddich 12",
    brand_name: "Glenfiddich",
    brand_grouping_name: "Maisons",
    sku: "292125 - Glenfiddich 12 8x12x50ml 40.0 RO DIS TR US",
    size_pack: "BS6GF001 - Glenfiddich 12 96x5",
    size: "BS5GF001 - Glenfiddich 12 5",
    brand_variant: "BS4GF001 - Glenfiddich 12",
    brand: "BS31010 - Glenfiddich",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "171292",
    size_pack_id: "BS6BV002",
    size_id: "BS5BV002",
    brand_variant_id: "BS4BV002",
    brand_id: "BS31020",
    brand_grouping_id: "BS2100",
    sku_desc: "Balvenie 12 Doublewood 96x50ml 43.0 RO DIV DY US GV",
    size_pack_desc: "96x5",
    size_desc: "5",
    brand_variant_name: "The Balvenie 12",
    brand_name: "The Balvenie",
    brand_grouping_name: "Maisons",
    sku: "171292 - Balvenie 12 Doublewood 96x50ml 43.0 RO DIV DY US GV",
    size_pack: "BS6BV002 - The Balvenie 12 96x5",
    size: "BS5BV002 - The Balvenie 12 5",
    brand_variant: "BS4BV002 - The Balvenie 12",
    brand: "BS31020 - The Balvenie",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "106319",
    size_pack_id: "BS6HE001",
    size_id: "BS5HE001",
    brand_variant_id: "BS4HE001",
    brand_id: "BS31040",
    brand_grouping_id: "BS2100",
    sku_desc: "Hendrick's 96x50ml 44.0 RO DIS RD US",
    size_pack_desc: "96x5",
    size_desc: "5",
    brand_variant_name: "Hendrick's Original",
    brand_name: "Hendrick's",
    brand_grouping_name: "Maisons",
    sku: "106319 - Hendrick's 96x50ml 44.0 RO DIS RD US",
    size_pack: "BS6HE001 - Hendrick's Original 96x5",
    size: "BS5HE001 - Hendrick's Original 5",
    brand_variant: "BS4HE001 - Hendrick's Original",
    brand: "BS31040 - Hendrick's",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "284923",
    size_pack_id: "BS6RK001",
    size_id: "BS5RK001",
    brand_variant_id: "BS4RK001",
    brand_id: "BS31200",
    brand_grouping_id: "BS2120",
    sku_desc: "Reyka 6x750ml 40.0 AG WRA RD US",
    size_pack_desc: "6x75",
    size_desc: "75",
    brand_variant_name: "Reyka Original",
    brand_name: "Reyka",
    brand_grouping_name: "Incubator",
    sku: "284923 - Reyka 6x750ml 40.0 AG WRA RD US",
    size_pack: "BS6RK001 - Reyka Original 6x75",
    size: "BS5RK001 - Reyka Original 75",
    brand_variant: "BS4RK001 - Reyka Original",
    brand: "BS31200 - Reyka",
    brand_grouping: "BS2120 - Incubator"
  },
  {
    sku_id: "170637",
    size_pack_id: "BS6MG001",
    size_id: "BS5MG001",
    brand_variant_id: "BS4MG001",
    brand_id: "BS31201",
    brand_grouping_id: "BS2120",
    sku_desc: "Leyenda Del Milagro Silver 6x750ml 40.0 CK DIV RD US",
    size_pack_desc: "6x75",
    size_desc: "75",
    brand_variant_name: "Leyenda Del Milagro Silver",
    brand_name: "Leyenda Del Milagro",
    brand_grouping_name: "Incubator",
    sku: "170637 - Leyenda Del Milagro Silver 6x750ml 40.0 CK DIV RD US",
    size_pack: "BS6MG001 - Leyenda Del Milagro Silver 6x75",
    size: "BS5MG001 - Leyenda Del Milagro Silver 75",
    brand_variant: "BS4MG001 - Leyenda Del Milagro Silver",
    brand: "BS31201 - Leyenda Del Milagro",
    brand_grouping: "BS2120 - Incubator"
  },
  {
    sku_id: "252183",
    size_pack_id: "BS6GF003",
    size_id: "BS5GF003",
    brand_variant_id: "BS4GF003",
    brand_id: "BS31010",
    brand_grouping_id: "BS2100",
    sku_desc: "Glenfiddich 15 12x750ml 40.0 AG TTW TR US",
    size_pack_desc: "12x75",
    size_desc: "75",
    brand_variant_name: "Glenfiddich 15 Solera",
    brand_name: "Glenfiddich",
    brand_grouping_name: "Maisons",
    sku: "252183 - Glenfiddich 15 12x750ml 40.0 AG TTW TR US",
    size_pack: "BS6GF003 - Glenfiddich 15 Solera 12x75",
    size: "BS5GF003 - Glenfiddich 15 Solera 75",
    brand_variant: "BS4GF003 - Glenfiddich 15 Solera",
    brand: "BS31010 - Glenfiddich",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "175253",
    size_pack_id: "BS6BV010",
    size_id: "BS5BV010",
    brand_variant_id: "BS4BV010",
    brand_id: "BS31020",
    brand_grouping_id: "BS2100",
    sku_desc: "Balvenie 21 Portwood 3x750ml 43.0 CK RGB DY US",
    size_pack_desc: "3x75",
    size_desc: "75",
    brand_variant_name: "The Balvenie 21",
    brand_name: "The Balvenie",
    brand_grouping_name: "Maisons",
    sku: "175253 - Balvenie 21 Portwood 3x750ml 43.0 CK RGB DY US",
    size_pack: "BS6BV010 - The Balvenie 21 3x75",
    size: "BS5BV010 - The Balvenie 21 75",
    brand_variant: "BS4BV010 - The Balvenie 21",
    brand: "BS31020 - The Balvenie",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "284434",
    size_pack_id: "BS6HE001",
    size_id: "BS5HE001",
    brand_variant_id: "BS4HE001",
    brand_id: "BS31040",
    brand_grouping_id: "BS2100",
    sku_desc: "Hendrick's 6x1L 44.0 AG WRA DY US",
    size_pack_desc: "6x100",
    size_desc: "100",
    brand_variant_name: "Hendrick's Original",
    brand_name: "Hendrick's",
    brand_grouping_name: "Maisons",
    sku: "284434 - Hendrick's 6x1L 44.0 AG WRA DY US",
    size_pack: "BS6HE001 - Hendrick's Original 6x100",
    size: "BS5HE001 - Hendrick's Original 100",
    brand_variant: "BS4HE001 - Hendrick's Original",
    brand: "BS31040 - Hendrick's",
    brand_grouping: "BS2100 - Maisons"
  },
  {
    sku_id: "278425",
    size_pack_id: "BS6HU002",
    size_id: "BS5HU002",
    brand_variant_id: "BS4HU002",
    brand_id: "BS31204",
    brand_grouping_id: "BS2110",
    sku_desc: "Hudson Do The Rye Thing 6x750ml 46.0 CK DIV RD US",
    size_pack_desc: "6x75",
    size_desc: "75",
    brand_variant_name: "Hudson Do the Rye Thing",
    brand_name: "Hudson",
    brand_grouping_name: "Local",
    sku: "278425 - Hudson Do The Rye Thing 6x750ml 46.0 CK DIV RD US",
    size_pack: "BS6HU002 - Hudson Do the Rye Thing 6x75",
    size: "BS5HU002 - Hudson Do the Rye Thing 75",
    brand_variant: "BS4HU002 - Hudson Do the Rye Thing",
    brand: "BS31204 - Hudson",
    brand_grouping: "BS2110 - Local"
  },
  {
    sku_id: "320809",
    size_pack_id: "BS6DB001",
    size_id: "BS5DB001",
    brand_variant_id: "BS4DB001",
    brand_id: "BS31080",
    brand_grouping_id: "BS2120",
    sku_desc: "Drambuie 12x750ml 40.0 CK WRD RD US",
    size_pack_desc: "12x75",
    size_desc: "75",
    brand_variant_name: "Drambuie Original",
    brand_name: "Drambuie",
    brand_grouping_name: "Incubator",
    sku: "320809 - Drambuie 12x750ml 40.0 CK WRD RD US",
    size_pack: "BS6DB001 - Drambuie Original 12x75",
    size: "BS5DB001 - Drambuie Original 75",
    brand_variant: "BS4DB001 - Drambuie Original",
    brand: "BS31080 - Drambuie",
    brand_grouping: "BS2120 - Incubator"
  }
];

// Add after SKUMasterData interface
export interface CustomerMasterData {
  customer_id: string;
  customer_name: string;
  market_id: string;
  market_name: string;
}

// Add sample customer data
export const CUSTOMER_MASTER_DATA: CustomerMasterData[] = [
  {
    customer_id: "17254",
    customer_name: "EMPIRE MERCHANTS LLC",
    market_id: "USANY1",
    market_name: "New York Metro"
  },
  {
    customer_id: "17223",
    customer_name: "ALLIED BEVERAGE GROUP,L.L.C.-C",
    market_id: "USANJ1",
    market_name: "New Jersey"
  },
  {
    customer_id: "17006",
    customer_name: "BRESCOME BARTON INC.",
    market_id: "USACT1",
    market_name: "Connecticut"
  },
  {
    customer_id: "17199",
    customer_name: "M S WALKER INC",
    market_id: "USAMA1",
    market_name: "Massachusetts"
  },
  {
    customer_id: "17108",
    customer_name: "PENNSYLVANIA LIQUOR CONTROL BD",
    market_id: "USAPA1",
    market_name: "Pennsylvania"
  },
  {
    customer_id: "17079",
    customer_name: "MICHIGAN LIQUOR CONTROL COMM",
    market_id: "USAMI1",
    market_name: "Michigan"
  },
  {
    customer_id: "17100",
    customer_name: "OHIO - Bailment Billings",
    market_id: "USAOH1",
    market_name: "Ohio"
  },
  {
    customer_id: "17184",
    customer_name: "YOUNGS MARKET CO - TUSTIN",
    market_id: "USACA1",
    market_name: "California"
  },
  {
    customer_id: "17268",
    customer_name: "BREAKTHRU BEVERAGE FLORIDA",
    market_id: "USAFL1",
    market_name: "Florida"
  },
  {
    customer_id: "17202",
    customer_name: "REPUBLIC NATIONAL BEVERAGE CO TX",
    market_id: "USATX1",
    market_name: "Texas"
  }
];
