// Data generation utilities following scanPlanner pattern

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getRandomBetween(min: number, max: number, decimals: number = 0): number {
  const rand = Math.random() * (max - min) + min;
  return parseFloat(rand.toFixed(decimals));
}

export function getRandomFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface MarketData {
  id: number;
  market: string;
  market_code: string;
  market_id: string;
}

interface VolumeDataItem {
  market_id: string;
  market: string;
  market_area_name: string;
  customer_id: string;
  customer: string;
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_desc: string;
  variant_size_pack_id: string;
  year: number;
  month: number;
  forecast_method: string;
  forecast_generation_month_date: string;
  data_type: string;
  is_manual_input: boolean;
  forecast_status: string;
  current_version: number;
  group_id: null;
  publication_id: null;
  tag_id: number[];
  tag_name: string[];
  comment: null;
  case_equivalent_volume: number;
  py_case_equivalent_volume: string;
  cy_3m_case_equivalent_volume: string;
  cy_6m_case_equivalent_volume: string;
  cy_12m_case_equivalent_volume: string;
  py_3m_case_equivalent_volume: string;
  py_6m_case_equivalent_volume: string;
  py_12m_case_equivalent_volume: string;
  projected_case_equivalent_volume: string;
  prev_published_case_equivalent_volume: string;
  gsv_rate: string;
  gross_sales_value: string;
  py_gross_sales_value: string;
  manual_case_equivalent_volume: string;
  forecast_case_equivalent_volume: string;
  quantity: number;
  sales_dollars: number;
  case_equivalent_quantity: number;
}

interface AccountSalesData {
  outlet_id: string;
  outlet_name: string;
  volume: number;
  sales_value: number;
}

interface AccountDetailsData {
  brand: string;
  month: number;
  volume: number;
  value: number;
}

// =============================================================================
// DEMO DATA CONSTANTS
// =============================================================================

export const DEMO_BRANDS = [
  'Jack Donaldson', 'Johnny Stroller', 'Gray Moose', 'Absolute Zero', 
  'Jamerson', 'Crown Loyal', 'Patton Silver', 'Captain Morgains',
  'Jose Quervo', 'Smirnov', 'Bombay Sapphire Plus', 'Tanqueray Green',
  'Bacardi Superior Plus', "Maker's Mark II", 'Buffalo Trace Route', 'Woodford Reserved', 'Bulleit Rye Plus'
];

export const DEMO_MARKETS: MarketData[] = [
  { id: 8, market: 'Delaware', market_code: 'DE', market_id: 'USADE1' },
  { id: 9, market: 'District Of Columbia', market_code: 'DC', market_id: 'USADC1' },
  { id: 21, market: 'Maryland - All Other', market_code: 'MDO', market_id: 'USAMD1' },
  { id: 44, market: 'South Carolina', market_code: 'SC', market_id: 'USASC1' },
  { id: 12, market: 'Florida', market_code: 'FL', market_id: 'USAFL1' },
  { id: 15, market: 'Georgia', market_code: 'GA', market_id: 'USAGA1' }
];

const DEMO_VARIANTS: Record<string, string[]> = {
  'Jack Donaldson': ['Old No. 8', 'Single Barrel Select', 'Gentleman Jake', 'Tennessee Fire'],
  'Johnny Stroller': ['Red Tag', 'Black Tag', 'Blue Tag', 'Gold Tag Reserve'],
  'Gray Moose': ['Original', "L'Orange", 'La Poire', 'Le Citron'],
  'Absolute Zero': ['Original', 'Citron', 'Vanilla', 'Mandrin'],
  'Jamerson': ['Original', 'Black Barrel', '18 Year', 'Caskmates'],
  'Crown Loyal': ['Original', 'Reserve', 'XR', 'Northern Harvest'],
  'Patton Silver': ['Silver', 'Reposado', 'Añejo', 'Extra Añejo'],
  'Captain Morgains': ['Original Spiced', 'Private Stock', '100 Proof', 'Coconut Rum'],
  'Jose Quervo': ['Especial', 'Tradicional', 'Reserva', 'Platino'],
  'Smirnov': ['No. 21', 'Triple Distilled', 'Premium', 'Ice'],
  'Bombay Sapphire Plus': ['Original', 'East', 'Star of Bombay', 'Premier Cru'],
  'Tanqueray Green': ['London Dry', 'Rangpur', 'No. TEN', 'Sevilla'],
  'Bacardi Superior Plus': ['White', 'Gold', 'Black', 'Reserva Ocho'],
  "Maker's Mark II": ['Original', '46', 'Private Select', 'Cask Strength'],
  'Buffalo Trace Route': ['Original', 'Single Barrel', 'Antique', 'White Dog'],
  'Woodford Reserved': ['Double Oaked', 'Rye', "Master's Collection", 'Wheat'],
  'Bulleit Rye Plus': ['Bourbon', 'Rye', '10 Year', 'Barrel Strength']
};

