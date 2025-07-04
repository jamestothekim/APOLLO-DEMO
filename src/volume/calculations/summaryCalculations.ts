import type { RawDepletionForecastItem } from "../../redux/slices/depletionSlice.js";
import type { RestoredState } from "../../redux/slices/pendingChangesSlice.js";
import type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from "../summary/summary.js";
import { MarketData } from "../volumeForecast.js";
import { MONTH_NAMES } from "../util/volumeUtil.js";
import type { ExtendedForecastData as ProcessedRow } from "./depletionCalculations";

// Export interfaces for use by other files
export interface AggregationResult {
  variantsAggArray: SummaryVariantAggregateData[];
  brandAggsMap: Map<string, SummaryBrandAggregateData>;
  maxActualIndex: number;
}

// New interface for the centralized aggregation result
export interface CentralizedAggregationResult {
  variantsAggArray: SummaryVariantAggregateData[];
  brandAggsMap: Map<string, SummaryBrandAggregateData>;
  maxActualIndex: number;
}

// Round to a single decimal place so Summary values retain tenths precision
function roundToTenth(num: number | null | undefined): number {
  const n = num || 0;
  return Math.round(n * 10) / 10;
}

interface MarketLevelBucket {
  market_id: string;
  market_name?: string;
  brand?: string;
  variant?: string;
  variant_id?: string;
  variant_size_pack_desc: string;
  month: number;
  case_equivalent_volume: number;
  py_case_equivalent_volume: number;
  prev_published_case_equivalent_volume: number;
  gross_sales_value: number;
  py_gross_sales_value: number;
  data_type?: string;
  is_manual_input?: boolean;
}

/**
 * Aggregates raw volume data into summary format for brand and variant level reporting.
 * This function handles:
 * - Aggregating market and customer managed data
 * - Creating variant and brand level summaries
 * - Applying pending changes from Redis
 * - Calculating GSV rates and LC values
 * 
 * @param rawVolumeData - Raw market volume data
 * @param customerRawVolumeData - Raw customer volume data
 * @param marketData - Market metadata and settings
 * @param pendingChangesMap - Pending changes from Redis
 * @returns Aggregated summary data with variants, brands, and max actual month index
 */
