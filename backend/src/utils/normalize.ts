/**
 * Normalization utilities for phone numbers and budgets.
 */

/**
 * Normalize phone numbers to E.164 format.
 * E.164 format: +[country code][subscriber number]
 */
export function normalizePhone(phone: string | number): string {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\s+/g, "").replace(/[-()]/g, "");

  // If already starts with '+', ensure it only has digits after
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    return "+" + digits;
  }

  // Handle double zero prefix (e.g., 0091...)
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2).replace(/\D/g, "");
  }

  // Remove leading zeros for local numbers
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  const digitsOnly = cleaned.replace(/\D/g, "");

  // Standard heuristics:
  // 10 digits: assume India (+91) or USA (+1). Default to +91 for standard Indian CRM datasets
  if (digitsOnly.length === 10) {
    return "+91" + digitsOnly;
  }

  // 12 digits starting with 91: assume India +91
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return "+" + digitsOnly;
  }

  // 11 digits starting with 1: assume US +1
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return "+" + digitsOnly;
  }

  // Fallback: prepend '+' to whatever digits we have
  return "+" + digitsOnly;
}

/**
 * Normalizes currency/budget strings to numerical values and currency ISO codes.
 * E.g., "1.2 Cr" -> { value: 12000000, currency: "INR" }
 * E.g., "$450k" -> { value: 450000, currency: "USD" }
 * E.g., "₹ 50 Lakhs" -> { value: 5000000, currency: "INR" }
 */
export function parseBudget(
  budgetString: string | number,
  defaultCurrency = "INR"
): { value: number; currency: string } {
  if (typeof budgetString === "number") {
    return { value: budgetString, currency: defaultCurrency };
  }

  if (!budgetString || budgetString.toString().trim() === "") {
    return { value: 0, currency: defaultCurrency };
  }

  const str = budgetString.toString().toLowerCase().trim();

  // Detect currency
  let currency = defaultCurrency;
  if (str.includes("$") || str.includes("usd")) {
    currency = "USD";
  } else if (str.includes("₹") || str.includes("rs") || str.includes("inr") || str.includes("rupee")) {
    currency = "INR";
  } else if (str.includes("€") || str.includes("eur")) {
    currency = "EUR";
  } else if (str.includes("£") || str.includes("gbp")) {
    currency = "GBP";
  } else if (str.includes("aed") || str.includes("dirham")) {
    currency = "AED";
  }

  // Strip non-numeric/non-decimal characters, keeping letters to check multipliers
  // Remove currency symbols first
  const cleanStr = str.replace(/[$\u20B9₹€£]/g, "").trim();

  // Extract the numeric part and modifier letters
  const numMatch = cleanStr.match(/([\d.]+)\s*([a-zA-Z]*)/);
  if (!numMatch) {
    return { value: 0, currency };
  }

  const rawNum = parseFloat(numMatch[1]);
  const modifier = numMatch[2] || "";

  if (isNaN(rawNum)) {
    return { value: 0, currency };
  }

  let multiplier = 1;

  if (modifier.startsWith("k") || modifier === "thousand") {
    multiplier = 1000;
  } else if (modifier.startsWith("l") || modifier === "lac" || modifier === "lakh" || modifier === "lakhs") {
    multiplier = 100000;
  } else if (modifier.startsWith("cr") || modifier === "crore" || modifier === "crores") {
    multiplier = 10000000;
  } else if (modifier.startsWith("m") || modifier === "million" || modifier === "mn") {
    multiplier = 1000000;
  } else if (modifier.startsWith("b") || modifier === "billion") {
    multiplier = 1000000000;
  }

  return {
    value: rawNum * multiplier,
    currency,
  };
}