// =============================================================================
// USER & AUTH DATA GENERATORS
// =============================================================================

export function generateDemoUser(): any {
  return {
    id: 10,
    email: 'james@illysium.ai',
    first_name: 'James',
    last_name: 'Kim',
    role: 'Market Manager',
    address: '123 Demo Street',
    city: 'Demo City',
    state_code: 'NY',
    zip: '12345',
    phone_number: '+15551234567',
    phone_verified: true,
    two_fa_enabled: false,
    user_access: {
      Admin: true,
      Status: 'active',
      Markets: DEMO_MARKETS.map(m => ({
        id: m.id,
        market: m.market,
        market_id: m.market_id,
        market_code: m.market_code,
        market_hyperion: `${m.market_id} - ${m.market}`,
        market_coding: `G.${m.market_id}`,
        customers: [
          {
            customer_id: '17259',
            customer_coding: 'C.17259',
            planning_member_id: 'OUS1000',
            customer_stat_level: 'OUS1000 - Break Thru',
            customer_actual_data: `17259 - BREAKTHRU BEVERAGE ${m.market.toUpperCase()} - USD`,
            customer_stat_level_id: 'OUS1000',
            planning_member_coding: 'C.OUS1000P',
            customer_stat_level_coding: 'C.OUS1000'
          }
        ],
        settings: {
          managed_by: 'Market'
        }
      })),
      Division: 'BBG and Control'
    },
    user_settings: generateUserSettings()
  };
}

export function generateUserSettings(): any {
  return {
    guidance_settings: generateGuidanceSettings(),
    forecast_selected_tags: [],
    summary_selected_brands: ['Jack Donaldson', 'Johnny Stroller', 'Gray Moose', 'Absolute Zero'],
    forecast_selected_brands: [],
    summary_selected_markets: [],
    forecast_selected_markets: []
  };
}

export function generateGuidanceSettings(): any {
  return {
    summary_cols: [1007, 1006, 1005, 1001],
    summary_defs: [
      {
        id: 1001,
        label: 'TRENDS',
        value: null,
        period: 'FY',
        sublabel: '3M / 6M / 12M',
        calculation: {
          type: 'multi_calc',
          format: 'percent',
          subCalculations: [
            { id: '3M', cyField: 'cy_3m_case_equivalent_volume', pyField: 'py_3m_case_equivalent_volume', calculationType: 'percentage' },
            { id: '6M', cyField: 'cy_6m_case_equivalent_volume', pyField: 'py_6m_case_equivalent_volume', calculationType: 'percentage' },
            { id: '12M', cyField: 'cy_12m_case_equivalent_volume', pyField: 'py_12m_case_equivalent_volume', calculationType: 'percentage' }
          ]
        },
        displayType: 'column',
        availability: 'both'
      },
      {
        id: 1005,
        label: 'GSV TY',
        value: 'gross_sales_value',
        metric: 'gsv',
        period: 'YTD',
        calcType: 'direct',
        sublabel: 'YTD ($)',
        dimension: 'TY',
        calculation: { type: 'direct', format: 'number' },
        displayType: 'both',
        availability: 'both'
      }
    ],
    summary_rows: [1007, 1006],
    forecast_cols: [2, 1, 9],
    forecast_defs: [
      {
        id: 1,
        label: 'TRENDS',
        value: null,
        period: 'FY',
        sublabel: '3M / 6M / 12M',
        calculation: {
          type: 'multi_calc',
          format: 'percent',
          subCalculations: [
            { id: '3M', cyField: 'cy_3m_case_equivalent_volume', pyField: 'py_3m_case_equivalent_volume', calculationType: 'percentage' },
            { id: '6M', cyField: 'cy_6m_case_equivalent_volume', pyField: 'py_6m_case_equivalent_volume', calculationType: 'percentage' },
            { id: '12M', cyField: 'cy_12m_case_equivalent_volume', pyField: 'py_12m_case_equivalent_volume', calculationType: 'percentage' }
          ]
        },
        displayType: 'column',
        availability: 'both'
      }
    ],
    forecast_rows: [2, 9]
  };
}

// =============================================================================
// VOLUME & FORECAST DATA GENERATORS - ENHANCED PHASING
// =============================================================================

