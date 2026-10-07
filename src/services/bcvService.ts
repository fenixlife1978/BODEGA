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
  lastUpdated: string;
  source: string;
  success: boolean;
  error?: string;
}

const BCV_API_URL = 'https://bcv.today/api/rate.json';

export async function fetchBcvRate(): Promise<BcvFetchResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(BCV_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: BcvRateResponse = await response.json();
    
    // Extract USD rate
    let usdValue: number | null = null;
    if (typeof data.USD === 'number') {
      usdValue = data.USD;
    } else if (typeof data.USD === 'string') {
      usdValue = parseFloat(data.USD.replace(',', '.'));
    } else if (data.dollar) {
      usdValue = parseFloat(data.dollar);
    } else if (data.rate) {
      usdValue = parseFloat(data.rate);
    }

    if (usdValue && isFinite(usdValue) && usdValue > 0) {
      const formattedDate = data.updated_at 
        ? new Date(data.updated_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

      return {
        rate: Number(usdValue.toFixed(4)),
        lastUpdated: formattedDate,
        source: 'bcv.today (BCV Oficial)',
        success: true,
      };
    } else {
      throw new Error('Formato de tasa USD no válido en la respuesta');
    }
  } catch (err: any) {
    console.warn('No se pudo obtener la tasa en vivo de bcv.today:', err?.message || err);
    return {
      rate: 42.50, // Default fallback
      lastUpdated: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      source: 'BCV Oficial',
      success: false,
      error: err?.message || 'Error de conexión',
    };
  }
}
