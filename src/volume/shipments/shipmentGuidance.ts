import type { ShipmentData } from "../calculations/shipmentCalculations";
import type { Guidance } from "../../redux/slices/userSettingsSlice";
import type { GuidanceForecastOption } from "../../reusableComponents/quantSidebar";
import { MONTH_NAMES, calculateTotal } from "../util/volumeUtil";

// Shipment-specific guidance definitions
export const SHIPMENT_GUIDANCE_OPTIONS: Guidance[] = [
  {
    id: 1001, // Use high IDs to avoid conflicts with regular guidance
    label: "VOL 9L",
    sublabel: "LY",
    value: "shipment_vol_ly",
    displayType: "both",
    availability: "both",
    calculation: {
      type: "direct",
      format: "number",
    },
  },
  {
    id: 1002,
    label: "INV 9L",
    sublabel: "TY",
    value: "shipment_inv_ty",
    displayType: "both",
    availability: "both",
    calculation: {
      type: "direct",
      format: "number",
    },
  },
  {
    id: 1003,
    label: "DDOI",
    sublabel: "TY",
    value: "shipment_ddoi_ty",
    displayType: "row",
    availability: "both",
    calculation: {
      type: "direct",
      format: "number",
    },
  },
  {
    id: 1004,
    label: "LEAD",
    sublabel: "TY",
    value: "shipment_lead",
    displayType: "column",
    availability: "both",
    calculation: {
      type: "direct",
      format: "number",
    },
  },
];

// Shipment guidance options for sidebar (with colors)
export const SHIPMENT_SIDEBAR_GUIDANCE_OPTIONS: GuidanceForecastOption[] = [
  {
    id: 1001,
    label: "VOL 9L",
    sublabel: "LY",
    value: "VOL 9L LY",
    color: "#2196F3",
  },
  {
    id: 1002,
    label: "INV 9L",
    sublabel: "TY",
    value: "INV 9L TY",
    color: "#4CAF50",
  },
  {
    id: 1003,
    label: "DDOI",
    sublabel: "TY",
    value: "DDOI TY",
    color: "#FF9800",
  },
  {
    id: 1004,
    label: "LEAD",
    sublabel: "TY",
    value: "Lead Time",
    color: "#9C27B0",
  },
];

/**
 * Calculate VOL 9L LY - Within 10% of TY number
 */
export const calculateShipmentVolLY = (shipmentData: ShipmentData): number => {
  const tyVolume = calculateTotal(shipmentData.months);
  // Simulate LY being within 10% of TY
  const variation = (Math.random() - 0.5) * 0.2; // -10% to +10%
  return Math.round((tyVolume * (1 + variation)) * 10) / 10;
};

/**
 * Calculate INV 9L TY - Current month's forecast * 1.2
 */
export const calculateShipmentInvTY = (shipmentData: ShipmentData): number => {
  // Find the current month (first forecast month after actuals)
  let currentMonthValue = 0;
  let foundCurrentMonth = false;
  
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const month = MONTH_NAMES[i];
    const monthData = shipmentData.months[month];
    
    if (monthData && !monthData.isActual && !foundCurrentMonth) {
      currentMonthValue = monthData.value;
      foundCurrentMonth = true;
      break;
    }
  }
  
  return Math.round((currentMonthValue * 1.2) * 10) / 10;
};

/**
 * Calculate DDOI TY - Days of Inventory on Hand (30, 60, or 90 days)
 */
export const calculateShipmentDDOI = (shipmentData: ShipmentData): number => {
  // Simulate different DDOI values based on inventory levels
  const inventory = shipmentData.inventory_on_hand || 0;
  const monthlyVolume = calculateTotal(shipmentData.months) / 12; // Average monthly
  
  if (monthlyVolume === 0) return 30; // Default
  
  const daysOfInventory = (inventory / monthlyVolume) * 30; // Convert to days
  
  // Round to nearest 30, 60, or 90 days
  if (daysOfInventory <= 45) return 30;
  if (daysOfInventory <= 75) return 60;
  return 90;
};