// Seasonal distribution patterns (0-1 multipliers that sum to 12)
const SEASONAL_PATTERNS = {
  // Standard seasonal pattern for spirits (higher in Nov/Dec, lower in summer)
  standard: [0.9, 0.8, 0.85, 0.9, 0.75, 0.7, 0.75, 0.8, 0.9, 1.0, 1.4, 1.65], // = 12.0
  
  // Premium brands (more consistent, less seasonal variation)
  premium: [0.95, 0.9, 0.9, 0.95, 0.85, 0.8, 0.85, 0.9, 0.95, 1.05, 1.3, 1.4], // = 12.0
  
  // Holiday-focused (very strong Q4)
  holiday: [0.8, 0.7, 0.75, 0.8, 0.7, 0.65, 0.7, 0.75, 0.85, 1.0, 1.6, 1.9], // = 12.0
  
  // Summer-focused (cocktail spirits)
  summer: [0.85, 0.8, 0.9, 1.1, 1.3, 1.4, 1.35, 1.25, 1.0, 0.9, 0.8, 0.75], // = 12.0
  
  // Consistent (minimal seasonality)
  consistent: [1.0, 0.95, 1.0, 1.0, 0.95, 0.9, 0.95, 1.0, 1.0, 1.05, 1.1, 1.1] // = 12.0
};

// Brand-specific patterns and characteristics
const BRAND_CHARACTERISTICS: {
  [key: string]: { 
    pattern: keyof typeof SEASONAL_PATTERNS; 
    baseVolume: [number, number]; 
    growthTrend: number; 
  };
} = {
  'Jack Donaldson': { pattern: 'standard', baseVolume: [25, 45], growthTrend: 0.08 },
  'Johnny Stroller': { pattern: 'premium', baseVolume: [20, 35], growthTrend: 0.05 },
  'Gray Moose': { pattern: 'summer', baseVolume: [15, 30], growthTrend: 0.12 },
  'Absolute Zero': { pattern: 'summer', baseVolume: [18, 32], growthTrend: 0.10 },
  'Jamerson': { pattern: 'premium', baseVolume: [22, 40], growthTrend: 0.06 },
  'Crown Loyal': { pattern: 'holiday', baseVolume: [20, 38], growthTrend: 0.07 },
  'Patton Silver': { pattern: 'summer', baseVolume: [12, 25], growthTrend: 0.15 },
  'Captain Morgains': { pattern: 'summer', baseVolume: [16, 28], growthTrend: 0.09 },
  'Jose Quervo': { pattern: 'summer', baseVolume: [14, 26], growthTrend: 0.11 },
  'Smirnov': { pattern: 'standard', baseVolume: [20, 35], growthTrend: 0.04 },
  'Bombay Sapphire Plus': { pattern: 'summer', baseVolume: [10, 20], growthTrend: 0.13 },
  'Tanqueray Green': { pattern: 'summer', baseVolume: [8, 18], growthTrend: 0.14 },
  'Bacardi Superior Plus': { pattern: 'summer', baseVolume: [18, 30], growthTrend: 0.08 },
  "Maker's Mark II": { pattern: 'premium', baseVolume: [15, 28], growthTrend: 0.06 },
  'Buffalo Trace Route': { pattern: 'consistent', baseVolume: [12, 22], growthTrend: 0.05 },
  'Woodford Reserved': { pattern: 'premium', baseVolume: [8, 16], growthTrend: 0.04 },
  'Bulleit Rye Plus': { pattern: 'consistent', baseVolume: [10, 20], growthTrend: 0.07 }
};

