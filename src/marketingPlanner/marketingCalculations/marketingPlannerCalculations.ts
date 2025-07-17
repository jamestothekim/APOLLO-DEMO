import { MarketingProgram } from '../marketingPlayData/marketingData';

export interface MarketingBrandAggregateData {
  brand: string;
  total: number;
  total_py: number;
  total_lc: number;
  events: Array<{
    volume_impact: number;
  }>;
  markets: Record<string, {
    total: number;
    total_py: number;
    total_lc: number;
    events: Array<{
      volume_impact: number;
    }>;
  }>;
}

export const calculateTotalTY = (months: { [key: string]: number }): number => {
  return Object.values(months).reduce((sum, val) => sum + val, 0);
};

export const aggregateProgramsByMarket = (programs: MarketingProgram[]): { [marketId: number]: number } => {
  return programs.reduce((acc, program) => {
    const marketTotal = acc[program.market] || 0;
    acc[program.market] = marketTotal + program.total_ty;
    return acc;
  }, {} as { [marketId: number]: number });
};

export const aggregateProgramsByBrand = (programs: MarketingProgram[]): { [brand: string]: number } => {
  return programs.reduce((acc, program) => {
    const brandTotal = acc[program.brand] || 0;
    acc[program.brand] = brandTotal + program.total_ty;
    return acc;
  }, {} as { [brand: string]: number });
};

export const aggregateProgramsByProgram = (programs: MarketingProgram[]): { [programId: number]: number } => {
  return programs.reduce((acc, program) => {
    const programTotal = acc[program.program] || 0;
    acc[program.program] = programTotal + program.total_ty;
    return acc;
  }, {} as { [programId: number]: number });
};

export const calculateMonthlyTotals = (programs: MarketingProgram[]): { [month: string]: number } => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.reduce((acc, month) => {
    acc[month] = programs.reduce((sum, program) => sum + (program.months[month] || 0), 0);
    return acc;
  }, {} as { [month: string]: number });
};
