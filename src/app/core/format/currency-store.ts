import { Injectable, computed, signal } from '@angular/core';

export const DISPLAY_CURRENCIES = [
  'USD',
  'MXN',
  'PEN',
  'COP',
  'BRL',
  'CLP',
  'ARS',
  'EUR',
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const RATE_STORAGE_KEY = 'yokai-hardcore-store.currency.v1';
const FRANKFURTER_URL =
  'https://api.frankfurter.dev/v2/rates?base=USD&quotes=MXN,PEN,COP,BRL,CLP,ARS,EUR';
const DISPLAY_CURRENCY_SET = new Set<string>(DISPLAY_CURRENCIES);

function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return value !== null && DISPLAY_CURRENCY_SET.has(value);
}

function readStoredCurrency(): DisplayCurrency {
  try {
    const stored = globalThis.localStorage?.getItem(RATE_STORAGE_KEY) ?? null;
    return isDisplayCurrency(stored) ? stored : 'USD';
  } catch {
    return 'USD';
  }
}

@Injectable({ providedIn: 'root' })
export class CurrencyStore {
  private readonly rates = signal<Readonly<Record<DisplayCurrency, number>> | null>(null);
  private readonly selected = signal<DisplayCurrency>('USD');
  private readonly readyState = signal(false);
  private readonly failedState = signal(false);
  private loadingStarted = false;

  readonly currency = this.selected.asReadonly();
  readonly rateReady = this.readyState.asReadonly();
  readonly rateFailed = this.failedState.asReadonly();
  readonly rate = computed(() => this.rates()?.[this.selected()] ?? 1);

  load(): void {
    if (this.loadingStarted) return;
    this.loadingStarted = true;
    void this.loadRates();
  }

  setCurrency(value: string): void {
    if (!this.readyState() || !isDisplayCurrency(value)) return;
    this.selected.set(value);
    try {
      globalThis.localStorage?.setItem(RATE_STORAGE_KEY, value);
    } catch {
      // The selection remains valid for this visit when storage is unavailable.
    }
  }

  private async loadRates(): Promise<void> {
    try {
      if (typeof fetch !== 'function') throw new Error('fetch is unavailable');
      const response = await fetch(FRANKFURTER_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Frankfurter returned ${response.status}`);
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error('Frankfurter response was not a rate list');

      const rates: Partial<Record<DisplayCurrency, number>> = { USD: 1 };
      const seen = new Set<DisplayCurrency>();
      for (const item of payload) {
        if (typeof item !== 'object' || item === null) continue;
        const row = item as { base?: unknown; quote?: unknown; rate?: unknown; date?: unknown };
        if (row.base !== 'USD' || typeof row.quote !== 'string') continue;
        if (!isDisplayCurrency(row.quote) || row.quote === 'USD') continue;
        const rateDate =
          typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
            ? Date.parse(`${row.date}T00:00:00Z`)
            : Number.NaN;
        if (
          !Number.isFinite(rateDate) ||
          new Date(rateDate).toISOString().slice(0, 10) !== row.date
        ) {
          throw new Error('Frankfurter returned an invalid rate date');
        }
        if (typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0) {
          throw new Error('Frankfurter returned an invalid rate');
        }
        if (seen.has(row.quote)) throw new Error('Frankfurter returned a duplicate quote');
        seen.add(row.quote);
        rates[row.quote] = row.rate;
      }

      if (DISPLAY_CURRENCIES.some((currency) => rates[currency] === undefined)) {
        throw new Error('Frankfurter response was missing a supported currency');
      }

      this.rates.set(rates as Record<DisplayCurrency, number>);
      this.readyState.set(true);
      this.failedState.set(false);
      this.selected.set(readStoredCurrency());
    } catch {
      // A failed or malformed reference-rate response must never change the USD display.
      this.rates.set({ USD: 1 } as Record<DisplayCurrency, number>);
      this.readyState.set(false);
      this.failedState.set(true);
      this.selected.set('USD');
    }
  }
}