export const aggregateSummaryData = (
  rawVolumeData: RawDepletionForecastItem[],
  customerRawVolumeData: RawDepletionForecastItem[],
  marketData: MarketData[],
  pendingChangesMap: Map<string, RestoredState>
): AggregationResult => {
  let maxActualIndex = -1;
  const marketLevelBuckets: { [key: string]: MarketLevelBucket } = {};

  const customerToMarketMap = new Map<string, string>();
  marketData.forEach((market) => {
    market.customers?.forEach((customer) => {
      customerToMarketMap.set(customer.customer_id, market.market_id);
    });
  });

  marketData.forEach((market) => {
    const marketId = market.market_id;
    const marketName = market.market_name;
    const managedBy = market.settings?.managed_by;

    if (managedBy === "Market") {
      rawVolumeData
        .filter((item) => item.market_id === marketId)
        .forEach((item) => {
          if (!item.variant_size_pack_desc || !item.month) return;
          const key = `${marketId}_${item.variant_size_pack_desc}_${item.month}`;
          if (!marketLevelBuckets[key]) {
            marketLevelBuckets[key] = {
              market_id: marketId,
              market_name: marketName,
              brand: item.brand,
              variant: item.variant,
              variant_id: item.variant_id,
              variant_size_pack_desc: item.variant_size_pack_desc,
              month: item.month,
              case_equivalent_volume: 0,
              py_case_equivalent_volume: 0,
              prev_published_case_equivalent_volume: 0,
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type,
              is_manual_input: item.is_manual_input,
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].prev_published_case_equivalent_volume +=
            Number(item.prev_published_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;

          if (item.data_type?.includes("actual")) {
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    } else if (managedBy === "Customer") {
      customerRawVolumeData
        .filter(
          (item) => customerToMarketMap.get(item.customer_id || "") === marketId
        )
        .forEach((item) => {
          if (!item.variant_size_pack_desc || !item.month) return;
          const key = `${marketId}_${item.variant_size_pack_desc}_${item.month}`;
          if (!marketLevelBuckets[key]) {
            marketLevelBuckets[key] = {
              market_id: marketId,
              market_name: marketName,
              brand: item.brand,
              variant: item.variant,
              variant_id: item.variant_id,
              variant_size_pack_desc: item.variant_size_pack_desc,
              month: item.month,
              case_equivalent_volume: 0,
              py_case_equivalent_volume: 0,
              prev_published_case_equivalent_volume: 0,
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type,
              is_manual_input: item.is_manual_input,
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].prev_published_case_equivalent_volume +=
            Number(item.prev_published_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;
          if (item.data_type?.includes("actual")) {
            marketLevelBuckets[key].data_type = "actual_complete";
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    }
  });

  pendingChangesMap.forEach((change, redisKey) => {
    const parts = redisKey.split(":");
    if (parts.length < 3) return;

    let marketId: string | undefined;
    let variantDesc = parts[2];
    const potentialId = parts[1];

    if (parts.length === 4 && parts[3] === potentialId) {
      marketId = customerToMarketMap.get(potentialId);
    } else if (!customerToMarketMap.has(potentialId)) {
      if (marketData.some((m) => m.market_id === potentialId)) {
        marketId = potentialId;
      }
    }

    if (!marketId) {
      return;
    }

    Object.entries(change.months).forEach(([monthName, monthData]) => {
      const typedMonthName = monthName as (typeof MONTH_NAMES)[number];
      const monthNum = MONTH_NAMES.indexOf(typedMonthName) + 1;
      if (monthNum > 0) {
        const bucketKey = `${marketId}_${variantDesc}_${monthNum}`;
        if (marketLevelBuckets[bucketKey]) {
          marketLevelBuckets[bucketKey].case_equivalent_volume =
            monthData.value;
          marketLevelBuckets[bucketKey].prev_published_case_equivalent_volume =
            monthData.value;
          marketLevelBuckets[bucketKey].is_manual_input =
            monthData.isManuallyModified ?? change.isManualEdit;
          if (monthNum - 1 > maxActualIndex) {
            marketLevelBuckets[bucketKey].data_type = "forecast";
          }
        }
      }
    });
  });

  const variantAggregation: {
    [variantKey: string]: SummaryVariantAggregateData;
  } = {};

  Object.values(marketLevelBuckets).forEach((bucket) => {
    const brand = bucket.brand;
    const variantName = bucket.variant;
    const variantId = bucket.variant_id;
    if (
      !brand ||
      !variantName ||
      !bucket.market_id ||
      !bucket.variant_size_pack_desc
    )
      return;

    const variantKey = variantId
      ? `${brand}_${variantId}`
      : `${brand}_${variantName}`;
    const monthIndex = bucket.month;
    if (monthIndex < 1 || monthIndex > 12) return;
    const monthName = MONTH_NAMES[monthIndex - 1];

    const volume = bucket.case_equivalent_volume;
    const py_volume = bucket.py_case_equivalent_volume;
    const gsv_ty_from_bucket = bucket.gross_sales_value;
    const gsv_py_from_bucket = bucket.py_gross_sales_value;

    if (!variantAggregation[variantKey]) {
      variantAggregation[variantKey] = {
        id: variantKey,
        brand: brand,
        variant_id: variantId,
        variant: variantName,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      };
    }

    variantAggregation[variantKey].months[monthName] += volume;
    variantAggregation[variantKey].months_py_volume[monthName] += py_volume;
    variantAggregation[variantKey].total_gsv_ty += gsv_ty_from_bucket;
    variantAggregation[variantKey].total_gsv_py += gsv_py_from_bucket;

    const lc_volume = bucket.prev_published_case_equivalent_volume || 0;
    variantAggregation[variantKey].months_lc_volume[monthName] =
      (variantAggregation[variantKey].months_lc_volume[monthName] || 0) +
      lc_volume;
  });

  let variantsAggArray = Object.values(variantAggregation)
    .map((variantAggRow) => {
      variantAggRow.total = Object.values(variantAggRow.months).reduce(
        (s: number, v: number) => s + v,
        0
      );
      variantAggRow.total_py_volume = Object.values(
        variantAggRow.months_py_volume
      ).reduce((s: number, v: number) => s + v, 0);

      variantAggRow.total = roundToTenth(variantAggRow.total);
      variantAggRow.total_py_volume = roundToTenth(
        variantAggRow.total_py_volume
      );
      variantAggRow.prev_published_case_equivalent_volume = roundToTenth(
        (Object.values(variantAggRow.months_lc_volume) as number[]).reduce(
          (s: number, v: number) => s + v,
          0
        )
      );

      variantAggRow.total_gsv_ty = roundToTenth(variantAggRow.total_gsv_ty);
      variantAggRow.total_gsv_py = roundToTenth(variantAggRow.total_gsv_py);

      MONTH_NAMES.forEach((m) => {
        variantAggRow.months[m] = roundToTenth(variantAggRow.months[m]);
        variantAggRow.months_py_volume[m] = roundToTenth(
          variantAggRow.months_py_volume[m]
        );
        variantAggRow.months_lc_volume[m] = roundToTenth(
          variantAggRow.months_lc_volume[m] || 0
        );
      });

      const variantGsvRate =
        variantAggRow.total > 0
          ? variantAggRow.total_gsv_ty / variantAggRow.total
          : 0;
      variantAggRow.gsv_rate = variantGsvRate;

      variantAggRow.lc_gross_sales_value = roundToTenth(
        variantAggRow.prev_published_case_equivalent_volume * variantGsvRate
      );

      variantAggRow.months_lc_gsv = {};

      MONTH_NAMES.forEach((m) => {
        variantAggRow.months_lc_gsv![m] = roundToTenth(
          (variantAggRow.months_lc_volume[m] || 0) * variantGsvRate
        );
      });

      // === Add rolling period aggregates for Trends guidance ===
      const sumRolling = (
        values: { [key: string]: number },
        n: number,
        endIdx: number
      ) => {
        let sum = 0;
        for (let i = Math.max(0, endIdx - n + 1); i <= endIdx; i++) {
          const mName = MONTH_NAMES[i];
          sum += values[mName] || 0;
        }
        return sum;
      };

      variantAggRow.cy_3m_case_equivalent_volume = sumRolling(
        variantAggRow.months,
        3,
        maxActualIndex
      );
      variantAggRow.cy_6m_case_equivalent_volume = sumRolling(
        variantAggRow.months,
        6,
        maxActualIndex
      );
      variantAggRow.cy_12m_case_equivalent_volume = sumRolling(
        variantAggRow.months,
        12,
        maxActualIndex
      );

      variantAggRow.py_3m_case_equivalent_volume = sumRolling(
        variantAggRow.months_py_volume,
        3,
        maxActualIndex
      );
      variantAggRow.py_6m_case_equivalent_volume = sumRolling(
        variantAggRow.months_py_volume,
        6,
        maxActualIndex
      );
      variantAggRow.py_12m_case_equivalent_volume = sumRolling(
        variantAggRow.months_py_volume,
        12,
        maxActualIndex
      );

      variantAggRow.lastActualIdx = maxActualIndex;

      return variantAggRow;
    })
    .filter((row) => Math.abs(row.total) > 0.001);

  const brandAggsMap = new Map<string, SummaryBrandAggregateData>();
  variantsAggArray.forEach((variantRow) => {
    const brandKey = variantRow.brand;
    if (!brandAggsMap.has(brandKey)) {
      brandAggsMap.set(brandKey, {
        id: brandKey,
        brand: brandKey,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      });
    }
    const brandAgg = brandAggsMap.get(brandKey)!;

    // Add totals once per variant (outside the monthly loop)
    brandAgg.total += variantRow.total;
    brandAgg.total_py_volume += variantRow.total_py_volume;
    brandAgg.total_gsv_ty += variantRow.total_gsv_ty;
    brandAgg.total_gsv_py += variantRow.total_gsv_py;
    brandAgg.prev_published_case_equivalent_volume +=
      variantRow.prev_published_case_equivalent_volume;
    brandAgg.lc_gross_sales_value += variantRow.lc_gross_sales_value;

    // Add monthly values (inside the monthly loop)
    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] += variantRow.months[m];
      brandAgg.months_py_volume[m] += variantRow.months_py_volume[m];
      brandAgg.months_lc_volume[m] =
        (brandAgg.months_lc_volume[m] || 0) +
        (variantRow.months_lc_volume[m] || 0);
      if (variantRow.months_lc_gsv && brandAgg.months_lc_gsv) {
        brandAgg.months_lc_gsv[m] =
          (brandAgg.months_lc_gsv[m] || 0) + (variantRow.months_lc_gsv[m] || 0);
      }
    });

    brandAgg.lastActualIdx = maxActualIndex;
  });

  brandAggsMap.forEach((brandAgg) => {
    brandAgg.total = roundToTenth(brandAgg.total);
    brandAgg.total_py_volume = roundToTenth(brandAgg.total_py_volume);
    brandAgg.total_gsv_ty = roundToTenth(brandAgg.total_gsv_ty);
    brandAgg.total_gsv_py = roundToTenth(brandAgg.total_gsv_py);
    brandAgg.prev_published_case_equivalent_volume = roundToTenth(
      brandAgg.prev_published_case_equivalent_volume
    );
    brandAgg.lc_gross_sales_value = roundToTenth(brandAgg.lc_gross_sales_value);

    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] = roundToTenth(brandAgg.months[m]);
      brandAgg.months_py_volume[m] = roundToTenth(brandAgg.months_py_volume[m]);
      brandAgg.months_lc_volume[m] = roundToTenth(
        brandAgg.months_lc_volume[m] || 0
      );
      if (brandAgg.months_lc_gsv) {
        brandAgg.months_lc_gsv[m] = roundToTenth(
          brandAgg.months_lc_gsv[m] || 0
        );
      }
    });

    // === Rolling period aggregates for Trends guidance at brand level ===
    const sumRollingB = (
      values: { [key: string]: number },
      n: number,
      endIdx: number
    ) => {
      let s = 0;
      for (let i = Math.max(0, endIdx - n + 1); i <= endIdx; i++) {
        const mName = MONTH_NAMES[i];
        s += values[mName] || 0;
      }
      return s;
    };
    brandAgg.cy_3m_case_equivalent_volume = sumRollingB(
      brandAgg.months,
      3,
      maxActualIndex
    );
    brandAgg.cy_6m_case_equivalent_volume = sumRollingB(
      brandAgg.months,
      6,
      maxActualIndex
    );
    brandAgg.cy_12m_case_equivalent_volume = sumRollingB(
      brandAgg.months,
      12,
      maxActualIndex
    );
    brandAgg.py_3m_case_equivalent_volume = sumRollingB(
      brandAgg.months_py_volume,
      3,
      maxActualIndex
    );
    brandAgg.py_6m_case_equivalent_volume = sumRollingB(
      brandAgg.months_py_volume,
      6,
      maxActualIndex
    );
    brandAgg.py_12m_case_equivalent_volume = sumRollingB(
      brandAgg.months_py_volume,
      12,
      maxActualIndex
    );

    brandAgg.lastActualIdx = maxActualIndex;
  });

  return {
    variantsAggArray,
    brandAggsMap,
    maxActualIndex,
  };
};

// -----------------------------------------------------------------------------
// NEW: Centralized Aggregation from Processed Rows (Single Source of Truth)
// -----------------------------------------------------------------------------

/**
 * Aggregates already-processed forecast rows into summary format.
 * This replaces the legacy aggregateSummaryData function to ensure
 * Summary and Depletions always use the same underlying data.
 * 
 * @param processedRows - Fully processed forecast rows (with Redis overlays applied)
 * @param maxActualIdxFromSlice - Last actual month index from the slice
 * @returns Summary aggregates matching the existing format
 */
export const aggregateFromProcessedRows = (
  processedRows: ProcessedRow[],
  maxActualIdxFromSlice: number = -1
): CentralizedAggregationResult => {
  const variantAggregation: { [k: string]: SummaryVariantAggregateData } = {};
  let maxActualIndex = maxActualIdxFromSlice;

  // Process each row to build variant-level aggregates
  processedRows.forEach((row) => {
    // Skip rows without required data
    if (!row || !row.months || !row.brand || !row.variant) {
      return;
    }

    const { brand, variant, variant_id } = row;
    const variantKey = variant_id ? `${brand}_${variant_id}` : `${brand}_${variant}`;

    // Initialize variant aggregate if it doesn't exist
    if (!variantAggregation[variantKey]) {
      variantAggregation[variantKey] = {
        id: variantKey,
        brand,
        variant_id,
        variant,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_py_volume: 0,
        months_gsv_ty: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_gsv_ty: 0,
        months_gsv_py: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      } as SummaryVariantAggregateData;
    }

    const variantAgg = variantAggregation[variantKey];

    // Aggregate monthly data
    MONTH_NAMES.forEach((m) => {
      // Add additional safety checks for month data
      const monthValue = row.months?.[m]?.value;
      if (typeof monthValue === 'number') {
        variantAgg.months[m] += monthValue;
      }
      
      // PY & LC volumes
      variantAgg.months_py_volume[m] += row.py_case_equivalent_volume_months?.[m]?.value || 0;
      variantAgg.months_lc_volume[m] += row.prev_published_case_equivalent_volume_months?.[m]?.value || 0;
      
      // GSV months (use LC GSV months as base for TY GSV)
      if (variantAgg.months_gsv_ty && row.lc_gross_sales_value_months?.[m]) {
        variantAgg.months_gsv_ty[m] += row.lc_gross_sales_value_months[m].value || 0;
      }
      if (variantAgg.months_lc_gsv && row.lc_gross_sales_value_months?.[m]) {
        variantAgg.months_lc_gsv[m] += row.lc_gross_sales_value_months[m].value || 0;
      }
    });

    // Aggregate totals
    variantAgg.total += row.case_equivalent_volume || 0;
    variantAgg.total_py_volume += row.py_case_equivalent_volume || 0;
    variantAgg.prev_published_case_equivalent_volume += row.prev_published_case_equivalent_volume || 0;
    variantAgg.total_gsv_ty += row.gross_sales_value || 0;
    variantAgg.total_gsv_py += row.py_gross_sales_value || 0;
    variantAgg.lc_gross_sales_value += row.lc_gross_sales_value || 0;

    // Update last actual index if row months indicate more actuals
    MONTH_NAMES.forEach((m, idx) => {
      if (row.months?.[m]?.isActual) {
        maxActualIndex = Math.max(maxActualIndex, idx);
      }
    });
  });

  // Round and finalize variant aggregates
  let variantsAggArray = Object.values(variantAggregation).map((v) => {
    v.total = roundToTenth(v.total);
    v.total_py_volume = roundToTenth(v.total_py_volume);
    v.prev_published_case_equivalent_volume = roundToTenth(v.prev_published_case_equivalent_volume);
    v.total_gsv_ty = roundToTenth(v.total_gsv_ty);
    v.total_gsv_py = roundToTenth(v.total_gsv_py);
    v.lc_gross_sales_value = roundToTenth(v.lc_gross_sales_value);
    
    MONTH_NAMES.forEach((m) => {
      v.months[m] = roundToTenth(v.months[m]);
      v.months_py_volume[m] = roundToTenth(v.months_py_volume[m]);
      v.months_lc_volume[m] = roundToTenth(v.months_lc_volume[m]);
      if (v.months_gsv_ty) v.months_gsv_ty[m] = roundToTenth(v.months_gsv_ty[m]);
      if (v.months_lc_gsv) v.months_lc_gsv[m] = roundToTenth(v.months_lc_gsv[m]);
    });
    
    // Add rolling period aggregates for Trends guidance
    const sumRolling = (values: { [key: string]: number }, n: number, endIdx: number) => {
      let sum = 0;
      for (let i = Math.max(0, endIdx - n + 1); i <= endIdx; i++) {
        const mName = MONTH_NAMES[i];
        sum += values[mName] || 0;
      }
      return sum;
    };
    
    v.cy_3m_case_equivalent_volume = sumRolling(v.months, 3, maxActualIndex);
    v.cy_6m_case_equivalent_volume = sumRolling(v.months, 6, maxActualIndex);
    v.cy_12m_case_equivalent_volume = sumRolling(v.months, 12, maxActualIndex);
    v.py_3m_case_equivalent_volume = sumRolling(v.months_py_volume, 3, maxActualIndex);
    v.py_6m_case_equivalent_volume = sumRolling(v.months_py_volume, 6, maxActualIndex);
    v.py_12m_case_equivalent_volume = sumRolling(v.months_py_volume, 12, maxActualIndex);
    v.lastActualIdx = maxActualIndex;
    
    return v;
  }).filter((row) => Math.abs(row.total) > 0.001);

  // Build brand aggregates from variant aggregates
  const brandAggsMap = new Map<string, SummaryBrandAggregateData>();
  
  variantsAggArray.forEach((variantRow) => {
    const brandKey = variantRow.brand;
    if (!brandAggsMap.has(brandKey)) {
      brandAggsMap.set(brandKey, {
        id: brandKey,
        brand: brandKey,
        months: MONTH_NAMES.reduce((a, m) => ({ ...a, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce((a, m) => ({ ...a, [m]: 0 }), {}),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce((a, m) => ({ ...a, [m]: 0 }), {}),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((a, m) => ({ ...a, [m]: 0 }), {}),
      });
    }
    
    const brandAgg = brandAggsMap.get(brandKey)!;
    brandAgg.total += variantRow.total;
    brandAgg.total_py_volume += variantRow.total_py_volume;
    brandAgg.total_gsv_ty += variantRow.total_gsv_ty;
    brandAgg.total_gsv_py += variantRow.total_gsv_py;
    brandAgg.prev_published_case_equivalent_volume += variantRow.prev_published_case_equivalent_volume;
    brandAgg.lc_gross_sales_value += variantRow.lc_gross_sales_value;
    
    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] += variantRow.months[m];
      brandAgg.months_py_volume![m] = (brandAgg.months_py_volume![m] || 0) + variantRow.months_py_volume[m];
      brandAgg.months_lc_volume[m] += variantRow.months_lc_volume[m];
      if (brandAgg.months_lc_gsv && variantRow.months_lc_gsv) {
        brandAgg.months_lc_gsv[m] += variantRow.months_lc_gsv[m];
      }
    });
    brandAgg.lastActualIdx = maxActualIndex;
  });

  // Round brand aggregates
  brandAggsMap.forEach((b) => {
    b.total = roundToTenth(b.total);
    b.total_py_volume = roundToTenth(b.total_py_volume);
    b.total_gsv_ty = roundToTenth(b.total_gsv_ty);
    b.total_gsv_py = roundToTenth(b.total_gsv_py);
    b.prev_published_case_equivalent_volume = roundToTenth(b.prev_published_case_equivalent_volume);
    b.lc_gross_sales_value = roundToTenth(b.lc_gross_sales_value);
    
    MONTH_NAMES.forEach((m) => {
      b.months[m] = roundToTenth(b.months[m]);
      if (b.months_py_volume) b.months_py_volume[m] = roundToTenth(b.months_py_volume[m]);
      b.months_lc_volume[m] = roundToTenth(b.months_lc_volume[m]);
      if (b.months_lc_gsv) b.months_lc_gsv[m] = roundToTenth(b.months_lc_gsv[m]);
    });
    
    // Add rolling period aggregates for brand level
    const sumRollingB = (values: { [key: string]: number }, n: number, endIdx: number) => {
      let s = 0;
      for (let i = Math.max(0, endIdx - n + 1); i <= endIdx; i++) {
        const mName = MONTH_NAMES[i];
        s += values[mName] || 0;
      }
      return s;
    };
    
    b.cy_3m_case_equivalent_volume = sumRollingB(b.months, 3, maxActualIndex);
    b.cy_6m_case_equivalent_volume = sumRollingB(b.months, 6, maxActualIndex);
    b.cy_12m_case_equivalent_volume = sumRollingB(b.months, 12, maxActualIndex);
    b.py_3m_case_equivalent_volume = sumRollingB(b.months_py_volume || {}, 3, maxActualIndex);
    b.py_6m_case_equivalent_volume = sumRollingB(b.months_py_volume || {}, 6, maxActualIndex);
    b.py_12m_case_equivalent_volume = sumRollingB(b.months_py_volume || {}, 12, maxActualIndex);
    b.lastActualIdx = maxActualIndex;
  });

  return {
    variantsAggArray,
    brandAggsMap,
    maxActualIndex,
  };
};
