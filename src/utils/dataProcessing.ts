export const processMonthData = (data: any[]) => {
  const months: { [key: string]: any } = {};
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  data.forEach((item: any) => {
    const monthName = monthNames[item.month - 1];
    months[monthName] = {
      value: Math.round(item.total_depletions),
      isActual: item.data_type.includes("actual"),
      isManuallyModified: false,
    };
  });

  return months;
}; 