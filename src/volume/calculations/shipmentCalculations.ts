import type { ExtendedForecastData } from "../depletions/depletions";
import type { Guidance } from "../../redux/slices/userSettingsSlice";
import { processMonthData, calculateTotal } from "../util/volumeUtil";
import { applyShipmentGuidance } from "../shipments/shipmentGuidance";

// Shipment-specific interface extending the base forecast data
export interface ShipmentData extends ExtendedForecastData {
  // Shipment-specific fields for future use
  inventory_on_hand?: number;
  target_days_on_hand?: number;
  calculated_shipment_need?: number;
  manual_override: boolean;
  override_reason?: string;
  // Override to make required
  case_equivalent_volume: number;
}

/**
 * Process raw depletion data and convert it to shipment data for prototype
 * This function uses depletion data as a stand-in for actual shipment calculations
 * In production, this would calculate: inventory - forecast = shipment need
 */
export const processShipmentData = (
  rawData: any[],
  loggedChanges: any[] = [],
  isCustomerView: boolean = false,
  selectedGuidance?: Guidance[]
): ShipmentData[] => {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Group raw data by the appropriate key
  const groupedData = rawData.reduce((acc, item) => {
    const key = isCustomerView
      ? `shipment:${item.customer_id}:${item.variant_size_pack_desc}`
      : `shipment:${item.market_id}:${item.variant_size_pack_desc}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  // Process each group into shipment data
  const processedData: ShipmentData[] = Object.entries(groupedData).map(
    ([key, items]) => {
      const itemsArray = items as any[]; // Type assertion for the items
      const firstItem = itemsArray[0];
      
      // Process month data from the raw items
      const months = processMonthData(itemsArray);
      
      // For prototype: simulate shipment data based on depletion data
      // In production, this would be: inventory - depletion_forecast = shipment_need
      const simulatedShipmentMonths = Object.keys(months).reduce((acc, month) => {
        const originalValue = months[month].value;
        // Simulate shipment calculation: add some inventory buffer logic
        // This is just for prototype - real logic would come from SQL
        const simulatedShipmentValue = originalValue * 1.1; // 10% buffer for demo
        
        acc[month] = {
          ...months[month],
          value: Math.round(simulatedShipmentValue * 10) / 10,
        };
        return acc;
      }, {} as typeof months);

      // Create base shipment data object
      let shipmentRow: ShipmentData = {
        id: key,
        market_id: firstItem.market_id,
        market_name: firstItem.market,
        customer_id: firstItem.customer_id,
        customer_name: firstItem.customer,
        market_area_name: firstItem.market_area_name,
        product: firstItem.variant_size_pack_desc,
        brand: firstItem.brand,
        variant: firstItem.variant,
        variant_id: firstItem.variant_id,
        variant_size_pack_id: firstItem.variant_size_pack_id,
        variant_size_pack_desc: firstItem.variant_size_pack_desc,
        forecastLogic: "Shipment_Calc", // Fixed logic for shipments
        months: simulatedShipmentMonths,
        prev_published_case_equivalent_volume_months: months, // Keep original for comparison
        tags: firstItem.tags,
        forecast_status: firstItem.forecast_status,
        forecast_generation_month_date: firstItem.forecast_generation_month_date,
        
        // Shipment-specific fields (prototype values)
        inventory_on_hand: Math.round(Math.random() * 1000), // Simulated inventory
        target_days_on_hand: 30, // Default target
        manual_override: false,
        override_reason: undefined,
        
        // Calculate totals
        case_equivalent_volume: calculateTotal(simulatedShipmentMonths),
        py_case_equivalent_volume: firstItem.py_case_equivalent_volume,
        gross_sales_value: firstItem.gross_sales_value,
        py_gross_sales_value: firstItem.py_gross_sales_value,
        historical_gsv_rate: firstItem.historical_gsv_rate,
        
        // Additional fields from ExtendedForecastData
        cy_3m_case_equivalent_volume: firstItem.cy_3m_case_equivalent_volume,
        cy_6m_case_equivalent_volume: firstItem.cy_6m_case_equivalent_volume,
        cy_12m_case_equivalent_volume: firstItem.cy_12m_case_equivalent_volume,
        py_3m_case_equivalent_volume: firstItem.py_3m_case_equivalent_volume,
        py_6m_case_equivalent_volume: firstItem.py_6m_case_equivalent_volume,
        py_12m_case_equivalent_volume: firstItem.py_12m_case_equivalent_volume,
        prev_published_case_equivalent_volume: firstItem.prev_published_case_equivalent_volume,
        lc_gross_sales_value: firstItem.lc_gross_sales_value,
        lc_gross_sales_value_months: firstItem.lc_gross_sales_value_months,
        commentary: undefined,
        isLoading: false,
      };

      // Apply any logged changes for this specific row
      const loggedChange = loggedChanges.find((change) => {
        const changeKey = isCustomerView
          ? `shipment:${change.customer_id}:${change.variant_size_pack_desc}`
          : `shipment:${change.market_id}:${change.variant_size_pack_desc}`;
        return changeKey === key;
      });

      if (loggedChange) {
        shipmentRow = {
          ...shipmentRow,
          months: loggedChange.months || shipmentRow.months,
          commentary: loggedChange.comment || shipmentRow.commentary,
          manual_override: true,
          override_reason: loggedChange.comment,
        };
        // Recalculate total after applying logged changes
        shipmentRow.case_equivalent_volume = calculateTotal(shipmentRow.months);
      }

      // Apply guidance calculations if provided
      if (selectedGuidance && selectedGuidance.length > 0) {
        shipmentRow = applyShipmentGuidance(shipmentRow, selectedGuidance);
      }

      return shipmentRow;
    }
  );

  return processedData;
};

/**
 * Calculate shipment needs based on inventory and depletion forecast
 * This is a placeholder for the actual SQL-based calculation
 */
export const calculateShipmentNeed = (
  inventory: number,
  depletionForecast: number,
  targetDaysOnHand: number = 30
): number => {
  // Prototype calculation logic
  // In production: inventory - (depletion_forecast * target_days_factor)
  const dailyDepletion = depletionForecast / 30; // Assume monthly forecast
  const targetInventory = dailyDepletion * targetDaysOnHand;
  const shipmentNeed = Math.max(0, targetInventory - inventory);
  
  return Math.round(shipmentNeed * 10) / 10;
};

/**
 * Apply manual override to shipment data
 */
export const applyShipmentOverride = (
  shipmentData: ShipmentData,
  overrideValues: { [month: string]: number },
  reason?: string
): ShipmentData => {
  const updatedMonths = { ...shipmentData.months };
  
  Object.entries(overrideValues).forEach(([month, value]) => {
    if (updatedMonths[month]) {
      updatedMonths[month] = {
        ...updatedMonths[month],
        value: Math.round(value * 10) / 10,
        isManuallyModified: true,
      };
    }
  });

  return {
    ...shipmentData,
    months: updatedMonths,
    case_equivalent_volume: calculateTotal(updatedMonths),
    manual_override: true,
    override_reason: reason,
    commentary: reason,
  };
};
