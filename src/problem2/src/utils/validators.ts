export const validateAmount = (value: string): string | null => {
  if (!value) return "Amount is required";
  
  const numRegex = /^\d*\.?\d*$/;
  if (!numRegex.test(value)) return "Please enter a valid number";
  
  const num = parseFloat(value);
  if (isNaN(num)) return "Please enter a valid number";
  if (num <= 0) return "Amount must be greater than 0";
  
  return null;
};
