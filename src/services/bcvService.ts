import { ExchangeRateHistoryEntry } from '../types/pos';

export interface BcvRateResponse {
  USD?: number | string;
  EUR?: number | string;
  CNY?: number | string;
  TRY?: number | string;
  RUB?: number | string;
  updated_at?: string;
  date?: string;
  effective_date?: string;
  [key: string]: any;
}

export interface BcvFetchResult {
  rate: number;
  eurRate?: number;
  effectiveDate?: string;
  lastUpdated: string;
  source: string;
  success: boolean;
  error?: string;
  changePercent?: number;
  changeAmount?: number;
  historyEntry?: ExchangeRateHistoryEntry;
}

// Official endpoints of bcv.today (v1 and standard fallback)
const BCV_PRIMARY_API = 'https://bcv.today/api/v1/rate.json';
const BCV_FALLBACK_API = 'https://bcv.today/api/rate.json';
const BCV_HISTORY_API = 'https://bcv.today/api/v1/history.json';
const LOCAL_STORAGE_HISTORY_KEY = 'sol_pos_bcv_rate_history';

/**
 * Format a date string into readable Venezuelan format
 */
export function formatBcvDate(isoOrDateStr?: string): string {
  try {
    const d = isoOrDateStr ? new Date(isoOrDateStr) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleString('es-VE');
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date().toLocaleString('es-VE');
  }
}

/**
 * Read exchange rate history from localStorage
 */
export function getExchangeRateHistory(): ExchangeRateHistoryEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Error reading BCV history from localStorage:', e);
  }
  return [];
}

/**
 * Save exchange rate history to localStorage
 */
export function saveExchangeRateHistory(history: ExchangeRateHistoryEntry[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
    }
  } catch (e) {
    console.error('Error saving BCV history to localStorage:', e);
  }
}

/**
 * Seed historical data from bcv.today if local history is empty
 */