// Generate comprehensive volume data for a size pack across all time periods
function generateSizePackVolumeData(
  brand: string, 
  variant: string, 
  variantId: string, 
  market: MarketData | undefined,
  month: number, 
  year: number = 2025
): VolumeDataItem {
  const brandChar = BRAND_CHARACTERISTICS[brand] || BRAND_CHARACTERISTICS['Jack Donaldson'];
  const seasonalPattern = SEASONAL_PATTERNS[brandChar.pattern];
  
  // Generate yearly totals (only calculate once for the first month to maintain consistency)
  const sizePackSeed = `${brand}-${variant}-${market?.market_id || 'UNKNOWN'}`;
  const seedHash = sizePackSeed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const rng = () => Math.sin(seedHash * 9999) * 0.5 + 0.5; // Deterministic "random" based on size pack
  
  // Generate unique growth characteristics for this specific size pack
  const baseGrowthTrend = brandChar.growthTrend;
  const sizePackGrowthVariation = -0.03 + (rng() * 0.06); // ±3% variation from brand baseline
  const sizePackGrowthTrend = Math.max(0.01, Math.min(0.25, baseGrowthTrend + sizePackGrowthVariation));
  
  // Base yearly volumes (cases)
  const baseYearlyVolume = brandChar.baseVolume[0] + (brandChar.baseVolume[1] - brandChar.baseVolume[0]) * rng();
  
  // Calculate yearly totals with realistic relationships
  const totalYearForecast = Math.round(baseYearlyVolume * 10) / 10;
  const totalLastYear = Math.round(totalYearForecast / (1 + sizePackGrowthTrend) * 10) / 10;
  
  // Last Consensus: typically between LY and TY, with some variation
  const lcVariation = 0.85 + (rng() * 0.3); // 0.85 to 1.15 multiplier
  const totalLastConsensus = Math.round(totalLastYear * lcVariation * 10) / 10;
  
  // Monthly phasing using seasonal patterns
  const monthIndex = month - 1;
  const seasonalMultiplier = seasonalPattern[monthIndex];
  
  // Calculate individual monthly values
  const monthlyTY = Math.round((totalYearForecast * seasonalMultiplier / 12) * 100) / 100;
  const monthlyLY = Math.round((totalLastYear * seasonalMultiplier / 12) * 100) / 100;
  const monthlyLC = Math.round((totalLastConsensus * seasonalMultiplier / 12) * 100) / 100;
  
  // Determine if this month is actual or forecast
  const isActual = month <= 6; // First 6 months are actual
  
  // Add some randomness to forecast months while maintaining totals
  let finalMonthlyTY = monthlyTY;
  if (!isActual) {
    const variance = 0.9 + (rng() * 0.2); // ±10% variance for forecast months
    finalMonthlyTY = Math.round(monthlyTY * variance * 100) / 100;
  }
  
  // Calculate realistic rolling period totals from seasonal patterns
  // Current Year rolling totals (TY) - based on seasonal distribution
  const cy_3m_months = isActual ? [3, 4, 5] : [4, 5, 6]; // Last 3 actual months
  const cy_6m_months = isActual ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6]; // Last 6 months
  
  const cy_3m = Math.round(
    cy_3m_months.reduce((sum, idx) => sum + (totalYearForecast * seasonalPattern[idx] / 12), 0) * 100
  ) / 100;
  
  const cy_6m = Math.round(
    cy_6m_months.reduce((sum, idx) => sum + (totalYearForecast * seasonalPattern[idx] / 12), 0) * 100
  ) / 100;
  
  const cy_12m = totalYearForecast; // Full year
  
  // Prior Year rolling totals (PY) - with some performance variation
  const pyPerformanceVariation = 0.95 + (rng() * 0.1); // 95-105% performance vs expected
  
  const py_3m = Math.round(
    cy_3m_months.reduce((sum, idx) => sum + (totalLastYear * seasonalPattern[idx] / 12), 0) * pyPerformanceVariation * 100
  ) / 100;
  
  const py_6m = Math.round(
    cy_6m_months.reduce((sum, idx) => sum + (totalLastYear * seasonalPattern[idx] / 12), 0) * pyPerformanceVariation * 100
  ) / 100;
  
  const py_12m = Math.round(totalLastYear * pyPerformanceVariation * 100) / 100;
  
  // GSV calculations with some rate variation per size pack
  const baseGsvRate = getRandomBetween(400, 800, 1);
  const sizePackGsvVariation = 0.9 + (rng() * 0.2); // ±10% GSV rate variation
  const gsvRate = Math.round(baseGsvRate * sizePackGsvVariation * 100) / 100;
  const monthlyGSV = Math.round(finalMonthlyTY * gsvRate * 100) / 100;
  const pyMonthlyGSV = Math.round(monthlyLY * gsvRate * 100) / 100;
  
  return {
    market_id: market?.market_id || 'UNKNOWN',
    market: market?.market || 'Unknown Market',
    market_area_name: 'BBG East',
    customer_id: '17259',
    customer: 'BREAKTHRU BEVERAGE',
    brand: brand,
    variant: variant,
    variant_id: variantId,
    variant_size_pack_desc: `${variantId} - ${variant} 12x750`,
    variant_size_pack_id: `${variantId}-12-750`,
    year: year,
    month: month,
    forecast_method: 'six_month',
    forecast_generation_month_date: `${year}-07-01T00:00:00.000Z`,
    data_type: isActual ? 'actual_complete' : 'forecast',
    is_manual_input: false, // Never mark as manually modified on generation - only when user edits
    forecast_status: 'draft', // Keep all rows unlocked for demo
    current_version: !isActual ? Math.floor(getRandomBetween(0, 2)) : 0,
    group_id: null,
    publication_id: null,
    tag_id: [1],
    tag_name: ['Core'],
    comment: null,
    case_equivalent_volume: finalMonthlyTY,
    
    // Prior Year volumes (monthly and rolling)
    py_case_equivalent_volume: monthlyLY.toString(),
    py_3m_case_equivalent_volume: py_3m.toString(),
    py_6m_case_equivalent_volume: py_6m.toString(),
    py_12m_case_equivalent_volume: py_12m.toString(),
    
    // Current Year rolling totals for trends
    cy_3m_case_equivalent_volume: cy_3m.toString(),
    cy_6m_case_equivalent_volume: cy_6m.toString(),
    cy_12m_case_equivalent_volume: cy_12m.toString(),
    
    // Last Consensus volumes
    prev_published_case_equivalent_volume: monthlyLC.toString(),
    projected_case_equivalent_volume: (!isActual ? finalMonthlyTY * 0.1 : 0).toString(),
    
    // GSV data
    gsv_rate: gsvRate.toString(),
    gross_sales_value: monthlyGSV.toString(),
    py_gross_sales_value: pyMonthlyGSV.toString(),
    
    // Forecast and manual data
    manual_case_equivalent_volume: '0.00',
    forecast_case_equivalent_volume: (!isActual ? finalMonthlyTY : 0).toString(),
    quantity: 0,
    sales_dollars: 0,
    case_equivalent_quantity: 0
  };
}

