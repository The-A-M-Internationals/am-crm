export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "AED", symbol: "AED", label: "AED (UAE Dirham)" },
  { code: "USD", symbol: "$",   label: "USD (US Dollar)" },
  { code: "INR", symbol: "₹",   label: "INR (Indian Rupee)" },
  { code: "EUR", symbol: "€",   label: "EUR (Euro)" },
  { code: "GBP", symbol: "£",   label: "GBP (British Pound)" },
  { code: "SAR", symbol: "SAR", label: "SAR (Saudi Riyal)" },
  { code: "QAR", symbol: "QAR", label: "QAR (Qatari Riyal)" },
  { code: "OMR", symbol: "OMR", label: "OMR (Omani Rial)" },
  { code: "KWD", symbol: "KWD", label: "KWD (Kuwaiti Dinar)" },
  { code: "CAD", symbol: "CA$", label: "CAD (Canadian Dollar)" },
  { code: "AUD", symbol: "AU$", label: "AUD (Australian Dollar)" },
  { code: "SGD", symbol: "SG$", label: "SGD (Singapore Dollar)" },
];

export function getCurrencySymbol(code?: string): string {
  if (!code) return "AED";
  const found = CURRENCY_OPTIONS.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.symbol : code.toUpperCase();
}

export function formatCurrencyAmount(
  amount: number | string | undefined | null,
  currency: string = "AED"
): string {
  if (amount === undefined || amount === null || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (isNaN(num)) return String(amount);

  const formattedNum = num.toLocaleString();
  const code = (currency || "AED").toUpperCase();
  const symbol = getCurrencySymbol(code);

  if (symbol === "$" || symbol === "₹" || symbol === "€" || symbol === "£") {
    return `${symbol}${formattedNum}`;
  }
  return `${code} ${formattedNum}`;
}
