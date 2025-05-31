import type { Guidance } from "../../redux/slices/userSettingsSlice";
import {
  MONTH_NAMES,
  calculateTotal,
} from "../util/volumeUtil";
// Import guidance calculations from the shared location
import { recalculateGuidance } from "../calculations/guidanceCalculations";

export interface ExtendedForecastData {
  id: string;
  market_id: string;
  market_name: string;
  customer_id?: string;
  customer_name?: string;
  market_area_name?: string; // Added new field
  product: string;
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  forecastLogic: string;
  py_case_equivalent_volume?: number;
  py_gross_sales_value?: number;
  gross_sales_value?: number;
  case_equivalent_volume?: number;
  cy_3m_case_equivalent_volume?: number;
  cy_6m_case_equivalent_volume?: number;
  cy_12m_case_equivalent_volume?: number;
  py_3m_case_equivalent_volume?: number;
  py_6m_case_equivalent_volume?: number;
  py_12m_case_equivalent_volume?: number;
  prev_published_case_equivalent_volume?: number; // LC Volume Total
  lc_gross_sales_value?: number; // LC GSV Total
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  // Optional: Add monthly breakdown for LC if available and needed for row guidance
  prev_published_case_equivalent_volume_months: {
    // Made non-optional
    [key: string]: { value: number; isActual?: boolean };
  };
  lc_gross_sales_value_months?: {
    // Monthly LC GSV for row guidance
    [key: string]: { value: number };
  };
  commentary?: string;
  isLoading?: boolean;
  forecast_status?: string;
  tags?: { tag_id: number; tag_name: string }[];
  [key: string]: any; // Allow dynamic guidance values
  historical_gsv_rate?: number; // Added for LC GSV calculation
  forecast_generation_month_date?: string; // Added for forecast generation date
}

/**
 * Processes raw depletion data and aggregates it into ExtendedForecastData format.
 * This function handles:
 * - Aggregating raw data by market/customer and product
 * - Prioritizing saved versions over drafts
 * - Calculating monthly volumes and totals
 * - Applying logged changes from Redis
 * - Recalculating guidance values
 * 
 * @param data - Raw data array from the API
 * @param loggedChanges - Array of logged changes from Redis
 * @param isCustomerView - Whether this is customer view or market view
 * @param selectedGuidance - Array of selected guidance calculations
 * @returns Processed and aggregated forecast data
 */
