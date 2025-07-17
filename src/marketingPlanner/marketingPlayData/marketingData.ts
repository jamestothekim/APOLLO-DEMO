export const ALLOWED_MARKETING_ACCESS = {
  allowedEmails: [
    'james@illysium.ai',
    'dave@illysium.ai',
    'david@illysium.ai'
  ]
};

// Market data structure
export interface Market {
  id: number;
  name: string;
  market_code: string;
}

export const MARKETS: Market[] = [
  { id: 1, name: 'New York', market_code: 'USANY1' },
  { id: 2, name: 'California', market_code: 'USACA1' },
  { id: 3, name: 'Texas', market_code: 'USATX1' },
  { id: 4, name: 'Florida', market_code: 'USAFL1' },
  { id: 5, name: 'Illinois', market_code: 'USAIL1' },
  { id: 6, name: 'Pennsylvania', market_code: 'USAPA1' },
  { id: 7, name: 'Ohio', market_code: 'USAOH1' },
  { id: 8, name: 'Georgia', market_code: 'USAGA1' },
  { id: 9, name: 'North Carolina', market_code: 'USANC1' },
  { id: 10, name: 'Michigan', market_code: 'USAMI1' }
];

// Program data structure
export interface Program {
  id: number;
  category: string;
  program_name: string;
  gl_account: string;
  activity_code: number;
  type: string;
}

export const PROGRAMS: Program[] = [
  // Advertising Programs
  { id: 1, category: 'Advertising', program_name: 'Digital Media', gl_account: '51101', activity_code: 100049843, type: 'Digital' },
  { id: 2, category: 'Advertising', program_name: 'Print Media', gl_account: '51102', activity_code: 100049844, type: 'Print' },
  { id: 3, category: 'Advertising', program_name: 'Radio Spots', gl_account: '51202', activity_code: 100049845, type: 'Radio' },
  { id: 4, category: 'Advertising', program_name: 'Social Media', gl_account: '51501', activity_code: 100049846, type: 'Social' },
  { id: 5, category: 'Advertising', program_name: 'Trade Events', gl_account: '51502', activity_code: 100049847, type: 'Events' },

  // Promotions Programs
  { id: 6, category: 'Promotions', program_name: 'POS Materials', gl_account: '52101', activity_code: 100049848, type: 'POS' },
  { id: 7, category: 'Promotions', program_name: 'Store Displays', gl_account: '52102', activity_code: 100049849, type: 'Display' },
  { id: 8, category: 'Promotions', program_name: 'Price Promotions', gl_account: '52103', activity_code: 100049850, type: 'Price' },
  { id: 9, category: 'Promotions', program_name: 'Trade Promotions', gl_account: '52401', activity_code: 100049851, type: 'Trade' },
  { id: 10, category: 'Promotions', program_name: 'Consumer Promotions', gl_account: '52402', activity_code: 100049852, type: 'Consumer' },

  // Field Marketing Programs
  { id: 11, category: 'Field Marketing', program_name: 'Sampling Events', gl_account: '53101', activity_code: 100049853, type: 'Sampling' },
  { id: 12, category: 'Field Marketing', program_name: 'Brand Ambassador', gl_account: '53102', activity_code: 100049854, type: 'Ambassador' },
  { id: 13, category: 'Field Marketing', program_name: 'Trade Shows', gl_account: '53103', activity_code: 100049855, type: 'Trade Show' },
  { id: 14, category: 'Field Marketing', program_name: 'Bar Programs', gl_account: '53104', activity_code: 100049856, type: 'On-Premise' },
  { id: 15, category: 'Field Marketing', program_name: 'Restaurant Programs', gl_account: '53105', activity_code: 100049857, type: 'On-Premise' },

  // Special Programs (from SQL file)
  { id: 16, category: 'Special Programs', program_name: 'Attack the Mac', gl_account: '52101', activity_code: 100051982, type: 'Promotion' },
  { id: 17, category: 'Special Programs', program_name: 'Incremental Demos', gl_account: '52401', activity_code: 100051985, type: 'Sampling' },
  { id: 18, category: 'Special Programs', program_name: 'Holiday Portfolio', gl_account: '51504', activity_code: 100051986, type: 'Advertising' },
  { id: 19, category: 'Special Programs', program_name: 'Father\'s Day', gl_account: '53103', activity_code: 100051973, type: 'Promotion' },
  { id: 20, category: 'Special Programs', program_name: 'Saint Patrick\'s Day', gl_account: '52401', activity_code: 100051965, type: 'Promotion' }
];

// Marketing Program interface
export interface MarketingProgram {
  id: number;
  market: number;
  brand: number;
  program: number;
  total_ty: number;
  months: { [key: string]: number };
  notes: string;
}

// Brand data structure
export interface Brand {
  id: number;
  name: string;
}

export const BRANDS: Brand[] = [
  { id: 1, name: 'Drambuie' },
  { id: 2, name: 'Hendrick\'s' },
  { id: 3, name: 'Hudson' },
  { id: 4, name: 'Grant\'s' },
  { id: 5, name: 'Milagro' },
  { id: 6, name: 'Reyka' },
  { id: 7, name: 'Monkey Shoulder' },
  { id: 8, name: 'The Balvenie' },
  { id: 9, name: 'Sailor Jerry' },
  { id: 10, name: 'Clan MacGregor' },
  { id: 11, name: 'Tullamore DEW' },
  { id: 12, name: 'Glenfiddich' }
];

// Marketing guidance data for calculations
export const MARKETING_GUIDANCE_DATA = {
  events: [],
  markets: MARKETS,
  brands: BRANDS,
  programs: PROGRAMS,
  guidanceOptions: [
    { 
      id: 'total_spend', 
      label: 'Total Spend', 
      calculation: { type: 'sum' as const, field: 'total_ty', format: 'currency' as const, source: 'calculated' as const },
      displayType: 'both' as const,
      availability: 'both' as const
    },
    { 
      id: 'volume_impact', 
      label: 'Volume Impact', 
      calculation: { type: 'sum' as const, field: 'volume_impact', format: 'number' as const, source: 'calculated' as const },
      displayType: 'both' as const,
      availability: 'both' as const
    },
    { 
      id: 'efficiency', 
      label: 'Efficiency', 
      calculation: { type: 'ratio' as const, field: 'efficiency', format: 'number' as const, source: 'calculated' as const },
      displayType: 'both' as const,
      availability: 'both' as const
    }
  ]
};