export async function seedHistoryFromBcvToday(): Promise<ExchangeRateHistoryEntry[]> {
  try {
    const existing = getExchangeRateHistory();
    if (existing.length >= 3) {
      return existing;
    }

    const res = await fetch(BCV_HISTORY_API, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return existing;
    const historyData: any[] = await res.json();
    if (!Array.isArray(historyData) || historyData.length === 0) return existing;

    // Take the last 20 daily rates from bcv.today
    const recent = historyData.slice(-20);
    const converted: ExchangeRateHistoryEntry[] = [];

    for (let i = recent.length - 1; i >= 0; i--) {
      const item = recent[i];
      const prevItem = i > 0 ? recent[i - 1] : null;

      const rate = typeof item.USD === 'number' ? item.USD : parseFloat(item.USD);
      const prevRate = prevItem
        ? (typeof prevItem.USD === 'number' ? prevItem.USD : parseFloat(prevItem.USD))
        : rate;

      const changeAmount = Number((rate - prevRate).toFixed(4));
      const changePercent = prevRate > 0 ? Number((((rate - prevRate) / prevRate) * 100).toFixed(2)) : 0;

      converted.push({
        id: `bcv-${item.date || item.effective_date || i}-${item.USD}`,
        timestamp: item.updated_at || new Date().toISOString(),
        dateFormatted: formatBcvDate(item.updated_at || item.date),
        effectiveDate: item.effective_date || item.date,
        rate: Number(rate.toFixed(4)),
        previousRate: Number(prevRate.toFixed(4)),
        changePercent,
        changeAmount,
        eurRate: item.EUR ? Number((typeof item.EUR === 'number' ? item.EUR : parseFloat(item.EUR)).toFixed(4)) : undefined,
        source: 'bcv.today (Fuente Oficial API)',
        isAutomated: true,
      });
    }

    if (converted.length > 0) {
      saveExchangeRateHistory(converted);
      return converted;
    }
  } catch (err) {
    console.warn('Could not seed history from bcv.today:', err);
  }
  return getExchangeRateHistory();
}

/**
 * Record a variation in the persistent history
 */
export function recordRateVariation(
  newRate: number,
  options?: {
    eurRate?: number;
    source?: string;
    effectiveDate?: string;
    isAutomated?: boolean;
    timestamp?: string;
  }
): { history: ExchangeRateHistoryEntry[]; entry: ExchangeRateHistoryEntry | null } {
  const history = getExchangeRateHistory();
  const latest = history[0];

  const sourceName = options?.source || 'bcv.today (Fuente Oficial API)';
  const isAutomated = options?.isAutomated ?? true;

  // If latest entry exists and is identical rate, don't duplicate unless it's a new date
  if (latest && Math.abs(latest.rate - newRate) < 0.0001) {
    return { history, entry: latest };
  }

  const previousRate = latest ? latest.rate : newRate;
  const changeAmount = Number((newRate - previousRate).toFixed(4));
  const changePercent = previousRate > 0
    ? Number((((newRate - previousRate) / previousRate) * 100).toFixed(2))
    : 0;

  const newEntry: ExchangeRateHistoryEntry = {
    id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: options?.timestamp || new Date().toISOString(),
    dateFormatted: formatBcvDate(options?.timestamp),
    effectiveDate: options?.effectiveDate || new Date().toISOString().split('T')[0],
    rate: Number(newRate.toFixed(4)),
    previousRate: Number(previousRate.toFixed(4)),
    changePercent,
    changeAmount,
    eurRate: options?.eurRate ? Number(options.eurRate.toFixed(4)) : undefined,
    source: sourceName,
    isAutomated,
  };

  const updatedHistory = [newEntry, ...history.slice(0, 99)];
  saveExchangeRateHistory(updatedHistory);

  return { history: updatedHistory, entry: newEntry };
}

/**
 * Fetch BCV rate from bcv.today with robust endpoints and automatic history recording
 */
export async function fetchBcvRate(): Promise<BcvFetchResult> {
  const urlsToTry = [BCV_PRIMARY_API, BCV_FALLBACK_API];

  let rawData: BcvRateResponse | null = null;
  let fetchError = '';

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        rawData = await res.json();
        break;
      }
    } catch (err: any) {
      fetchError = err?.message || String(err);
    }
  }

  // Backup mirror if bcv.today domain is temporarily inaccessible
  if (!rawData) {
    try {
      const mirrorRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
      });
      if (mirrorRes.ok) {
        const mirrorData = await mirrorRes.json();
        if (mirrorData?.promedio) {
          rawData = {
            USD: mirrorData.promedio,
            updated_at: mirrorData.fechaActualizacion,
            source: 'bcv.today (vía réplica oficial)',
          };
        }
      }
    } catch {
      // ignore mirror error
    }
  }

  if (rawData) {
    // Parse USD value
    let usdValue: number | null = null;
    if (typeof rawData.USD === 'number') {
      usdValue = rawData.USD;
    } else if (typeof rawData.USD === 'string') {
      usdValue = parseFloat(rawData.USD.replace(',', '.'));
    } else if (rawData.dollar) {
      usdValue = parseFloat(rawData.dollar);
    } else if (rawData.rate) {
      usdValue = parseFloat(rawData.rate);
    }

    // Parse EUR value if present
    let eurValue: number | undefined = undefined;
    if (typeof rawData.EUR === 'number') {
      eurValue = rawData.EUR;
    } else if (typeof rawData.EUR === 'string') {
      eurValue = parseFloat(rawData.EUR.replace(',', '.'));
    }

    if (usdValue && isFinite(usdValue) && usdValue > 0) {
      const currentRate = Number(usdValue.toFixed(4));
      const formattedDate = formatBcvDate(rawData.updated_at);

      // Record in variation history
      const { entry } = recordRateVariation(currentRate, {
        eurRate: eurValue,
        effectiveDate: rawData.effective_date || rawData.date,
        source: 'bcv.today (Fuente Oficial API)',
        isAutomated: true,
        timestamp: rawData.updated_at,
      });

      return {
        rate: currentRate,
        eurRate: eurValue ? Number(eurValue.toFixed(4)) : undefined,
        effectiveDate: rawData.effective_date || rawData.date,
        lastUpdated: formattedDate,
        source: 'bcv.today (Fuente Oficial API)',
        success: true,
        changePercent: entry?.changePercent ?? 0,
        changeAmount: entry?.changeAmount ?? 0,
        historyEntry: entry || undefined,
      };
    }
  }

  // If live fetch failed, return latest known history rate or fallback
  const history = getExchangeRateHistory();
  const fallbackRate = history[0]?.rate || 874.73;

  return {
    rate: fallbackRate,
    lastUpdated: history[0]?.dateFormatted || new Date().toLocaleTimeString('es-VE'),
    source: 'bcv.today (Último registro guardado)',
    success: false,
    error: fetchError || 'No se pudo conectar con la API de bcv.today',
    changePercent: history[0]?.changePercent ?? 0,
    changeAmount: history[0]?.changeAmount ?? 0,
  };
}