export const processRawData = (
  data: any[],
  loggedChanges: any[] = [],
  isCustomerView: boolean,
  selectedGuidance?: Guidance[]
): ExtendedForecastData[] => {
  // Create a map to easily access all raw items for a given key
  const rawItemsByKey = data.reduce((map, item) => {
    const key = isCustomerView
      ? `forecast:${item.customer_id}:${item.variant_size_pack_desc}:${item.customer_id}`
      : `forecast:${item.market_id}:${item.variant_size_pack_desc}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
    return map;
  }, new Map<string, any[]>());

  const finalAggregatedData: { [key: string]: ExtendedForecastData } = {};

  // Process each group (key/items)
  rawItemsByKey.forEach((items: any[], key: string) => {
    if (!items || items.length === 0) return;

    // Instead of using the first item, prioritize saved versions for metadata
    // Sort items to prioritize: saved versions (current_version = 1) first, then draft versions
    const sortedItems = items.sort((a, b) => {
      const aVersion = Number(a.current_version || 0);
      const bVersion = Number(b.current_version || 0);
      return bVersion - aVersion; // Higher version (saved) comes first
    });

    const prioritizedItem = sortedItems[0]!;

    // Aggregate tags from all items in the group
    const tagPairs: { tag_id: number; tag_name: string }[] = [];
    items.forEach((item) => {
      if (Array.isArray(item.tag_id) && Array.isArray(item.tag_name)) {
        item.tag_id.forEach((id: number, idx: number) => {
          if (id != null && item.tag_name[idx] != null) {
            tagPairs.push({ tag_id: id, tag_name: item.tag_name[idx] });
          }
        });
      }
    });
    // Deduplicate by tag_id
    const uniqueTags = Array.from(
      new Map(tagPairs.map((t) => [t.tag_id, t])).values()
    );

    // Initialize the aggregated item for this key using the prioritized item
    const aggregatedItem: ExtendedForecastData = {
      id: key,
      market_id: prioritizedItem.market_id,
      market_name: prioritizedItem.market,
      customer_id: prioritizedItem.customer_id,
      customer_name: prioritizedItem.customer,
      market_area_name: prioritizedItem.market_area_name, // Populate market_area_name
      product: prioritizedItem.variant_size_pack_desc,
      brand: prioritizedItem.brand,
      variant: prioritizedItem.variant,
      variant_id: prioritizedItem.variant_id,
      variant_size_pack_id: prioritizedItem.variant_size_pack_id,
      variant_size_pack_desc: prioritizedItem.variant_size_pack_desc,
      forecastLogic: prioritizedItem.forecast_method || "flat",
      forecast_status: prioritizedItem.forecast_status || "draft",
      forecast_generation_month_date:
        prioritizedItem.forecast_generation_month_date, // Populate forecast_generation_month_date
      commentary: prioritizedItem.comment || undefined, // Use comment from prioritized item
      months: {},
      py_case_equivalent_volume_months: {},
      prev_published_case_equivalent_volume_months: MONTH_NAMES.reduce(
        (acc, month) => {
          acc[month] = { value: 0 };
          return acc;
        },
        {} as { [key: string]: { value: number; isActual?: boolean } }
      ),
      lc_gross_sales_value_months: MONTH_NAMES.reduce((acc, month) => {
        // Initialize monthly LC GSV
        acc[month] = { value: 0 };
        return acc;
      }, {} as { [key: string]: { value: number } }),
      gross_sales_value: 0,
      py_gross_sales_value: 0,
      py_case_equivalent_volume: 0,
      prev_published_case_equivalent_volume: 0, // Initialize LC total
      lc_gross_sales_value: 0, // Initialize LC GSV total
      cy_3m_case_equivalent_volume: 0,
      cy_6m_case_equivalent_volume: 0,
      cy_12m_case_equivalent_volume: 0,
      py_3m_case_equivalent_volume: 0,
      py_6m_case_equivalent_volume: 0,
      py_12m_case_equivalent_volume: 0,
      tags: uniqueTags,
      historical_gsv_rate: Number(prioritizedItem.gsv_rate) || 0, // Capture historical GSV rate from raw data
    };

    // Determine last actual month FOR THIS GROUP
    let lastActualMonthIndex = -1;
    let hasAnyActuals = false;
    items.forEach((item: any) => {
      if (item?.data_type?.includes("actual")) {
        hasAnyActuals = true;
        const monthIndex = (item.month || 0) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          lastActualMonthIndex = Math.max(lastActualMonthIndex, monthIndex);
        }
      }
    });

    // Initialize months structure
    MONTH_NAMES.forEach((month, index) => {
      const shouldBeActual = hasAnyActuals && index <= lastActualMonthIndex;
      aggregatedItem.months[month] = {
        value: 0,
        isActual: shouldBeActual,
        isManuallyModified: false,
      };
      // Initialize PY months structure here as well
      aggregatedItem.py_case_equivalent_volume_months[month] = {
        value: 0,
        isActual: true, // PY months are typically actuals
        isManuallyModified: false,
      };
      // Initialize LC months structure
      aggregatedItem.prev_published_case_equivalent_volume_months[month] = {
        value: 0,
        // isActual for LC is likely always false or not applicable in the same sense
      };
    });

    // Aggregate monthly volumes, GSV, etc. from all items in the group
    // FAILSAFE: Group items by month and take only the latest current_version for each month
    const itemsByMonth = new Map<number, any[]>();
    items.forEach((item: any) => {
      const monthIndex = (item.month || 0) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        if (!itemsByMonth.has(monthIndex)) {
          itemsByMonth.set(monthIndex, []);
        }
        itemsByMonth.get(monthIndex)!.push(item);
      }
    });

    // For each month, use only the item with the highest current_version
    const latestItemsPerMonth: any[] = [];
    itemsByMonth.forEach((monthItems) => {
      if (monthItems.length === 1) {
        latestItemsPerMonth.push(monthItems[0]);
      } else {
        // Multiple items for same month - take the one with highest current_version
        const latestItem = monthItems.reduce((latest, current) => {
          const latestVersion = Number(latest.current_version || 0);
          const currentVersion = Number(current.current_version || 0);
          return currentVersion > latestVersion ? current : latest;
        });
        latestItemsPerMonth.push(latestItem);
      }
    });

    latestItemsPerMonth.forEach((item: any) => {
      const monthIndex = (item.month || 0) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        const monthName = MONTH_NAMES[monthIndex];
        const isManualInputFromDB = Boolean(item.is_manual_input);
        const isCurrentMonth = monthIndex === lastActualMonthIndex + 1;

        // Use projected volume for current month if available and not manually edited,
        // unless it's a 'Control' market area
        const volumeValue =
          isCurrentMonth &&
          aggregatedItem.market_area_name !== "Control" && // Check for Control state
          item.projected_case_equivalent_volume !== undefined &&
          !isManualInputFromDB
            ? item.projected_case_equivalent_volume
            : item.case_equivalent_volume;

        // Set TY Volume (not aggregate since we're using latest per month)
        aggregatedItem.months[monthName]!.value =
          Math.round((volumeValue || 0) * 100) / 100;
        aggregatedItem.months[monthName]!.isManuallyModified =
          isManualInputFromDB;

        // Set PY Volume (not aggregate since we're using latest per month)
        if (item.py_case_equivalent_volume !== undefined) {
          const pyVol = Number(item.py_case_equivalent_volume) || 0;
          aggregatedItem.py_case_equivalent_volume_months[monthName]!.value =
            Math.round(pyVol * 100) / 100;
        }

        // Set LC Volume (not aggregate since we're using latest per month)
        if (item.prev_published_case_equivalent_volume !== undefined) {
          const lcVol = Number(item.prev_published_case_equivalent_volume) || 0;
          aggregatedItem.prev_published_case_equivalent_volume_months[
            monthName
          ]!.value = Math.round(lcVol * 100) / 100;
        }
      }
    });

    // Now aggregate totals from the monthly breakdowns we just set
    items.forEach((item: any) => {
      // Aggregate total GSV
      if (item.gross_sales_value !== undefined) {
        aggregatedItem.gross_sales_value =
          (aggregatedItem.gross_sales_value || 0) +
          (Number(item.gross_sales_value) || 0);
      }
      if (item.py_gross_sales_value !== undefined) {
        aggregatedItem.py_gross_sales_value =
          (aggregatedItem.py_gross_sales_value || 0) +
          (Number(item.py_gross_sales_value) || 0);
      }
    });

    // Calculate total volumes from monthly breakdowns
    aggregatedItem.py_case_equivalent_volume = 0;
    aggregatedItem.prev_published_case_equivalent_volume = 0;
    MONTH_NAMES.forEach((month) => {
      aggregatedItem.py_case_equivalent_volume +=
        aggregatedItem.py_case_equivalent_volume_months[month]?.value || 0;
      if (aggregatedItem.prev_published_case_equivalent_volume !== undefined) {
        aggregatedItem.prev_published_case_equivalent_volume +=
          aggregatedItem.prev_published_case_equivalent_volume_months[month]
            ?.value || 0;
      }
    });

    // Check if any of the latest items have comments and use the most recent comment
    const latestItemsWithComments = latestItemsPerMonth.filter(
      (item) => item.comment
    );
    if (latestItemsWithComments.length > 0) {
      // Use the comment from the item with highest current_version
      const latestCommentItem = latestItemsWithComments.reduce(
        (latest, current) => {
          const latestVersion = Number(latest.current_version || 0);
          const currentVersion = Number(current.current_version || 0);
          return currentVersion > latestVersion ? current : latest;
        }
      );
      aggregatedItem.commentary = latestCommentItem.comment;
    }

    // Find the specific raw item for trend data (last actual or month 1)
    const trendMonthTarget =
      lastActualMonthIndex === -1 ? 1 : lastActualMonthIndex + 1;
    const trendSourceItem = items.find(
      (item: any) => item.month === trendMonthTarget
    );

    // Assign trend values from the specific source item
    if (trendSourceItem) {
      aggregatedItem.cy_3m_case_equivalent_volume =
        Number(trendSourceItem.cy_3m_case_equivalent_volume) || 0;
      aggregatedItem.cy_6m_case_equivalent_volume =
        Number(trendSourceItem.cy_6m_case_equivalent_volume) || 0;
      aggregatedItem.cy_12m_case_equivalent_volume =
        Number(trendSourceItem.cy_12m_case_equivalent_volume) || 0;
      aggregatedItem.py_3m_case_equivalent_volume =
        Number(trendSourceItem.py_3m_case_equivalent_volume) || 0;
      aggregatedItem.py_6m_case_equivalent_volume =
        Number(trendSourceItem.py_6m_case_equivalent_volume) || 0;
      aggregatedItem.py_12m_case_equivalent_volume =
        Number(trendSourceItem.py_12m_case_equivalent_volume) || 0;
    }

    // Store the fully aggregated item
    finalAggregatedData[key] = aggregatedItem;
  });

  // Apply logged changes (these overwrite monthly values)
  loggedChanges.forEach((change) => {
    const key = isCustomerView
      ? `forecast:${change.customer_id}:${change.variant_size_pack_desc}:${change.customer_id}`
      : `forecast:${change.market_id}:${change.variant_size_pack_desc}`;

    if (finalAggregatedData[key]) {
      finalAggregatedData[key].forecastLogic = change.forecastType;
      finalAggregatedData[key].months = change.months;
      if (change.comment) {
        finalAggregatedData[key].commentary = change.comment;
      }
    }
  });

  // Recalculate guidance AFTER all aggregation and logged changes are applied
  const resultData = Object.values(finalAggregatedData).map((item) => {
    item.case_equivalent_volume = calculateTotal(item.months); // Total TY Vol for agg row

    // Calculate gsv_rate (TY rate for agg row)
    const tyVolume = item.case_equivalent_volume || 0;
    const tyGSV = item.gross_sales_value || 0;

    if (tyVolume > 0) {
      item.gsv_rate = tyGSV / tyVolume;
    } else {
      item.gsv_rate = 0; // Avoid division by zero, default rate to 0
    }

    // Calculate py_gsv_rate
    const pyVolume = item.py_case_equivalent_volume || 0;
    const pyGSV = item.py_gross_sales_value || 0;
    if (pyVolume > 0) {
      item.py_gsv_rate = pyGSV / pyVolume;
    } else {
      item.py_gsv_rate = 0;
    }

    // Calculate lc_gross_sales_value
    const lcVolume = item.prev_published_case_equivalent_volume || 0;
    // Use historical_gsv_rate for LC, fallback to current item.gsv_rate if historical_gsv_rate is not available (e.g. 0 or undefined)
    const rateForLc =
      item.historical_gsv_rate && item.historical_gsv_rate > 0
        ? item.historical_gsv_rate
        : item.gsv_rate || 0;
    item.lc_gross_sales_value = lcVolume * rateForLc;

    // Calculate lc_gross_sales_value_months
    if (
      item.prev_published_case_equivalent_volume_months
      // No longer need to check item.gsv_rate directly here as rateForLc handles it
    ) {
      item.lc_gross_sales_value_months = {}; // Ensure it's initialized
      MONTH_NAMES.forEach((month) => {
        item.lc_gross_sales_value_months![month] = {
          value:
            (item.prev_published_case_equivalent_volume_months![month]?.value ||
              0) * rateForLc,
        };
      });
    } else {
      // Fallback if data is missing for monthly LC GSV calculation
      item.lc_gross_sales_value_months = MONTH_NAMES.reduce((acc, month) => {
        acc[month] = { value: 0 };
        return acc;
      }, {} as { [key: string]: { value: number } });
    }

    return recalculateGuidance(item, selectedGuidance || []);
  });

  return resultData;
}; 