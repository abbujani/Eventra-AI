const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'ar-AE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

function currencyToLocale(currency: string): string {
  return CURRENCY_LOCALES[currency] ?? 'en-US';
}

/** Formats an amount without silently assuming a currency. */
export function formatCurrency(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '—';
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'XXX';
  try {
    return new Intl.NumberFormat(currencyToLocale(safeCurrency), {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${safeCurrency}`;
  }
}

/** Compact currency for tight spaces (chart centres, badges): ₹1.2L, $45K. */
export function formatCompactCurrency(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '—';
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'XXX';
  try {
    return new Intl.NumberFormat(currencyToLocale(safeCurrency), {
      style: 'currency',
      currency: safeCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, safeCurrency);
  }
}