export function generateVolumeData(markets: string[], brands: string[] | null, isCustomerView: boolean = false): VolumeDataItem[] {
  const data: VolumeDataItem[] = [];
  const relevantMarkets = DEMO_MARKETS.filter(m => 
    markets.includes(isCustomerView ? '17259' : m.market_id)
  );
  const relevantBrands = brands || DEMO_BRANDS.slice(0, 6);
  
  // Generate deterministic size packs for each market/brand combination
  const sizePackCache = new Map<string, { variant: string; variantId: string }[]>();
  
  for (const market of relevantMarkets) {
    for (const brand of relevantBrands) {
      // Ensure brand exists in our system
      if (DEMO_BRANDS.includes(brand)) {
        const cacheKey = `${market.market_id}-${brand}`;
        
        // Generate size packs for this brand/market combo (if not cached)
        if (!sizePackCache.has(cacheKey)) {
          const variants = DEMO_VARIANTS[brand];
          const availableVariants = variants || [`${brand} Original`];
          const numSizePacks = Math.min(availableVariants.length, 3); // 1-3 size packs per brand
          
          const sizePacks = [];
          for (let i = 0; i < numSizePacks; i++) {
            const variant = availableVariants[i];
            const brandCode = brand.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'XX';
            // Use deterministic ID based on brand, market, and variant index
            const seed = brand + market.market_id + i;
            const seedHash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const deterministicNumber = (seedHash % 900) + 100; // 100-999
            const variantId = `${brandCode}${deterministicNumber.toString().padStart(3, '0')}`;
            
            sizePacks.push({ variant, variantId });
          }
          sizePackCache.set(cacheKey, sizePacks);
        }
        
        // Generate 12 months of data for each size pack
        const sizePacks = sizePackCache.get(cacheKey)!;
        for (const sizePack of sizePacks) {
          for (let month = 1; month <= 12; month++) {
            data.push(generateSizePackVolumeData(brand, sizePack.variant, sizePack.variantId, market, month));
          }
        }
      }
    }
  }
  
  return data;
}

export function generateVolumeDataItem(market: MarketData | undefined, brand: string, month: number, year: number = 2025): VolumeDataItem {
  // This function is kept for backward compatibility but should use the enhanced logic
  const variants = DEMO_VARIANTS[brand];
  const variant = variants ? variants[0] : `${brand} Original`; // Use first variant consistently
  const brandCode = brand.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'XX';
  
  // Make variantId deterministic based on brand and market
  const seed = brand + (market?.market_id || 'UNKNOWN');
  const seedHash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const deterministicNumber = (seedHash % 900) + 100; // 100-999
  const variantId = `${brandCode}${deterministicNumber.toString().padStart(3, '0')}`;
  
  // Use the new enhanced volume data generation
  return generateSizePackVolumeData(brand, variant, variantId, market, month, year);
}

// =============================================================================
// DASHBOARD DATA GENERATOR
// =============================================================================

export function generateDashboardConfig(): any[] {
  return [
    {
      id: generateRandomId(),
      name: 'Demo Dashboard',
      type: 'table' as const,
      order: 1,
      config: {
        calcId: 'case_equivalent_volume',
        colDimId: 'month',
        rowDimId: 'brand',
        filterIds: ['customer'],
        filterValues: {}
      },
      gridPosition: {
        col: 0,
        row: 0,
        width: 12 as const
      }
    }
  ];
}

// =============================================================================
// MARKET DATA GENERATOR
// =============================================================================

export function generateDetailedMarkets(marketIds: number[]): any[] {
  return DEMO_MARKETS
    .filter(m => marketIds.includes(m.id))
    .map(market => ({
      id: market.id,
      market: market.market,
      market_code: market.market_code,
      market_hyperion: `${market.market_id} - ${market.market}`,
      market_coding: `G.${market.market_id}`,
      market_id: market.market_id,
      customers: [
        {
          customer_id: '17259',
          customer_coding: 'C.17259',
          planning_member_id: 'OUS1000',
          customer_stat_level: 'OUS1000 - Break Thru',
          customer_actual_data: `17259 - BREAKTHRU BEVERAGE ${market.market.toUpperCase()} - USD`,
          customer_stat_level_id: 'OUS1000',
          planning_member_coding: 'C.OUS1000P',
          customer_stat_level_coding: 'C.OUS1000'
        }
      ],
      settings: {
        managed_by: 'Market'
      }
    }));
}

