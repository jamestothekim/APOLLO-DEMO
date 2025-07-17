import type { ExtendedForecastData } from '../depletions/depletions';
import { MONTH_NAMES } from './volumeUtil';

// Forecast logic mapping to growth rate periods
export type ForecastLogic = 'flat' | 'three_month' | 'six_month' | 'twelve_month';

// Interface for growth rates
export interface GrowthRates {
  '3M': number;
  '6M': number;
  '12M': number;
}

// Calculate growth rates from CY and PY trend data
export const calculateGrowthRatesFromTrends = (
  cy_3m: number,
  py_3m: number,
  cy_6m: number,
  py_6m: number,
  cy_12m: number,
  py_12m: number
): GrowthRates => {
  const rate3M = py_3m > 0 ? (cy_3m - py_3m) / py_3m : 0;
  const rate6M = py_6m > 0 ? (cy_6m - py_6m) / py_6m : 0;
  const rate12M = py_12m > 0 ? (cy_12m - py_12m) / py_12m : 0;

  return {
    '3M': rate3M,
    '6M': rate6M,
    '12M': rate12M,
  };
};

// Get applicable growth rate based on forecast logic
export const getApplicableGrowthRate = (
  growthRates: GrowthRates,
  forecastLogic: ForecastLogic
): number => {
  switch (forecastLogic) {
    case 'flat':
      return 0; // No growth for flat forecast
    case 'three_month':
      return growthRates['3M'];
    case 'six_month':
      return growthRates['6M'];
    case 'twelve_month':
      return growthRates['12M'];
    default:
      return growthRates['6M']; // Default to 6M
  }
};

// Apply growth rate to PY volumes to generate new forecast
export const applyForecastLogic = (
  rowData: ExtendedForecastData,
  newForecastLogic: ForecastLogic,
  growthRates?: GrowthRates
): { [month: string]: { value: number; isActual: boolean; isManuallyModified?: boolean } } => {
  // Calculate growth rates if not provided
  const rates = growthRates || calculateGrowthRatesFromTrends(
    rowData.cy_3m_case_equivalent_volume || 0,
    rowData.py_3m_case_equivalent_volume || 0,
    rowData.cy_6m_case_equivalent_volume || 0,
    rowData.py_6m_case_equivalent_volume || 0,
    rowData.cy_12m_case_equivalent_volume || 0,
    rowData.py_12m_case_equivalent_volume || 0
  );

  // Get the applicable growth rate for the new forecast logic
  const growthRate = getApplicableGrowthRate(rates, newForecastLogic);

  // Create new months object
  const newMonths: { [month: string]: { value: number; isActual: boolean; isManuallyModified?: boolean } } = {};

  MONTH_NAMES.forEach((month) => {
    const existingMonth = rowData.months[month];
    const isActual = existingMonth?.isActual || false;

    if (isActual) {
      // Keep actual values unchanged
      newMonths[month] = {
        value: existingMonth.value,
        isActual: true,
        isManuallyModified: existingMonth.isManuallyModified || false,
      };
    } else {
      // Apply forecast logic to future months
      const pyVolume = rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
      
      let forecastValue: number;
      
      if (newForecastLogic === 'flat') {
        // Flat forecast: use PY volume as-is
        forecastValue = pyVolume;
      } else {
        // Apply growth rate to PY volume
        forecastValue = pyVolume * (1 + growthRate);
      }

      newMonths[month] = {
        value: Math.round(forecastValue * 100) / 100, // Round to 2 decimal places
        isActual: false,
        isManuallyModified: existingMonth?.isManuallyModified || false,
      };
    }
  });

  return newMonths;
};

