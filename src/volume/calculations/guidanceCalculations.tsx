import React from 'react';
import type { Guidance } from '../../redux/slices/userSettingsSlice';
import { MONTH_NAMES } from '../util/volumeUtil';
import type { GuidanceForecastOption } from '../../reusableComponents/quantSidebar';
import type { SummaryCalculationsState } from '../../redux/slices/guidanceCalculationsSlice';
import type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from '../summary/summary';
import { Box } from '@mui/material';

// Types for guidance calculations
export interface MonthlyData {
  value: number;
  isActual?: boolean;
  isManuallyModified?: boolean;
}

export interface BaseData {
  months: { [key: string]: MonthlyData };
  case_equivalent_volume?: number;
  py_case_equivalent_volume?: number;
  prev_published_case_equivalent_volume?: number; // LC Volume Total
  gross_sales_value?: number;
  py_gross_sales_value?: number;
  lc_gross_sales_value?: number; // LC GSV Total
  gsv_rate?: number;
  py_gsv_rate?: number;
  // Optional: Add monthly breakdown for LC
  prev_published_case_equivalent_volume_months?: { [key: string]: MonthlyData };
  lc_gross_sales_value_months?: { [key: string]: MonthlyData }; // Monthly LC GSV
  [key: string]: any;
}

export interface GuidanceCalculationResult {
  [key: string]: number;
}

// Additional interfaces for sidebar guidance
export interface GuidanceMonthlyValueData {
  [key: string]: number[];
}

export interface GuidanceDataSourceInput {
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  py_case_equivalent_volume?: number;
  py_gross_sales_value?: number;
  gross_sales_value?: number;
  case_equivalent_volume?: number;
  [key: string]: any;
}

// Interface for extended forecast data used in row guidance calculations  
interface ExtendedForecastData {
  case_equivalent_volume?: number;
  py_case_equivalent_volume?: number;
  gross_sales_value?: number;
  py_gross_sales_value?: number;
  months: { [key: string]: { value: number; isActual?: boolean; isManuallyModified?: boolean } };
  py_case_equivalent_volume_months?: { [key: string]: { value: number } };
  prev_published_case_equivalent_volume_months?: { [key: string]: { value: number } };
  lc_gross_sales_value_months?: { [key: string]: { value: number } };
  [key: string]: any;
}

// Helper functions
export const calculateTotal = (months: { [key: string]: MonthlyData }): number => {
  return Object.values(months).reduce((acc, curr) => acc + (curr.value || 0), 0);
};

export const calculateGSVRate = (gsv: number, volume: number): number => {
  return volume > 0 ? gsv / volume : 0;
};

export const calculateGuidanceValue = (
  data: BaseData,
  guidance: Guidance
): number => {
  // For direct values (like py_case_equivalent_volume)
  if (typeof guidance.value === 'string') {
    const fieldName = guidance.value;
    return data[fieldName] || 0;
  }

  // For calculated values
  const value = guidance.value as any;
  const calcType = guidance.calculation.type;

  if (calcType === 'difference' && value.expression) {
    const parts = value.expression.split(' - ');
    const value1 = getFieldValue(data, parts[0]?.trim());
    const value2 = getFieldValue(data, parts[1]?.trim());
    return value1 - value2;
  } else if (calcType === 'percentage' && value.numerator && value.denominator) {
    const numParts = value.numerator.split(' - ');
    const numerator = getFieldValue(data, numParts[0]?.trim()) - getFieldValue(data, numParts[1]?.trim());
    const denominator = getFieldValue(data, value.denominator.trim());
    return denominator === 0 ? 0 : numerator / denominator;
  }

  return 0;
};

// Helper to get field value, handling special cases
const getFieldValue = (data: BaseData, fieldName: string): number => {
  if (!fieldName) return 0;
  
  // Handle special case for case_equivalent_volume (total volume)
  if (fieldName === 'case_equivalent_volume') {
    return data.case_equivalent_volume || calculateTotal(data.months);
  }
  
  // Handle GSV rate calculations
  if (fieldName === 'gsv_rate') {
    return data.gsv_rate || calculateGSVRate(
      data.gross_sales_value || 0,
      data.case_equivalent_volume || calculateTotal(data.months)
    );
  }
  
  if (fieldName === 'py_gsv_rate') {
    return data.py_gsv_rate || calculateGSVRate(
      data.py_gross_sales_value || 0,
      data.py_case_equivalent_volume || 0
    );
  }
  
  if (fieldName === 'prev_published_case_equivalent_volume') {
    return data.prev_published_case_equivalent_volume || 0;
  }
  
  if (fieldName === 'lc_gross_sales_value') {
    return data.lc_gross_sales_value || 0; // Should be pre-calculated now
  }
  
  // Default case: return the field value or 0
  return data[fieldName] || 0;
};

