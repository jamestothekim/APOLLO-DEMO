import { MARKETING_GUIDANCE_DATA } from '../marketingPlayData/marketingData';

// Types
export interface MarketingEvent {
  id: string;
  brand: string;
  market: string;
  event_type: string;
  start_date: string;
  end_date: string;
  spend: number;
  volume_impact: number;
  volume_py: number;
}

export interface MarketingGuidanceResult {
  total: number;
  monthly?: { [key: string]: number };
  details?: {
    events: MarketingEvent[];
    volume: number;
    volume_py: number;
  };
}

export interface MarketingGuidanceCalculation {
  type: 'sum' | 'ratio';
  format: 'currency' | 'number';
  source: 'marketing_events' | 'historical' | 'consensus' | 'calculated';
  numerator?: string;
  denominator?: string;
}

export interface MarketingGuidance {
  id: string;
  label: string;
  sublabel?: string;
  calculation: MarketingGuidanceCalculation;
  displayType: 'column' | 'row' | 'both';
  availability: 'summary' | 'planner' | 'both';
}

// Helper functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Main calculation functions
export const calculateMarketingGuidance = (
  events: MarketingEvent[],
  guidance: MarketingGuidance,
  lastConsensus?: any[],
  historicalData?: any[]
): MarketingGuidanceResult => {
  const { calculation } = guidance;

  switch (calculation.type) {
    case 'sum':
      return calculateSum(events, calculation, lastConsensus, historicalData);
    case 'ratio':
      return calculateRatio(events, calculation, lastConsensus, historicalData);
    default:
      return { total: 0 };
  }
};

const calculateSum = (
  events: MarketingEvent[],
  calculation: MarketingGuidanceCalculation,
  lastConsensus?: any[],
  historicalData?: any[]
): MarketingGuidanceResult => {
  let total = 0;
  let monthly: { [key: string]: number } = {};

  switch (calculation.source) {
    case 'marketing_events':
      events.forEach(event => {
        total += event.spend;
        // Add monthly breakdown logic here if needed
      });
      break;
    case 'consensus':
      if (lastConsensus) {
        total = lastConsensus.reduce((sum, item) => sum + item.marketing_dollars, 0);
      }
      break;
    case 'historical':
      if (historicalData) {
        total = historicalData.reduce((sum, item) => sum + item.marketing_dollars, 0);
      }
      break;
  }

  return {
    total,
    monthly,
    details: {
      events,
      volume: events.reduce((sum, event) => sum + event.volume_impact, 0),
      volume_py: events.reduce((sum, event) => sum + event.volume_py, 0)
    }
  };
};

const calculateRatio = (
  events: MarketingEvent[],
  calculation: MarketingGuidanceCalculation,
  lastConsensus?: any[],
  historicalData?: any[]
): MarketingGuidanceResult => {
  let numerator = 0;
  let denominator = 0;

  // Calculate numerator
  switch (calculation.numerator) {
    case 'marketing_dollars':
      numerator = events.reduce((sum, event) => sum + event.spend, 0);
      break;
    case 'marketing_dollars_py':
      if (historicalData) {
        numerator = historicalData.reduce((sum, item) => sum + item.marketing_dollars, 0);
      }
      break;
    case 'marketing_dollars_lc':
      if (lastConsensus) {
        numerator = lastConsensus.reduce((sum, item) => sum + item.marketing_dollars, 0);
      }
      break;
  }

  // Calculate denominator
  switch (calculation.denominator) {
    case 'volume':
      denominator = events.reduce((sum, event) => sum + event.volume_impact, 0);
      break;
  }

  const total = denominator !== 0 ? numerator / denominator : 0;

  return {
    total,
    details: {
      events,
      volume: events.reduce((sum, event) => sum + event.volume_impact, 0),
      volume_py: events.reduce((sum, event) => sum + event.volume_py, 0)
    }
  };
};

// Format the result based on the guidance type
export const formatGuidanceValue = (
  value: number,
  format: string
): string => {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'number':
      return formatNumber(value);
    default:
      return value.toString();
  }
};

// Export available guidance options
export const getAvailableGuidance = (): MarketingGuidance[] => {
  return MARKETING_GUIDANCE_DATA.guidanceOptions;
};
