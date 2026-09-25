export const PRIMARY_CURRENCIES = ["AED", "USD", "INR"] as const;

export const CURRENCY_OPTIONS = [
  { code: "AED", symbol: "AED", label: "AED" },
  { code: "USD", symbol: "$",   label: "USD" },
  { code: "INR", symbol: "₹",   label: "INR" },
];

export const CURRENCIES = CURRENCY_OPTIONS;

export function getCurrencySymbol(currency?: string): string {
  const code = (currency || "AED").trim().toUpperCase();
  if (code === "USD") return "$";
  if (code === "INR") return "₹";
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  return code;
}

export function formatCurrencyAmount(
  amount: number | string | undefined | null,
  currency: string = "AED"
): string {
  if (amount === undefined || amount === null || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (isNaN(num)) return String(amount);

  const formattedNum = num.toLocaleString();
  const code = (currency || "AED").trim().toUpperCase() || "AED";

  if (code === "USD") return `$${formattedNum}`;
  if (code === "INR") return `₹${formattedNum}`;
  return `${code} ${formattedNum}`;
}