// Calculate guidance values for a specific data item
export const calculateGuidanceForItem = (
  item: BaseData,
  selectedGuidance: Guidance[]
): GuidanceCalculationResult => {
  const result: GuidanceCalculationResult = {};
  
  // Calculate total volume if not already set
  if (item.case_equivalent_volume === undefined) {
    item.case_equivalent_volume = calculateTotal(item.months);
  }
  
  // Calculate GSV rates if not already set
  if (item.gsv_rate === undefined && item.gross_sales_value !== undefined) {
    item.gsv_rate = calculateGSVRate(item.gross_sales_value, item.case_equivalent_volume);
  }
  
  if (item.py_gsv_rate === undefined && item.py_gross_sales_value !== undefined && item.py_case_equivalent_volume !== undefined) {
    item.py_gsv_rate = calculateGSVRate(item.py_gross_sales_value, item.py_case_equivalent_volume);
  }
  
  // Calculate each guidance value
  selectedGuidance.forEach(guidance => {
    const key = `guidance_${guidance.id}`;
    result[key] = calculateGuidanceValue(item, guidance);
  });
  
  return result;
};

// Calculate monthly guidance values
export const calculateMonthlyGuidanceForItem = (
  item: BaseData,
  guidance: Guidance
): { [month: string]: number } | null => {
  const result: { [month: string]: number } = {};
  
  // For direct values
  if (typeof guidance.value === 'string') {
    const fieldName = guidance.value;
    
    // Check if we have monthly data for this field
    const monthlyFieldName = `${fieldName}_months`;
    if (item[monthlyFieldName] && typeof item[monthlyFieldName] === 'object') {
      MONTH_NAMES.forEach((month: string) => {
        result[month] = item[monthlyFieldName][month]?.value || 0;
      });
      return result;
    }
    
    // If no monthly data, distribute the total value evenly
    const totalValue = item[fieldName] || 0;
    const monthlyValue = totalValue / 12;
    MONTH_NAMES.forEach((month: string) => {
      result[month] = monthlyValue;
    });
    return result;
  }
  
  // For calculated values
  const value = guidance.value as any;
  const calcType = guidance.calculation.type;
  
  if (calcType === 'difference' && value.expression) {
    const parts = value.expression.split(' - ');
    const field1 = parts[0]?.trim();
    const field2 = parts[1]?.trim();
    
    MONTH_NAMES.forEach((month: string) => {
      const value1 = getMonthlyFieldValue(item, field1, month);
      const value2 = getMonthlyFieldValue(item, field2, month);
      result[month] = value1 - value2;
    });
    return result;
  } else if (calcType === 'percentage' && value.numerator && value.denominator) {
    const numParts = value.numerator.split(' - ');
    const numerField1 = numParts[0]?.trim();
    const numerField2 = numParts[1]?.trim();
    const denomField = value.denominator.trim();
    
    MONTH_NAMES.forEach((month: string) => {
      const numerValue1 = getMonthlyFieldValue(item, numerField1, month);
      const numerValue2 = getMonthlyFieldValue(item, numerField2, month);
      const denomValue = getMonthlyFieldValue(item, denomField, month);
      
      const numerator = numerValue1 - numerValue2;
      result[month] = denomValue === 0 ? 0 : numerator / denomValue;
    });
    return result;
  }
  
  return null;
};