// =============================================================================
// MARKET DATA GENERATOR FOR VOLUME VIEW
// =============================================================================

export function generateMarketData(marketIds: number[]): any[] {
  return DEMO_MARKETS
    .filter(m => marketIds.includes(m.id))
    .map(market => ({
      id: market.id,
      market_name: market.market,
      market_code: market.market_code,
      market_hyperion: `${market.market_id} - ${market.market}`,
      market_coding: `G.${market.market_id}`,
      market_id: market.market_id,
      customers: [
        {
          id: '17259',
          code: 'C.17259',
          display: `BREAKTHRU BEVERAGE ${market.market.toUpperCase()}`,
          raw: JSON.stringify({ customer_id: '17259', active: true }),
          customer_id: '17259',
          customer_actual_data: `17259 - BREAKTHRU BEVERAGE ${market.market.toUpperCase()} - USD`,
          customer_coding: 'C.17259'
        }
      ],
      settings: {
        managed_by: 'Market'
      },
      raw: JSON.stringify({ market_id: market.market_id, active: true })
    }));
}

// =============================================================================
// ACCOUNT LEVEL DATA GENERATORS
// =============================================================================

export function generateAccountLevelSales(): AccountSalesData[] {
  const numAccounts = Math.floor(getRandomBetween(3, 8));
  const accounts: AccountSalesData[] = [];
  
  for (let i = 0; i < numAccounts; i++) {
    accounts.push({
      outlet_id: `${17000 + i}`,
      outlet_name: `Demo Account ${i + 1}`,
      volume: getRandomBetween(5, 50, 2),
      sales_value: getRandomBetween(1000, 8000, 2)
    });
  }
  
  return accounts;
}

export function generateAccountDetails(): AccountDetailsData[] {
  const numBrands = Math.floor(getRandomBetween(4, 8));
  const data: AccountDetailsData[] = [];
  
  for (let i = 0; i < numBrands; i++) {
    const brand = getRandomFromArray(DEMO_BRANDS);
    for (let month = 1; month <= 12; month++) {
      data.push({
        brand,
        month,
        volume: getRandomBetween(10, 100, 2),
        value: getRandomBetween(2000, 15000, 2),
      });
    }
  }
  
  return data;
} 