// Generate demo forecast response data that mimics the API response
export const generateDemoForecastResponse = (
  rowData: ExtendedForecastData,
  newForecastLogic: ForecastLogic,
  growthRates?: GrowthRates
): any[] => {
  const newMonths = applyForecastLogic(rowData, newForecastLogic, growthRates);
  
  // Convert to API-like response format
  return MONTH_NAMES.map((month, index) => {
    const monthData = newMonths[month];
    return {
      market_id: rowData.market_id,
      customer_id: rowData.customer_id,
      variant_size_pack_desc: rowData.variant_size_pack_desc,
      month: index + 1, // 1-based month
      year: new Date().getFullYear(),
      case_equivalent_volume: monthData.value,
      projected_case_equivalent_volume: monthData.value, // Same as case_equivalent_volume for demo
      data_type: monthData.isActual ? 'actual_complete' : 'forecast',
      is_manual_input: monthData.isManuallyModified || false,
      forecast_method: newForecastLogic,
    };
  });
};

// Enhanced forecast change function for demo mode
export const generateDemoForecastChange = async (
  rowData: ExtendedForecastData,
  newForecastLogic: ForecastLogic,
  options: {
    useStoredGrowthRates?: boolean;
    customGrowthRates?: GrowthRates;
    simulateDelay?: boolean;
  } = {}
): Promise<any[]> => {
  const { simulateDelay = true, customGrowthRates } = options;

  // Simulate API delay
  if (simulateDelay) {
    const { simulateApiDelay } = await import('../../playData/demoConfig');
    await simulateApiDelay(200, 500); // Shorter delay for forecast changes
  }

  // Calculate or use provided growth rates
  const growthRates = customGrowthRates || calculateGrowthRatesFromTrends(
    rowData.cy_3m_case_equivalent_volume || 0,
    rowData.py_3m_case_equivalent_volume || 0,
    rowData.cy_6m_case_equivalent_volume || 0,
    rowData.py_6m_case_equivalent_volume || 0,
    rowData.cy_12m_case_equivalent_volume || 0,
    rowData.py_12m_case_equivalent_volume || 0
  );

  return generateDemoForecastResponse(rowData, newForecastLogic, growthRates);
};

// Utility to add seasonal adjustments to forecast values
export const applySeasonalAdjustments = (
  baseValue: number,
  monthIndex: number,
  brand: string
): number => {
  // Seasonal multipliers by month (index 0-11)
  // Higher values in Nov/Dec for holidays, lower in summer months
  const seasonalMultipliers = [
    1.0,  // Jan
    0.95, // Feb
    1.05, // Mar
    1.0,  // Apr
    0.9,  // May
    0.85, // Jun
    0.8,  // Jul
    0.85, // Aug
    0.95, // Sep
    1.1,  // Oct
    1.25, // Nov
    1.4,  // Dec
  ];

  // Apply brand-specific adjustments
  let brandMultiplier = 1.0;
  if (brand.toLowerCase().includes('jack')) {
    brandMultiplier = 1.1; // Jack brands perform better in general
  } else if (brand.toLowerCase().includes('premium')) {
    brandMultiplier = 0.9; // Premium brands more consistent, less seasonal
  }

  const seasonalAdjustment = seasonalMultipliers[monthIndex] || 1.0;
  return baseValue * seasonalAdjustment * brandMultiplier;
};

// Enhanced forecast logic with seasonal adjustments
export const applyForecastLogicWithSeasonality = (
  rowData: ExtendedForecastData,
  newForecastLogic: ForecastLogic,
  growthRates?: GrowthRates,
  includeSeasonality: boolean = true
): { [month: string]: { value: number; isActual: boolean; isManuallyModified?: boolean } } => {
  const baseMonths = applyForecastLogic(rowData, newForecastLogic, growthRates);

  if (!includeSeasonality) {
    return baseMonths;
  }

  // Apply seasonal adjustments to forecast months only
  const adjustedMonths = { ...baseMonths };
  
  MONTH_NAMES.forEach((month, index) => {
    if (!baseMonths[month].isActual) {
      const adjustedValue = applySeasonalAdjustments(
        baseMonths[month].value,
        index,
        rowData.brand
      );
      adjustedMonths[month] = {
        ...baseMonths[month],
        value: Math.round(adjustedValue * 100) / 100,
      };
    }
  });

  return adjustedMonths;
}; 