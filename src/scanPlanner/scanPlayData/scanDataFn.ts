export function getRandomBetween(min: number, max: number, decimals: number = 0): number {
  const rand = Math.random() * (max - min) + min;
  return parseFloat(rand.toFixed(decimals));
}

// Price: Generate a price between $49.99 and $79.99 with two decimal places
export function generatePrice(): number {
  return getRandomBetween(49.99, 79.99, 2);
}

// QD (Quantity Discount): Generate an amount between $1 and $4 (no decimals)
export function generateQD(): number {
  return getRandomBetween(1, 4);
}

// Nielsen_Sales: Generate a number between 300 and 1000 (whole number)
export function generateNielsenSales(): number {
  return Math.floor(getRandomBetween(300, 1000));
}

// Loyalty: Generate a value between $0.00 and $2.00 with two decimal places
export function generateLoyalty(): number {
  return getRandomBetween(0, 2, 2);
}

// Projected Volume: Generate a whole number between 300 and 1000
export function generateProjectedVolume(): number {
  return Math.floor(getRandomBetween(300, 1000));
}

// Generate LY Nielsen sales trend as monthly values derived from 52 weekly data points
// Returns an array of 12 objects matching the { month, value } shape expected by TrendLine
export function generateNielsenTrend(): { month: string; value: number }[] {
  const MONTHS = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  // 1) Create 52 random weekly values between 50-100
  const weekly: number[] = Array.from({ length: 52 }, () => getRandomBetween(50, 100, 0));

  // 2) Aggregate into 12 months – approximate by splitting the 52 weeks as evenly as possible
  const weeksPerMonthBase = Math.floor(52 / 12); // 4
  const monthsWithExtraWeek = 52 % 12; // 4 months will get 5 weeks

  let weekIdx = 0;
  const monthlyValues = MONTHS.map((_m, idx) => {
    const weeksThisMonth = weeksPerMonthBase + (idx < monthsWithExtraWeek ? 1 : 0);
    const slice = weekly.slice(weekIdx, weekIdx + weeksThisMonth);
    weekIdx += weeksThisMonth;
    // Average the weekly data for the month and round to one decimal
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    return Math.round(avg * 10) / 10;
  });

  // 3) Return in TrendLine format
  return MONTHS.map((m, i) => ({ month: m, value: monthlyValues[i] }));
}

// Retailer Margin: Generate a percentage between 25% and 35%
export function generateRetailerMargin(): number {
  return getRandomBetween(25, 35, 1);
}