// Account Level Sales Data Generator (for detailsContainer.tsx)
export const generateAccountLevelSalesData = (market_id: string, product: string, month: number, year: number) => {
  const customers = getCustomersForMarket(market_id);
  const accounts: any[] = [];
  
  customers.forEach(customer => {
    // Generate 3-5 retail accounts per customer
    const accountCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < accountCount; i++) {
      const outletId = `${customer.customer_id}_${String(i + 1).padStart(3, '0')}`;
      const baseVolume = Math.random() * 50 + 10; // 10-60 cases
      const accountType = ['Chain', 'Independent', 'Restaurant', 'Bar'][Math.floor(Math.random() * 4)];
      const outletName = DEMO_RETAIL_ACCOUNTS[Math.floor(Math.random() * DEMO_RETAIL_ACCOUNTS.length)];
      const city = ['Wilmington', 'Newark', 'Dover', 'Middletown'][Math.floor(Math.random() * 4)];
      const state = 'DE';
      const address = `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'First St', 'Broadway', 'Market St'][Math.floor(Math.random() * 5)]}`;
      
      accounts.push({
        outlet_id: outletId,
        outlet_name: outletName,
        customer_id: customer.customer_id,
        customer_name: customer.customer_actual_data.split(' - ')[1].split(' - ')[0],
        market_id,
        product_name: product,
        brand: product.split(' ')[0],
        month,
        year,
        // Fields expected by DepletionDetails component
        address_line_1: address,
        city: city,
        state: state,
        vip_cot_premise_type_desc: accountType === 'Restaurant' || accountType === 'Bar' ? 'On-Premise' : 'Off-Premise',
        category: accountType,
        case_equivalent_quantity: Math.round(baseVolume * 100) / 100,
        sales_dollars: Math.round(baseVolume * (Math.random() * 200 + 400) * 100) / 100, // $400-600 per case
        units_sold: Math.round(baseVolume * 12), // Assuming 12 bottles per case
        price_per_case: Math.round((Math.random() * 200 + 400) * 100) / 100,
        depletions: Math.round(baseVolume * (0.85 + Math.random() * 0.3) * 100) / 100, // 85-115% of volume
        account_type: accountType,
        territory: DEMO_TERRITORIES[Math.floor(Math.random() * DEMO_TERRITORIES.length)],
        last_order_date: `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        account_status: Math.random() > 0.1 ? 'Active' : 'Inactive'
      });
    }
  });
  
  return accounts.sort((a, b) => b.case_equivalent_quantity - a.case_equivalent_quantity);
};

// Account Details Data Generator (for accountDetails.tsx)
export const generateAccountDetailsData = (outletId: string, period: string = 'R12') => {
  const accountType = ['Chain Store', 'Independent Retailer', 'Restaurant', 'Bar & Lounge'][Math.floor(Math.random() * 4)];
  const account = {
    outlet_id: outletId,
    outlet_name: DEMO_RETAIL_ACCOUNTS[Math.floor(Math.random() * DEMO_RETAIL_ACCOUNTS.length)],
    account_type: accountType,
    territory: DEMO_TERRITORIES[Math.floor(Math.random() * DEMO_TERRITORIES.length)],
    address_line_1: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'First St', 'Broadway', 'Market St'][Math.floor(Math.random() * 5)]}`,
    city: ['Wilmington', 'Newark', 'Dover', 'Middletown'][Math.floor(Math.random() * 4)],
    state: 'DE',
    vip_cot_premise_type_code: accountType === 'Restaurant' || accountType === 'Bar & Lounge' ? 'ON' : 'OFF',
    vip_cot_premise_type_desc: accountType === 'Restaurant' || accountType === 'Bar & Lounge' ? 'On-Premise' : 'Off-Premise',
    zip_code: String(Math.floor(Math.random() * 90000) + 10000),
    phone: `(302) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    manager: `${['John', 'Sarah', 'Mike', 'Lisa', 'David'][Math.floor(Math.random() * 5)]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'][Math.floor(Math.random() * 5)]}`,
    license_number: `DE${String(Math.floor(Math.random() * 900000) + 100000)}`
  };
  
  const data: any[] = [];
  const months = period === 'R12' ? 12 : period === 'R6' ? 6 : 3;
  const currentDate = new Date();
  
  DEMO_BRANDS.forEach(brand => {
    // Generate 2-4 variants per brand
    const variantCount = Math.floor(Math.random() * 3) + 2;
    
    for (let v = 0; v < variantCount; v++) {
      const variant = `${brand} ${['12', '15', '18', '21'][v % 4]}${v > 1 ? ' Year' : ''}`;
      const variantId = `${brand.substring(0, 2).toUpperCase()}${String(v + 1).padStart(3, '0')}`;
      
      for (let i = 0; i < months; i++) {
        const monthDate = new Date(currentDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        
        const baseVolume = Math.random() * 30 + 5; // 5-35 cases
        const seasonalMultiplier = [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.3, 1.4][monthDate.getMonth()];
        const volume = baseVolume * seasonalMultiplier;
        
        data.push({
          ...account,
          brand,
          variant,
          variant_id: variantId,
          variant_size_pack_id: variantId,
          variant_size_pack_desc: `${variant} 12x750ml`,
          month: String(monthDate.getMonth() + 1),
          year: String(monthDate.getFullYear()),
          month_name: monthDate.toLocaleDateString('en-US', { month: 'long' }),
          case_equivalent_quantity: String(Math.round(volume * 100) / 100),
          sales_dollars: Math.round(volume * (Math.random() * 200 + 400) * 100) / 100,
          units_sold: Math.round(volume * 12),
          depletions: Math.round(volume * (0.85 + Math.random() * 0.3) * 100) / 100,
          price_per_case: Math.round((Math.random() * 200 + 400) * 100) / 100,
          inventory_on_hand: Math.round((Math.random() * 10 + 2) * 100) / 100,
          days_of_supply: Math.round(Math.random() * 15 + 5),
          reorder_point: Math.round(volume * 0.3 * 100) / 100,
          velocity: ['Fast', 'Medium', 'Slow'][Math.floor(Math.random() * 3)],
          margin_percent: Math.round((Math.random() * 10 + 20) * 100) / 100, // 20-30%
          discount_percent: Math.round((Math.random() * 5) * 100) / 100, // 0-5%
          promotional_activity: Math.random() > 0.7 ? 'Yes' : 'No'
        });
      }
    }
  });
  
  return data.sort((a, b) => b.year - a.year || b.month - a.month);
};

// Invoice Details Data Generator (for accountDetails.tsx invoice tab)
export const generateInvoiceDetailsData = (outletId: string, period: string = 'R12') => {
  const invoiceLineItems: any[] = [];
  const months = period === 'R12' ? 12 : period === 'R6' ? 6 : 3;
  const currentDate = new Date();
  
  // Get account details for consistent data
  const outletName = DEMO_RETAIL_ACCOUNTS[Math.floor(Math.random() * DEMO_RETAIL_ACCOUNTS.length)];
  const city = ['Wilmington', 'Newark', 'Dover', 'Middletown'][Math.floor(Math.random() * 4)];
  const state = 'DE';
  const accountType = ['Chain Store', 'Independent Retailer', 'Restaurant', 'Bar & Lounge'][Math.floor(Math.random() * 4)];
  const premiseType = accountType === 'Restaurant' || accountType === 'Bar & Lounge' ? 'On-Premise' : 'Off-Premise';
  
  for (let i = 0; i < months * 2; i++) { // 2 invoices per month on average
    const invoiceDate = new Date(currentDate);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * (months * 30)));
    
    const invoiceNumber = `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1000)}`;
    const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items per invoice
    
    for (let j = 0; j < itemCount; j++) {
      const brand = DEMO_BRANDS[Math.floor(Math.random() * DEMO_BRANDS.length)];
      const variant = `${brand} ${['12', '15', '18', '21'][j % 4]}`;
      const variantId = `${brand.substring(0, 2).toUpperCase()}${String(j + 1).padStart(3, '0')}`;
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 cases
      const unitPrice = Math.random() * 200 + 400; // $400-600 per case
      const salesDollars = quantity * unitPrice;
      
      invoiceLineItems.push({
        outlet_id: outletId,
        outlet_name: outletName,
        city: city,
        state: state,
        premise_type: premiseType,
        account_type: accountType,
        invoice_date: invoiceDate.toISOString(),
        invoice_number: invoiceNumber,
        brand: brand,
        variant: variant,
        variant_id: variantId,
        variant_size_pack_id: variantId,
        variant_size_pack_desc: `${variant} 12x750ml`,
        quantity: quantity,
        case_equivalent_quantity: quantity, // Assuming 1:1 ratio for simplicity
        sales_dollars: Math.round(salesDollars * 100) / 100
      });
    }
  }
  
  return invoiceLineItems.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
};

// Demo retail accounts
const DEMO_RETAIL_ACCOUNTS = [
  'Total Wine & More',
  'BevMo!',
  'Liquor Barn',
  'ABC Fine Wine & Spirits',
  'Spec\'s Wine, Spirits & Finer Foods',
  'Hi-Time Wine Cellars',
  'K&L Wine Merchants',
  'Binny\'s Beverage Depot',
  'Warehouse Liquors',
  'Crystal Palace Liquors',
  'Village Wine & Liquor',
  'Premium Wine & Spirits',
  'Downtown Liquor Store',
  'Sunset Wine Shop',
  'Harbor View Spirits',
  'Main Street Wines',
  'Corner Store Liquors',
  'University Beverage',
  'Parkside Wine & Spirits',
  'Metro Liquor Mart'
];

// Demo territories
const DEMO_TERRITORIES = [
  'North Delaware',
  'South Delaware',
  'Central Delaware',
  'Newark Territory',
  'Wilmington Metro',
  'Dover Region',
  'Coastal Delaware',
  'Sussex County',
  'Kent County',
  'New Castle County'
];

// Helper function to get customers for a specific market
const getCustomersForMarket = (market_id: string) => {
  const market = DEMO_MARKETS.find(m => m.market_id === market_id);
  if (!market) {
    return [];
  }

  const customers: any[] = [];
  const baseCustomerId = '17259'; // Assuming a base customer ID for this market
  const baseCustomerName = 'BREAKTHRU BEVERAGE';

  // Add a base customer for the market
  customers.push({
    customer_id: baseCustomerId,
    customer_coding: 'C.17259',
    planning_member_id: 'OUS1000',
    customer_stat_level: 'OUS1000 - Break Thru',
    customer_actual_data: `${baseCustomerId} - ${baseCustomerName} ${market.market.toUpperCase()} - USD`,
    customer_stat_level_id: 'OUS1000',
    planning_member_coding: 'C.OUS1000P',
    customer_stat_level_coding: 'C.OUS1000'
  });

  // Add a few additional customers for variety
  const additionalCustomers = [
    {
      customer_id: '17260',
      customer_coding: 'C.17260',
      planning_member_id: 'OUS1001',
      customer_stat_level: 'OUS1001 - Premium',
      customer_actual_data: `${baseCustomerId} - ${baseCustomerName} Premium ${market.market.toUpperCase()} - USD`,
      customer_stat_level_id: 'OUS1001',
      planning_member_coding: 'C.OUS1001P',
      customer_stat_level_coding: 'C.OUS1001'
    },
    {
      customer_id: '17261',
      customer_coding: 'C.17261',
      planning_member_id: 'OUS1002',
      customer_stat_level: 'OUS1002 - Elite',
      customer_actual_data: `${baseCustomerId} - ${baseCustomerName} Elite ${market.market.toUpperCase()} - USD`,
      customer_stat_level_id: 'OUS1002',
      planning_member_coding: 'C.OUS1002P',
      customer_stat_level_coding: 'C.OUS1002'
    }
  ];

  return [...customers, ...additionalCustomers];
}; 