/**
 * Calculate Lead Time - 30-60 days
 */
export const calculateShipmentLead = (shipmentData: ShipmentData): number => {
  // Simulate lead time based on product characteristics
  const productName = shipmentData.product || "";
  
  // Simulate different lead times based on product complexity
  if (productName.includes("Premium") || productName.includes("Limited")) {
    return 45 + Math.round(Math.random() * 15); // 45-60 days
  }
  
  return 30 + Math.round(Math.random() * 15); // 30-45 days
};

/**
 * Calculate monthly DDOI values for row guidance
 */
export const calculateMonthlyDDOI = (shipmentData: ShipmentData): { [month: string]: number } => {
  const monthlyDDOI: { [month: string]: number } = {};
  const baseDDOI = calculateShipmentDDOI(shipmentData);
  
  MONTH_NAMES.forEach((month) => {
    // Add some variation to monthly DDOI
    const variation = (Math.random() - 0.5) * 10; // ±5 days variation
    monthlyDDOI[month] = Math.max(15, Math.round(baseDDOI + variation));
  });
  
  return monthlyDDOI;
};

/**
 * Apply shipment guidance calculations to shipment data
 */
export const applyShipmentGuidance = (
  shipmentData: ShipmentData,
  selectedGuidance: Guidance[]
): ShipmentData => {
  const updatedData = { ...shipmentData };
  
  selectedGuidance.forEach((guidance) => {
    const guidanceKey = `guidance_${guidance.id}`;
    
    switch (guidance.id) {
      case 1001: // VOL 9L LY
        updatedData[guidanceKey] = calculateShipmentVolLY(shipmentData);
        break;
      case 1002: // INV 9L TY
        updatedData[guidanceKey] = calculateShipmentInvTY(shipmentData);
        break;
      case 1003: // DDOI TY
        updatedData[guidanceKey] = calculateShipmentDDOI(shipmentData);
        break;
      case 1004: // Lead
        updatedData[guidanceKey] = calculateShipmentLead(shipmentData);
        break;
      default:
        break;
    }
  });
  
  return updatedData;
};

/**
 * Get shipment guidance data for sidebar display
 */
export const getShipmentGuidanceForSidebar = (
  shipmentData: ShipmentData
): { [key: string]: number[] } => {
  const guidanceData: { [key: string]: number[] } = {};
  
  // Calculate all shipment guidance values as arrays (for monthly data)
  const volLY = calculateShipmentVolLY(shipmentData);
  const invTY = calculateShipmentInvTY(shipmentData);
  const ddoiTY = calculateShipmentDDOI(shipmentData);
  const leadTime = calculateShipmentLead(shipmentData);
  
  // For now, return the same value for all 12 months
  // In the future, this could be expanded to have different monthly values
  guidanceData["VOL 9L LY"] = Array(12).fill(volLY);
  guidanceData["INV 9L TY"] = Array(12).fill(invTY);
  guidanceData["DDOI TY"] = Array(12).fill(ddoiTY);
  guidanceData["Lead Time"] = Array(12).fill(leadTime);
  
  return guidanceData;
};

/**
 * Calculate row guidance monthly data for shipments
 */
export const calculateShipmentRowGuidanceMonthlyData = (
  shipmentData: ShipmentData,
  guidance: Guidance
): { [month: string]: number } | null => {
  switch (guidance.id) {
    case 1001: // VOL 9L LY - return monthly LY volumes
      const lyTotal = calculateShipmentVolLY(shipmentData);
      const monthlyLY: { [month: string]: number } = {};
      
      MONTH_NAMES.forEach((month) => {
        const tyValue = shipmentData.months[month]?.value || 0;
        const lyRatio = lyTotal / calculateTotal(shipmentData.months);
        monthlyLY[month] = Math.round((tyValue * lyRatio) * 10) / 10;
      });
      
      return monthlyLY;
      
    case 1003: // DDOI TY - return monthly DDOI values
      return calculateMonthlyDDOI(shipmentData);
      
    default:
      return null;
  }
}; 