// Helper to get monthly field value
const getMonthlyFieldValue = (data: BaseData, fieldName: string, month: string): number => {
  if (!fieldName) return 0;
  
  // Check if we have monthly data for this field
  const monthlyFieldName = `${fieldName}_months`;
  if (data[monthlyFieldName] && typeof data[monthlyFieldName] === 'object') {
    return data[monthlyFieldName][month]?.value || 0;
  }
  
  // Special case for prev_published_case_equivalent_volume (LC volume)
  if (fieldName === 'prev_published_case_equivalent_volume') {
    return data.prev_published_case_equivalent_volume_months?.[month]?.value || 0;
  }

  // Special case for case_equivalent_volume (current forecast volume)
  if (fieldName === 'case_equivalent_volume') {
    return data.months[month]?.value || 0;
  }
  
  // Special case for gsv_rate
  if (fieldName === 'gsv_rate') {
    const monthVolume = data.months[month]?.value || 0;
    const gsvRate = data.gsv_rate || calculateGSVRate(
      data.gross_sales_value || 0,
      data.case_equivalent_volume || calculateTotal(data.months)
    );
    return monthVolume * gsvRate;
  }
  
  // Special case for py_gsv_rate
  if (fieldName === 'py_gsv_rate') {
    const pyMonthVolume = data.py_case_equivalent_volume_months?.[month]?.value || 0;
    const pyGsvRate = data.py_gsv_rate || calculateGSVRate(
      data.py_gross_sales_value || 0,
      data.py_case_equivalent_volume || 0
    );
    return pyMonthVolume * pyGsvRate;
  }
  
  // Special case for lc_gross_sales_value
  if (fieldName === 'lc_gross_sales_value') {
    // For total lc_gross_sales_value, it should be pre-calculated and directly available on data.
    // For monthly, we check if lc_gross_sales_value_months exists first.
    if (data.lc_gross_sales_value_months?.[month]) {
      return data.lc_gross_sales_value_months[month].value || 0;
    }
    // Fallback to calculating monthly LC GSV if specific monthly data isn't present
    const lcMonthVolume = data.prev_published_case_equivalent_volume_months?.[month]?.value || 0;
    const gsvRate = data.gsv_rate || calculateGSVRate(
      data.gross_sales_value || 0,
      data.case_equivalent_volume || calculateTotal(data.months)
    );
    return lcMonthVolume * gsvRate;
  }
  
  // Default case: return 0
  return 0;
};

// Recalculate guidance for a data row (moved from volumeUtil.tsx)
export const recalculateGuidance = (
  row: any,
  selectedGuidance: Guidance[]
): any => {
  if (!selectedGuidance || selectedGuidance.length === 0) {
    return row;
  }

  const updatedRow = { ...row };

  const totalVolume = calculateTotal(updatedRow.months);
  updatedRow.case_equivalent_volume = totalVolume;

  if (updatedRow.py_case_equivalent_volume && updatedRow.py_gross_sales_value) {
    const volumeRatio =
      updatedRow.py_case_equivalent_volume > 0
        ? totalVolume / updatedRow.py_case_equivalent_volume
        : 1;

    const estimatedGSV = updatedRow.py_gross_sales_value * volumeRatio;

    const currentGSV = updatedRow.gross_sales_value || 0;
    if (
      Math.abs((estimatedGSV - currentGSV) / Math.max(currentGSV, 1)) > 0.001
    ) {
      updatedRow.gross_sales_value = estimatedGSV;
    }
  }

  if (updatedRow.gross_sales_value === undefined) {
    updatedRow.gross_sales_value = 0;
  }

  if (updatedRow.py_gross_sales_value === undefined) {
    updatedRow.py_gross_sales_value = 0;
  }

  const tyGsvRate =
    updatedRow.gsv_rate ??
    (totalVolume > 0 ? (updatedRow.gross_sales_value || 0) / totalVolume : 0);

  if (
    updatedRow.lc_gross_sales_value === undefined &&
    updatedRow.prev_published_case_equivalent_volume !== undefined
  ) {
    updatedRow.lc_gross_sales_value =
      (updatedRow.prev_published_case_equivalent_volume || 0) * tyGsvRate;
  }

  selectedGuidance.forEach((guidance) => {
    if (
      guidance.calculation.type === "direct" &&
      typeof guidance.value === "string"
    ) {
      updatedRow[`guidance_${guidance.id}`] = updatedRow[guidance.value] ?? 0;
    } else if (guidance.calculation.type === "multi_calc") {
      const results: { [subId: string]: number } = {};
      guidance.calculation.subCalculations.forEach((subCalc) => {
        const cyValue = Number(updatedRow[subCalc.cyField]) || 0;
        const pyValue = Number(updatedRow[subCalc.pyField]) || 0;

        let subResult = 0;
        if (subCalc.calculationType === "percentage") {
          subResult = pyValue === 0 ? 0 : (cyValue - pyValue) / pyValue;
        } else if (subCalc.calculationType === "difference") {
          subResult = cyValue - pyValue;
        } else if (subCalc.calculationType === "direct") {
          subResult = cyValue;
        }

        results[subCalc.id] = subResult;
      });

      updatedRow[`guidance_${guidance.id}`] = results;
    } else if (guidance.value !== null && typeof guidance.value === "object") {
      if (
        guidance.calculation.type === "difference" &&
        "expression" in guidance.value
      ) {
        const expressionParts = guidance.value.expression.split(" - ");
        const field1 = expressionParts[0].trim();
        const field2 = expressionParts[1].trim();
        const value1 =
          field1 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field1];
        const value2 =
          field2 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field2];
        const result = (Number(value1) || 0) - (Number(value2) || 0);
        updatedRow[`guidance_${guidance.id}`] = result;
      } else if (
        guidance.calculation.type === "percentage" &&
        "numerator" in guidance.value &&
        "denominator" in guidance.value
      ) {
        const numeratorParts = guidance.value.numerator.split(" - ");
        const numerField1 = numeratorParts[0].trim();
        const numerField2 = numeratorParts[1].trim();
        const denomField = guidance.value.denominator.trim();
        const numerValue1 =
          numerField1 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[numerField1];
        const numerValue2 =
          numerField2 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[numerField2];
        const denomValue =
          denomField === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[denomField];
        const numerator =
          (Number(numerValue1) || 0) - (Number(numerValue2) || 0);
        const denominator = Number(denomValue) || 0;
        const result = denominator === 0 ? 0 : numerator / denominator;
        updatedRow[`guidance_${guidance.id}`] = result;
      }
    }
  });

  return updatedRow;
};

