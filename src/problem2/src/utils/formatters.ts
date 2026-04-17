export const formatCurrency = (value: number, decimals: number = 6): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value);
};
