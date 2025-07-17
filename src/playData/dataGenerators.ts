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
// VOLUME & FORECAST DATA GENERATORS
// =============================================================================

export function generateVolumeDataItem(market: MarketData | undefined, brand: string, month: number, year: number = 2025): VolumeDataItem {
  // Safe variant lookup with fallback
  const variants = DEMO_VARIANTS[brand];
  const variant = variants ? getRandomFromArray(variants) : `${brand} Original`;
  const brandCode = brand.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'XX';
  const variantId = `${brandCode}${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`;
  
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
    data_type: month <= 6 ? 'actual_complete' : 'forecast',
    is_manual_input: month > 6 ? getRandomBetween(0, 1) > 0.7 : false,
    forecast_status: month > 6 ? getRandomFromArray(['draft', 'consensus']) : 'draft',
    current_version: month > 6 ? Math.floor(getRandomBetween(0, 2)) : 0,
    group_id: null,
    publication_id: null,
    tag_id: [1],
    tag_name: ['Core'],
    comment: null,
    case_equivalent_volume: getRandomBetween(1, 50, 2),
    py_case_equivalent_volume: getRandomBetween(5, 25, 2).toString(),
    cy_3m_case_equivalent_volume: getRandomBetween(20, 80, 2).toString(),
    cy_6m_case_equivalent_volume: getRandomBetween(50, 120, 2).toString(),
    cy_12m_case_equivalent_volume: getRandomBetween(150, 250, 2).toString(),
    py_3m_case_equivalent_volume: getRandomBetween(25, 85, 2).toString(),
    py_6m_case_equivalent_volume: getRandomBetween(45, 115, 2).toString(),
    py_12m_case_equivalent_volume: getRandomBetween(160, 240, 2).toString(),
    projected_case_equivalent_volume: getRandomBetween(0, 30, 2).toString(),
    prev_published_case_equivalent_volume: getRandomBetween(1, 45, 2).toString(),
    gsv_rate: getRandomBetween(400, 800, 1).toString(),
    gross_sales_value: getRandomBetween(1000, 15000, 2).toString(),
    py_gross_sales_value: getRandomBetween(1500, 12000, 2).toString(),
    manual_case_equivalent_volume: '0.00',
    forecast_case_equivalent_volume: getRandomBetween(1, 40, 2).toString(),
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
  
  // Generate 12 months of data for each market/brand combination
  for (const market of relevantMarkets) {
    for (const brand of relevantBrands) {
      // Ensure brand exists in our system
      if (DEMO_BRANDS.includes(brand)) {
        for (let month = 1; month <= 12; month++) {
          data.push(generateVolumeDataItem(market, brand, month));
        }
      }
    }
  }
  
  return data;
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