// === SIDEBAR GUIDANCE FUNCTIONS === //

export const getGuidanceDataForSidebar = (
  data: GuidanceDataSourceInput,
  guidanceOptions: GuidanceForecastOption[]
): GuidanceMonthlyValueData => {
  const sidebarGuidanceData: GuidanceMonthlyValueData = {};
  const months = Object.keys(data.months);

  guidanceOptions.forEach((guidance) => {
    const guidanceField = guidance.value;

    if (typeof guidanceField === "string" && !guidance.calculation) {
      if (data[`${guidanceField}_months`]) {
        sidebarGuidanceData[guidanceField] = months.map(
          (month) => data[`${guidanceField}_months`]?.[month]?.value || 0
        );
      } else {
        const totalGuidanceValue = data[guidanceField];
        if (totalGuidanceValue !== undefined) {
          const totalValue = Number(totalGuidanceValue) || 0;
          const equalShare = Math.round((totalValue / months.length) * 10) / 10;
          sidebarGuidanceData[guidanceField] = Array(months.length).fill(
            equalShare
          );
        }
      }
    }
  });

  return sidebarGuidanceData;
};

export const calculateRowGuidanceMonthlyData = (
  rowData: ExtendedForecastData,
  guidance: Guidance
): { [month: string]: number } | null => {
  const totalVolumeTY = rowData.case_equivalent_volume || 0;
  const totalVolumePY = rowData.py_case_equivalent_volume || 0;
  const totalGsvTY = rowData.gross_sales_value || 0;
  const totalGsvPY = rowData.py_gross_sales_value || 0;

  const tyRate = totalVolumeTY === 0 ? 0 : totalGsvTY / totalVolumeTY;
  const pyRate = totalVolumePY === 0 ? 0 : totalGsvPY / totalVolumePY;

  if (typeof guidance.value === "string") {
    const fieldName = guidance.value;
    const currentMonths = rowData.months;
    const pyMonths = rowData.py_case_equivalent_volume_months;
    const lcMonths = rowData.prev_published_case_equivalent_volume_months;
    const resultMonthlyData: { [month: string]: number } = {};

    MONTH_NAMES.forEach((month: string) => {
      let value: number | undefined;
      if (fieldName === "case_equivalent_volume") {
        value = currentMonths[month]?.value;
      } else if (fieldName === "py_case_equivalent_volume") {
        value = pyMonths?.[month]?.value;
      } else if (fieldName === "prev_published_case_equivalent_volume") {
        value = lcMonths?.[month]?.value;
      } else if (fieldName === "gross_sales_value") {
        const monthVolumeTY = currentMonths[month]?.value || 0;
        value = monthVolumeTY * tyRate;
      } else if (fieldName === "py_gross_sales_value") {
        const monthVolumePY = pyMonths?.[month]?.value || 0;
        value = monthVolumePY * pyRate;
      } else if (fieldName === "lc_gross_sales_value") {
        if (rowData.lc_gross_sales_value_months?.[month]?.value !== undefined) {
          value = rowData.lc_gross_sales_value_months[month].value;
        } else {
          const monthVolumeLC = lcMonths?.[month]?.value || 0;
          value = monthVolumeLC * tyRate;
        }
      } else {
        const totalValue = Number(rowData[fieldName]) || 0;
        value = totalValue / 12;
      }
      resultMonthlyData[month] = value !== undefined ? value : 0;
    });

    return resultMonthlyData;
  }

  const currentMonths = rowData.months;

  const getMonthlyValue = (fieldName: string, month: string): number => {
    const monthlyDataSource = `${fieldName}_months`;
    if (
      (monthlyDataSource === "prev_published_case_equivalent_volume_months" &&
        rowData.prev_published_case_equivalent_volume_months?.[month]) ||
      (monthlyDataSource === "lc_gross_sales_value_months" &&
        rowData.lc_gross_sales_value_months?.[month]) ||
      (rowData[monthlyDataSource] &&
        typeof rowData[monthlyDataSource] === "object" &&
        rowData[monthlyDataSource][month])
    ) {
      const source =
        monthlyDataSource === "prev_published_case_equivalent_volume_months"
          ? rowData.prev_published_case_equivalent_volume_months
          : rowData[monthlyDataSource];
      const value = source[month]?.value || 0;
      return value;
    } else {
      let calculatedValue = 0;
      if (fieldName === "gross_sales_value") {
        const monthVolumeTY = currentMonths[month]?.value || 0;
        calculatedValue = monthVolumeTY * tyRate;
      } else if (fieldName === "py_gross_sales_value") {
        const monthVolumePY =
          rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
        calculatedValue = monthVolumePY * pyRate;
      } else if (fieldName === "py_case_equivalent_volume") {
        calculatedValue =
          rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
      } else if (fieldName === "prev_published_case_equivalent_volume") {
        calculatedValue =
          rowData.prev_published_case_equivalent_volume_months?.[month]
            ?.value || 0;
      } else if (fieldName === "lc_gross_sales_value") {
        if (rowData.lc_gross_sales_value_months?.[month]?.value !== undefined) {
          calculatedValue = rowData.lc_gross_sales_value_months[month].value;
        } else {
          const monthVolumeLC =
            rowData.prev_published_case_equivalent_volume_months?.[month]
              ?.value || 0;
          calculatedValue = monthVolumeLC * tyRate;
        }
      } else if (fieldName === "case_equivalent_volume") {
        calculatedValue = currentMonths[month]?.value || 0;
      } else {
        calculatedValue = 0;
      }
      return calculatedValue;
    }
  };

  const resultMonthlyData: { [month: string]: number } = {};

  if (
    guidance.calculation.type === "difference" &&
    guidance.value !== null &&
    typeof guidance.value === "object" &&
    "expression" in guidance.value
  ) {
    const expressionParts = guidance.value.expression.split(" - ");
    const field1 = expressionParts[0].trim();
    const field2 = expressionParts[1].trim();

    MONTH_NAMES.forEach((month) => {
      const value1 = getMonthlyValue(field1, month);
      const value2 = getMonthlyValue(field2, month);
      resultMonthlyData[month] = value1 - value2;
    });
    return resultMonthlyData;
  } else if (
    guidance.calculation.type === "percentage" &&
    guidance.value !== null &&
    typeof guidance.value === "object" &&
    "numerator" in guidance.value &&
    "denominator" in guidance.value
  ) {
    const numeratorParts = guidance.value.numerator.split(" - ");
    const numerField1 = numeratorParts[0].trim();
    const numerField2 = numeratorParts[1].trim();
    const denomField = guidance.value.denominator.trim();

    MONTH_NAMES.forEach((month) => {
      const numerValue1 = getMonthlyValue(numerField1, month);
      const numerValue2 = getMonthlyValue(numerField2, month);
      const denomValue = getMonthlyValue(denomField, month);

      const numerator = numerValue1 - numerValue2;
      resultMonthlyData[month] = denomValue === 0 ? 0 : numerator / denomValue;
    });
    return resultMonthlyData;
  }

  return null;
};

