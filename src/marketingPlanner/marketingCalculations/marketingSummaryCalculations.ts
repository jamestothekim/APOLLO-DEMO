import { MarketingBrandAggregateData } from './marketingPlannerCalculations';

// Types
export interface MarketingSummaryMetrics {
  total_marketing_spend: number;
  total_volume_impact: number;
  marketing_spend_per_case: number;
  yoy_change: number;
  vs_last_consensus: number;
  brand_metrics: {
    [brand: string]: {
      total_spend: number;
      volume_impact: number;
      spend_per_case: number;
      yoy_change: number;
      vs_last_consensus: number;
      market_breakdown: {
        [market: string]: {
          total_spend: number;
          volume_impact: number;
          spend_per_case: number;
          yoy_change: number;
          vs_last_consensus: number;
        };
      };
    };
  };
}

// Helper functions
const calculateBrandMetrics = (
  brandData: MarketingBrandAggregateData
): MarketingSummaryMetrics['brand_metrics'][string] => {
  const total_spend = brandData.total;
  const volume_impact = brandData.events.reduce(
    (sum: number, event: { volume_impact: number }) => sum + event.volume_impact,
    0
  );
  const spend_per_case = volume_impact > 0 ? total_spend / volume_impact : 0;
  const yoy_change = brandData.total - brandData.total_py;
  const vs_last_consensus = brandData.total - brandData.total_lc;

  const market_breakdown = Object.entries(brandData.markets).reduce(
    (acc: Record<string, any>, [market, marketData]) => {
      const marketVolumeImpact = marketData.events.reduce(
        (sum: number, event: { volume_impact: number }) => sum + event.volume_impact,
        0
      );
      acc[market] = {
        total_spend: marketData.total,
        volume_impact: marketVolumeImpact,
        spend_per_case: marketVolumeImpact > 0 ? marketData.total / marketVolumeImpact : 0,
        yoy_change: marketData.total - marketData.total_py,
        vs_last_consensus: marketData.total - marketData.total_lc
      };
      return acc;
    },
    {} as MarketingSummaryMetrics['brand_metrics'][string]['market_breakdown']
  );

  return {
    total_spend,
    volume_impact,
    spend_per_case,
    yoy_change,
    vs_last_consensus,
    market_breakdown
  };
};

// Main calculation functions
export const calculateMarketingSummary = (
  aggregateData: MarketingBrandAggregateData[]
): MarketingSummaryMetrics => {
  const metrics: MarketingSummaryMetrics = {
    total_marketing_spend: 0,
    total_volume_impact: 0,
    marketing_spend_per_case: 0,
    yoy_change: 0,
    vs_last_consensus: 0,
    brand_metrics: {}
  };

  // Calculate brand-level metrics
  aggregateData.forEach(brandData => {
    metrics.brand_metrics[brandData.brand] = calculateBrandMetrics(brandData);
  });

  // Calculate overall metrics
  metrics.total_marketing_spend = aggregateData.reduce(
    (sum, brand) => sum + brand.total,
    0
  );

  metrics.total_volume_impact = aggregateData.reduce(
    (sum, brand) => sum + metrics.brand_metrics[brand.brand].volume_impact,
    0
  );

  metrics.marketing_spend_per_case = metrics.total_volume_impact > 0
    ? metrics.total_marketing_spend / metrics.total_volume_impact
    : 0;

  metrics.yoy_change = aggregateData.reduce(
    (sum, brand) => sum + (brand.total - brand.total_py),
    0
  );

  metrics.vs_last_consensus = aggregateData.reduce(
    (sum, brand) => sum + (brand.total - brand.total_lc),
    0
  );

  return metrics;
};

// Format functions for display
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

// Helper function to get trend indicator
export const getTrendIndicator = (value: number): { color: string; icon: string } => {
  if (value > 0) {
    return { color: 'success.main', icon: '↑' };
  } else if (value < 0) {
    return { color: 'error.main', icon: '↓' };
  }
  return { color: 'text.secondary', icon: '→' };
};