// === SUMMARY GUIDANCE CALCULATIONS === //

export interface CalculatedGuidanceValue {
  total?: number;
  monthly?: { [month: string]: number };
}

export const calculateSingleSummaryGuidance = (
  baseData: {
    total_ty: number;
    total_py: number;
    total_gsv_ty: number;
    total_gsv_py: number;
    input_months_ty?: { [key: string]: number };
    input_months_py?: { [key: string]: number };
    total_lc_volume: number;
    total_lc_gsv: number;
    input_months_lc_volume?: { [key: string]: number };
    input_months_lc_gsv?: { [key: string]: number };
  },
  guidance: Guidance,
  calculateMonthly: boolean = false
): CalculatedGuidanceValue => {
  const result: CalculatedGuidanceValue = {};

  const totalVolumeTY = baseData.total_ty || 0;
  const totalVolumePY = baseData.total_py || 0;
  const totalGsvTY = baseData.total_gsv_ty || 0;
  const totalGsvPY = baseData.total_gsv_py || 0;

  const tyRate = totalVolumeTY === 0 ? 0 : totalGsvTY / totalVolumeTY;
  const pyRate = totalVolumePY === 0 ? 0 : totalGsvPY / totalVolumePY;

  const getTotalValue = (fieldName: string): number => {
    if (fieldName === "case_equivalent_volume") return totalVolumeTY;
    if (fieldName === "py_case_equivalent_volume") return totalVolumePY;
    if (fieldName === "gross_sales_value") return totalGsvTY;
    if (fieldName === "py_gross_sales_value") return totalGsvPY;
    if (fieldName === "gsv_rate") return tyRate;
    if (fieldName === "py_gsv_rate") return pyRate;
    if (fieldName === "prev_published_case_equivalent_volume")
      return baseData.total_lc_volume;
    if (fieldName === "lc_gross_sales_value") return baseData.total_lc_gsv;

    return 0;
  };

  if (typeof guidance.value === "string") {
    result.total = getTotalValue(guidance.value);
  } else {
    const calcType = guidance.calculation.type;
    if (
      calcType === "difference" &&
      guidance.value !== null &&
      typeof guidance.value === "object" &&
      "expression" in guidance.value
    ) {
      const parts = guidance.value.expression.split(" - ");
      result.total =
        getTotalValue(parts[0]?.trim()) - getTotalValue(parts[1]?.trim());
    } else if (
      calcType === "percentage" &&
      guidance.value !== null &&
      typeof guidance.value === "object" &&
      "numerator" in guidance.value &&
      "denominator" in guidance.value
    ) {
      const numParts = guidance.value.numerator.split(" - ");
      const numerator =
        getTotalValue(numParts[0]?.trim()) - getTotalValue(numParts[1]?.trim());
      const denominator = getTotalValue(guidance.value.denominator.trim());
      result.total = denominator === 0 ? 0 : numerator / denominator;
    }
  }
  result.total = result.total ? Math.round(result.total * 1000) / 1000 : 0;

  if (calculateMonthly && baseData.input_months_ty) {
    result.monthly = {};
    MONTH_NAMES.forEach((month) => {
      let monthlyVal: number | undefined = undefined;

      const getMonthlyValue = (
        fieldName: string,
        currentMonth: string
      ): number => {
        if (fieldName === "case_equivalent_volume")
          return baseData.input_months_ty?.[currentMonth] ?? 0;
        if (fieldName === "py_case_equivalent_volume")
          return baseData.input_months_py?.[currentMonth] ?? 0;
        if (fieldName === "gross_sales_value")
          return (baseData.input_months_ty?.[currentMonth] ?? 0) * tyRate;
        if (fieldName === "py_gross_sales_value")
          return (baseData.input_months_py?.[currentMonth] ?? 0) * pyRate;
        if (fieldName === "gsv_rate") return tyRate;
        if (fieldName === "py_gsv_rate") return pyRate;
        if (fieldName === "prev_published_case_equivalent_volume")
          return baseData.input_months_lc_volume?.[currentMonth] ?? 0;
        if (fieldName === "lc_gross_sales_value") {
          if (baseData.input_months_lc_gsv?.[currentMonth] !== undefined) {
            return baseData.input_months_lc_gsv[currentMonth];
          }
          return (
            (baseData.input_months_lc_volume?.[currentMonth] ?? 0) * tyRate
          );
        }

        return 0;
      };

      if (typeof guidance.value === "string") {
        monthlyVal = getMonthlyValue(guidance.value, month);
      } else {
        const calcType = guidance.calculation.type;
        if (
          calcType === "difference" &&
          guidance.value !== null &&
          typeof guidance.value === "object" &&
          "expression" in guidance.value
        ) {
          const parts = guidance.value.expression.split(" - ");
          const val1 = getMonthlyValue(parts[0]?.trim(), month);
          const val2 = getMonthlyValue(parts[1]?.trim(), month);
          monthlyVal = val1 - val2;
        } else if (
          calcType === "percentage" &&
          guidance.value !== null &&
          typeof guidance.value === "object" &&
          "numerator" in guidance.value &&
          "denominator" in guidance.value
        ) {
          const numParts = guidance.value.numerator.split(" - ");
          const numerVal1 = getMonthlyValue(numParts[0]?.trim(), month);
          const numerVal2 = getMonthlyValue(numParts[1]?.trim(), month);
          const denomVal = getMonthlyValue(
            guidance.value.denominator.trim(),
            month
          );
          const numerator = numerVal1 - numerVal2;
          monthlyVal = denomVal === 0 ? 0 : numerator / denomVal;
        }
      }
      result.monthly![month] =
        monthlyVal !== undefined ? Math.round(monthlyVal * 1000) / 1000 : 0;
    });
  }

  return result;
};

export const calculateAllSummaryGuidance = (
  variantsAggArray: SummaryVariantAggregateData[],
  brandAggsMap: Map<string, SummaryBrandAggregateData>,
  selectedGuidance: Guidance[],
  selectedRowGuidance: Guidance[]
): SummaryCalculationsState => {
  const calculatedResults: SummaryCalculationsState = {};
  const allGuidanceDefs = [...selectedGuidance, ...selectedRowGuidance];
  const uniqueGuidanceDefs = Array.from(
    new Map(allGuidanceDefs.map((g) => [g.id, g])).values()
  );
  const rowGuidanceIds = new Set(selectedRowGuidance.map((g) => g.id));

  variantsAggArray.forEach((variantAgg) => {
    const key = `variant:${variantAgg.brand}_${
      variantAgg.variant_id || variantAgg.variant
    }`;
    calculatedResults[key] = {};
    const baseData = {
      total_ty: variantAgg.total,
      total_py: variantAgg.total_py_volume,
      total_gsv_ty: variantAgg.total_gsv_ty,
      total_gsv_py: variantAgg.total_gsv_py,
      input_months_ty: variantAgg.months,
      input_months_py: variantAgg.months_py_volume,
      total_lc_volume: variantAgg.prev_published_case_equivalent_volume,
      total_lc_gsv: variantAgg.lc_gross_sales_value,
      input_months_lc_volume: variantAgg.months_lc_volume,
      input_months_lc_gsv: variantAgg.months_lc_gsv,
    };
    uniqueGuidanceDefs.forEach((guidanceDef) => {
      const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
      calculatedResults[key][guidanceDef.id] = calculateSingleSummaryGuidance(
        baseData,
        guidanceDef,
        needsMonthly
      );
    });
  });

  brandAggsMap.forEach((brandAgg) => {
    const key = `brand:${brandAgg.id}`;
    calculatedResults[key] = {};
    const baseData = {
      total_ty: brandAgg.total,
      total_py: brandAgg.total_py_volume,
      total_gsv_ty: brandAgg.total_gsv_ty,
      total_gsv_py: brandAgg.total_gsv_py,
      input_months_ty: brandAgg.months,
      input_months_py: brandAgg.months_py_volume,
      total_lc_volume: brandAgg.prev_published_case_equivalent_volume,
      total_lc_gsv: brandAgg.lc_gross_sales_value,
      input_months_lc_volume: brandAgg.months_lc_volume,
      input_months_lc_gsv: brandAgg.months_lc_gsv,
    };
    uniqueGuidanceDefs.forEach((guidanceDef) => {
      const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
      calculatedResults[key][guidanceDef.id] = calculateSingleSummaryGuidance(
        baseData,
        guidanceDef,
        needsMonthly
      );
    });
  });

  return calculatedResults;
};

export const calculateTotalGuidance = (
  brandAggsMap: Map<string, SummaryBrandAggregateData>,
  selectedGuidance: Guidance[],
  selectedRowGuidance: Guidance[]
): { [key: string]: CalculatedGuidanceValue } => {
  const totalResults: { [key: string]: CalculatedGuidanceValue } = {};
  const allGuidanceDefs = [...selectedGuidance, ...selectedRowGuidance];
  const uniqueGuidanceDefs = Array.from(
    new Map(allGuidanceDefs.map((g) => [g.id, g])).values()
  );
  const rowGuidanceIds = new Set(selectedRowGuidance.map((g) => g.id));

  const totalMonths_ty: { [key: string]: number } = {};
  const totalMonths_py: { [key: string]: number } = {};
  const totalMonths_gsv_ty: { [key: string]: number } = {};
  const totalMonths_gsv_py: { [key: string]: number } = {};
  let total_ty = 0;
  let total_py = 0;
  let total_gsv_ty = 0;
  let total_gsv_py = 0;

  brandAggsMap.forEach((brandAgg) => {
    total_ty += brandAgg.total;
    total_py += brandAgg.total_py_volume;
    total_gsv_ty += brandAgg.total_gsv_ty;
    total_gsv_py += brandAgg.total_gsv_py;

    MONTH_NAMES.forEach((month) => {
      totalMonths_ty[month] =
        (totalMonths_ty[month] || 0) + (brandAgg.months?.[month] || 0);
      totalMonths_py[month] =
        (totalMonths_py[month] || 0) +
        (brandAgg.months_py_volume?.[month] || 0);
      totalMonths_gsv_ty[month] =
        (totalMonths_gsv_ty[month] || 0) +
        (brandAgg.months_gsv_ty?.[month] || 0);
      totalMonths_gsv_py[month] =
        (totalMonths_gsv_py[month] || 0) +
        (brandAgg.months_gsv_py?.[month] || 0);
    });
  });

  total_ty = Math.round(total_ty);
  total_py = Math.round(total_py);
  total_gsv_ty = Math.round(total_gsv_ty * 100) / 100;
  total_gsv_py = Math.round(total_gsv_py * 100) / 100;

  MONTH_NAMES.forEach((month) => {
    totalMonths_ty[month] = Math.round(totalMonths_ty[month]);
    totalMonths_py[month] = Math.round(totalMonths_py[month]);
    totalMonths_gsv_ty[month] =
      Math.round(totalMonths_gsv_ty[month] * 100) / 100;
    totalMonths_gsv_py[month] =
      Math.round(totalMonths_gsv_py[month] * 100) / 100;
  });

  const baseData = {
    total_ty,
    total_py,
    total_gsv_ty,
    total_gsv_py,
    input_months_ty: totalMonths_ty,
    input_months_py: totalMonths_py,
    total_lc_volume: Math.round(
      Array.from(brandAggsMap.values()).reduce(
        (sum, brand) => sum + brand.prev_published_case_equivalent_volume,
        0
      )
    ),
    total_lc_gsv: Math.round(
      Array.from(brandAggsMap.values()).reduce(
        (sum, brand) => sum + brand.lc_gross_sales_value,
        0
      )
    ),
    input_months_lc_volume: MONTH_NAMES.reduce((acc, month) => {
      acc[month] = Math.round(
        Array.from(brandAggsMap.values()).reduce(
          (sum, brand) => sum + (brand.months_lc_volume?.[month] || 0),
          0
        )
      );
      return acc;
    }, {} as { [key: string]: number }),
    input_months_lc_gsv: MONTH_NAMES.reduce((acc, month) => {
      acc[month] = Math.round(
        Array.from(brandAggsMap.values()).reduce(
          (sum, brand) => sum + (brand.months_lc_gsv?.[month] || 0),
          0
        )
      );
      return acc;
    }, {} as { [key: string]: number }),
  };

  uniqueGuidanceDefs.forEach((guidanceDef) => {
    const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
    totalResults[guidanceDef.id] = calculateSingleSummaryGuidance(
      baseData,
      guidanceDef,
      needsMonthly
    );
  });

  return totalResults;
};

export const formatGuidanceValue = (
  value: number | undefined,
  format: string = "number",
  guidanceType?: string
): React.ReactNode => {
  if (value === undefined || isNaN(value)) return "-";
  if (value === Infinity || value === -Infinity) return "-";

  const roundedValue = Math.round(value * 100) / 100;
  const isNegative = roundedValue < 0;

  if (format === "percent") {
    const formattedValue =
      Math.round(roundedValue * 100).toLocaleString() + "%";

    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {formattedValue}
      </Box>
    ) : (
      formattedValue
    );
  }

  if (
    guidanceType &&
    guidanceType.toLowerCase().includes("gsv") &&
    !guidanceType.toLowerCase().includes("%")
  ) {
    const formattedValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(roundedValue));

    const accountingValue = isNegative ? `(${formattedValue})` : formattedValue;

    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {accountingValue}
      </Box>
    ) : (
      accountingValue
    );
  }

  const formattedValue = roundedValue.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return isNegative ? (
    <Box component="span" sx={{ color: "error.main" }}>
      {formattedValue}
    </Box>
  ) : (
    formattedValue
  );
}; 