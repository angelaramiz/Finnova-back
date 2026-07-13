import { Router, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const marketRouter = Router();

interface AssetSummary {
  name: string;
  ticker: string;
  price: number;
  change: number;
}

interface MonthlyReturn {
  m: string;
  avg: number;
  pp: number;
}

interface CalendarSignal {
  m: string;
  signal: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'active';
}

interface PnlRow {
  yr: number;
  e: number;
  x: number;
  pnl: number;
}

interface AssetAnalytics {
  summary: AssetSummary;
  monthlyReturns: MonthlyReturn[];
  calendarSignals: CalendarSignal[];
  pnlHistory: PnlRow[];
  heroData: { yr: number; pnl: number }[];
  moodValue: number;
  winRate: number;
  avgPnl: number;
  signalTitle: string;
  signalDescription: string;
  confidenceText: string;
  bannerTitle: string;
  bannerDescription: string;
}

const ASSETS: Record<string, AssetSummary> = {
  XAU: { name: 'Oro', ticker: 'XAU', price: 4113, change: -0.42 },
  XAG: { name: 'Plata', ticker: 'XAG', price: 34.50, change: 0.38 },
  CL: { name: 'Petroleo', ticker: 'CL', price: 75.80, change: -1.15 },
  SPX: { name: 'S&P 500', ticker: 'SPX', price: 6024, change: 0.55 },
};

const ANALYTICS: Record<string, Omit<AssetAnalytics, 'summary'>> = {
  XAU: {
    monthlyReturns: [
      { m: 'Ene', avg: 0.66, pp: 47 }, { m: 'Feb', avg: 0.92, pp: 47 },
      { m: 'Mar', avg: 1.35, pp: 53 }, { m: 'Abr', avg: -0.33, pp: 40 },
      { m: 'May', avg: -0.67, pp: 40 }, { m: 'Jun', avg: 1.60, pp: 67 },
      { m: 'Jul', avg: 2.11, pp: 53 }, { m: 'Ago', avg: -1.52, pp: 27 },
      { m: 'Sep', avg: 1.28, pp: 60 }, { m: 'Oct', avg: -1.43, pp: 47 },
      { m: 'Nov', avg: 0.67, pp: 60 }, { m: 'Dic', avg: 0.57, pp: 47 },
    ],
    calendarSignals: [
      { m: 'ENE', signal: '+67%', type: 'neutral' }, { m: 'FEB', signal: 'SHORT', type: 'bearish' },
      { m: 'MAR', signal: '+53%', type: 'neutral' }, { m: 'ABR', signal: '-60%', type: 'bearish' },
      { m: 'MAY', signal: '-60%', type: 'bearish' }, { m: 'JUN', signal: 'DEBIL', type: 'bearish' },
      { m: 'JUL', signal: 'ENTRADA', type: 'active' }, { m: 'AGO', signal: '+65%', type: 'bullish' },
      { m: 'SEP', signal: 'SHORT', type: 'bearish' }, { m: 'OCT', signal: '+60%', type: 'bullish' },
      { m: 'NOV', signal: '+60%', type: 'bullish' }, { m: 'DIC', signal: '+60%', type: 'bullish' },
    ],
    pnlHistory: [
      { yr: 2010, e: 1245, x: 1184, pnl: -6100 }, { yr: 2011, e: 1499, x: 1613, pnl: 11400 },
      { yr: 2012, e: 1601, x: 1615, pnl: 1400 }, { yr: 2013, e: 1225, x: 1315, pnl: 9000 },
      { yr: 2014, e: 1315, x: 1303, pnl: -1200 }, { yr: 2015, e: 1173, x: 1095, pnl: -7800 },
      { yr: 2016, e: 1322, x: 1350, pnl: 2800 }, { yr: 2017, e: 1241, x: 1269, pnl: 2800 },
      { yr: 2018, e: 1252, x: 1224, pnl: -2800 }, { yr: 2019, e: 1409, x: 1427, pnl: 1800 },
      { yr: 2020, e: 1781, x: 1970, pnl: 18900 }, { yr: 2021, e: 1766, x: 1813, pnl: 4700 },
      { yr: 2022, e: 1807, x: 1757, pnl: -5000 }, { yr: 2023, e: 1912, x: 1958, pnl: 4600 },
      { yr: 2024, e: 2326, x: 2426, pnl: 10000 },
    ],
    heroData: [
      { yr: 2016, pnl: 2800 }, { yr: 2017, pnl: 2800 }, { yr: 2018, pnl: -2800 },
      { yr: 2019, pnl: 1800 }, { yr: 2020, pnl: 18900 }, { yr: 2021, pnl: 4700 },
      { yr: 2022, pnl: -5000 }, { yr: 2023, pnl: 4600 }, { yr: 2024, pnl: 10000 },
    ],
    moodValue: 0.73,
    winRate: 67,
    avgPnl: 2967,
    signalTitle: 'LONG Oro — Inicio de Flujo Fuerte',
    signalDescription: 'Convergencia de fuentes cuantitativas independientes. Historial positivo de 11 de los ultimos 15 anos.',
    confidenceText: 'Confianza Estacional',
    bannerTitle: 'El oro tiende a subir en julio — Periodo de alta probabilidad alcista',
    bannerDescription: 'Basado en datos de 15 anos de COMEX. No es asesoria financiera.',
  },
  XAG: {
    monthlyReturns: [
      { m: 'Ene', avg: 0.45, pp: 43 }, { m: 'Feb', avg: 0.78, pp: 50 },
      { m: 'Mar', avg: 1.12, pp: 48 }, { m: 'Abr', avg: -0.52, pp: 35 },
      { m: 'May', avg: -0.88, pp: 38 }, { m: 'Jun', avg: 1.35, pp: 55 },
      { m: 'Jul', avg: 1.89, pp: 50 }, { m: 'Ago', avg: -1.25, pp: 30 },
      { m: 'Sep', avg: 0.98, pp: 52 }, { m: 'Oct', avg: -1.12, pp: 42 },
      { m: 'Nov', avg: 0.55, pp: 48 }, { m: 'Dic', avg: 0.42, pp: 45 },
    ],
    calendarSignals: [
      { m: 'ENE', signal: '+55%', type: 'neutral' }, { m: 'FEB', signal: 'NEUTRAL', type: 'neutral' },
      { m: 'MAR', signal: '+48%', type: 'neutral' }, { m: 'ABR', signal: '-52%', type: 'bearish' },
      { m: 'MAY', signal: '-65%', type: 'bearish' }, { m: 'JUN', signal: '+55%', type: 'bullish' },
      { m: 'JUL', signal: '+58%', type: 'bullish' }, { m: 'AGO', signal: '-58%', type: 'bearish' },
      { m: 'SEP', signal: '+52%', type: 'bullish' }, { m: 'OCT', signal: '-60%', type: 'bearish' },
      { m: 'NOV', signal: '+48%', type: 'neutral' }, { m: 'DIC', signal: '+45%', type: 'neutral' },
    ],
    pnlHistory: [
      { yr: 2015, e: 18.50, x: 17.20, pnl: -1300 }, { yr: 2016, e: 17.50, x: 19.30, pnl: 1800 },
      { yr: 2017, e: 19.20, x: 18.80, pnl: -400 }, { yr: 2018, e: 18.50, x: 17.10, pnl: -1400 },
      { yr: 2019, e: 17.30, x: 19.60, pnl: 2300 }, { yr: 2020, e: 19.80, x: 24.50, pnl: 4700 },
      { yr: 2021, e: 24.30, x: 22.80, pnl: -1500 }, { yr: 2022, e: 22.50, x: 23.90, pnl: 1400 },
      { yr: 2023, e: 23.80, x: 25.10, pnl: 1300 }, { yr: 2024, e: 25.00, x: 28.50, pnl: 3500 },
    ],
    heroData: [
      { yr: 2016, pnl: 4800 }, { yr: 2017, pnl: -1200 }, { yr: 2018, pnl: -3500 },
      { yr: 2019, pnl: 2900 }, { yr: 2020, pnl: 14500 }, { yr: 2021, pnl: -2200 },
      { yr: 2022, pnl: 800 }, { yr: 2023, pnl: 1500 }, { yr: 2024, pnl: 9200 },
    ],
    moodValue: 0.58,
    winRate: 55,
    avgPnl: 1800,
    signalTitle: 'LONG Plata — Correlacion con Oro',
    signalDescription: 'La plata sigue la estacionalidad del oro con mayor volatilidad. Momento favorable por demanda industrial.',
    confidenceText: 'Confianza Estacional',
    bannerTitle: 'La plata muestra fortaleza en julio — Demanda industrial activa',
    bannerDescription: 'Basado en datos historicos de COMEX. No es asesoria financiera.',
  },
  CL: {
    monthlyReturns: [
      { m: 'Ene', avg: -0.88, pp: 35 }, { m: 'Feb', avg: 0.45, pp: 48 },
      { m: 'Mar', avg: 1.55, pp: 55 }, { m: 'Abr', avg: 0.72, pp: 50 },
      { m: 'May', avg: -1.25, pp: 32 }, { m: 'Jun', avg: -0.55, pp: 40 },
      { m: 'Jul', avg: 1.85, pp: 58 }, { m: 'Ago', avg: -0.95, pp: 38 },
      { m: 'Sep', avg: -1.65, pp: 28 }, { m: 'Oct', avg: 0.88, pp: 52 },
      { m: 'Nov', avg: 0.35, pp: 45 }, { m: 'Dic', avg: 0.62, pp: 48 },
    ],
    calendarSignals: [
      { m: 'ENE', signal: '-60%', type: 'bearish' }, { m: 'FEB', signal: 'NEUTRAL', type: 'neutral' },
      { m: 'MAR', signal: '+55%', type: 'bullish' }, { m: 'ABR', signal: '+50%', type: 'neutral' },
      { m: 'MAY', signal: '-65%', type: 'bearish' }, { m: 'JUN', signal: '-55%', type: 'bearish' },
      { m: 'JUL', signal: '+58%', type: 'bullish' }, { m: 'AGO', signal: '-52%', type: 'bearish' },
      { m: 'SEP', signal: '-70%', type: 'bearish' }, { m: 'OCT', signal: '+52%', type: 'bullish' },
      { m: 'NOV', signal: '+45%', type: 'neutral' }, { m: 'DIC', signal: '+48%', type: 'neutral' },
    ],
    pnlHistory: [
      { yr: 2015, e: 52.50, x: 48.20, pnl: -4300 }, { yr: 2016, e: 48.00, x: 53.80, pnl: 5800 },
      { yr: 2017, e: 54.20, x: 56.50, pnl: 2300 }, { yr: 2018, e: 56.00, x: 48.20, pnl: -7800 },
      { yr: 2019, e: 48.50, x: 56.20, pnl: 7700 }, { yr: 2020, e: 56.80, x: 42.50, pnl: -14300 },
      { yr: 2021, e: 42.00, x: 68.50, pnl: 26500 }, { yr: 2022, e: 68.00, x: 80.20, pnl: 12200 },
      { yr: 2023, e: 80.50, x: 72.80, pnl: -7700 }, { yr: 2024, e: 73.00, x: 76.50, pnl: 3500 },
    ],
    heroData: [
      { yr: 2016, pnl: 3200 }, { yr: 2017, pnl: 2800 }, { yr: 2018, pnl: -8200 },
      { yr: 2019, pnl: 5500 }, { yr: 2020, pnl: -18000 }, { yr: 2021, pnl: 16500 },
      { yr: 2022, pnl: 12000 }, { yr: 2023, pnl: -4500 }, { yr: 2024, pnl: 3100 },
    ],
    moodValue: 0.45,
    winRate: 48,
    avgPnl: 1950,
    signalTitle: 'LONG Petroleo — Rebote estacional de verano',
    signalDescription: 'Julio tradicionalmente muestra recuperacion en crudo por demanda de combustibles en temporada de conduccion.',
    confidenceText: 'Confianza Estacional',
    bannerTitle: 'El petroleo tiende a repuntar en julio — Demanda estacional alta',
    bannerDescription: 'Basado en datos historicos de NYMEX. No es asesoria financiera.',
  },
  SPX: {
    monthlyReturns: [
      { m: 'Ene', avg: 0.85, pp: 52 }, { m: 'Feb', avg: 0.22, pp: 45 },
      { m: 'Mar', avg: 0.55, pp: 48 }, { m: 'Abr', avg: 1.45, pp: 58 },
      { m: 'May', avg: 0.35, pp: 42 }, { m: 'Jun', avg: 0.65, pp: 50 },
      { m: 'Jul', avg: 1.55, pp: 55 }, { m: 'Ago', avg: -0.45, pp: 40 },
      { m: 'Sep', avg: -0.75, pp: 35 }, { m: 'Oct', avg: 0.52, pp: 48 },
      { m: 'Nov', avg: 1.85, pp: 62 }, { m: 'Dic', avg: 1.25, pp: 58 },
    ],
    calendarSignals: [
      { m: 'ENE', signal: '+52%', type: 'neutral' }, { m: 'FEB', signal: 'DEBIL', type: 'neutral' },
      { m: 'MAR', signal: '+48%', type: 'neutral' }, { m: 'ABR', signal: '+58%', type: 'bullish' },
      { m: 'MAY', signal: 'NEUTRAL', type: 'neutral' }, { m: 'JUN', signal: '+50%', type: 'neutral' },
      { m: 'JUL', signal: '+55%', type: 'bullish' }, { m: 'AGO', signal: '-45%', type: 'bearish' },
      { m: 'SEP', signal: '-65%', type: 'bearish' }, { m: 'OCT', signal: '+48%', type: 'neutral' },
      { m: 'NOV', signal: '+62%', type: 'bullish' }, { m: 'DIC', signal: '+58%', type: 'bullish' },
    ],
    pnlHistory: [
      { yr: 2015, e: 2058, x: 2044, pnl: -1400 }, { yr: 2016, e: 2038, x: 2239, pnl: 20100 },
      { yr: 2017, e: 2239, x: 2674, pnl: 43500 }, { yr: 2018, e: 2674, x: 2507, pnl: -16700 },
      { yr: 2019, e: 2507, x: 3231, pnl: 72400 }, { yr: 2020, e: 3231, x: 3756, pnl: 52500 },
      { yr: 2021, e: 3756, x: 4766, pnl: 101000 }, { yr: 2022, e: 4766, x: 3839, pnl: -92700 },
      { yr: 2023, e: 3839, x: 4769, pnl: 93000 }, { yr: 2024, e: 4769, x: 5881, pnl: 111200 },
    ],
    heroData: [
      { yr: 2016, pnl: 9500 }, { yr: 2017, pnl: 19400 }, { yr: 2018, pnl: -6200 },
      { yr: 2019, pnl: 28900 }, { yr: 2020, pnl: 16300 }, { yr: 2021, pnl: 26900 },
      { yr: 2022, pnl: -18100 }, { yr: 2023, pnl: 24200 }, { yr: 2024, pnl: 21500 },
    ],
    moodValue: 0.68,
    winRate: 62,
    avgPnl: 24500,
    signalTitle: 'LONG S&P 500 — Rally de verano',
    signalDescription: 'Julio y noviembre son los meses mas fuertes del S&P 500 en los ultimos 15 anos.',
    confidenceText: 'Confianza Estacional',
    bannerTitle: 'El S&P 500 muestra tendencia positiva en julio — Datos historicos favorables',
    bannerDescription: 'Basado en datos historicos del S&P 500. No es asesoria financiera.',
  },
};

let cachedPrices: Record<string, AssetSummary> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000;

async function fetchPricesViaGemini(): Promise<Record<string, AssetSummary> | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const tickers = Object.keys(ASSETS).join(', ');
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Search the web for current prices of these financial assets as of ${today}:
${tickers}

For each asset, return the current price and the daily percentage change.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "XAU": {"price": <number>, "change": <number>},
  "XAG": {"price": <number>, "change": <number>},
  "CL": {"price": <number>, "change": <number>},
  "SPX": {"price": <number>, "change": <number>}
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text.trim());

    const enriched: Record<string, AssetSummary> = { ...ASSETS };
    let hasRealData = false;

    for (const ticker of Object.keys(enriched)) {
      if (parsed[ticker] && typeof parsed[ticker].price === 'number' && parsed[ticker].price > 0) {
        enriched[ticker] = {
          ...enriched[ticker],
          price: Math.round(parsed[ticker].price * 100) / 100,
          change: typeof parsed[ticker].change === 'number'
            ? Math.round(parsed[ticker].change * 100) / 100
            : enriched[ticker].change,
        };
        hasRealData = true;
      }
    }

    return hasRealData ? enriched : null;
  } catch (err: any) {
    console.error('[Market] Gemini fetch failed:', err.message || err);
    return null;
  }
}

async function getPrices(): Promise<Record<string, AssetSummary>> {
  const now = Date.now();

  if (cachedPrices && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPrices;
  }

  const livePrices = await fetchPricesViaGemini();
  if (livePrices) {
    cachedPrices = livePrices;
    cacheTimestamp = now;
    return livePrices;
  }

  if (cachedPrices) {
    return cachedPrices;
  }

  return { ...ASSETS };
}

marketRouter.get('/prices', async (_, res: Response): Promise<void> => {
  try {
    const prices = await getPrices();
    const cacheAge = cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) : 0;
    const ticker = _.query.ticker as string || '';
    const assetKeys = ticker && ASSETS[ticker] ? [ticker] : Object.keys(ASSETS);

    const assets = assetKeys.map((t) => {
      const p = prices[t];
      const a = ANALYTICS[t];
      return {
        ticker: t,
        name: p.name,
        price: p.price,
        change: p.change,
        monthlyReturns: a.monthlyReturns,
        calendarSignals: a.calendarSignals,
        pnlHistory: a.pnlHistory,
        heroData: a.heroData,
        moodValue: a.moodValue,
        winRate: a.winRate,
        avgPnl: a.avgPnl,
        signalTitle: a.signalTitle,
        signalDescription: a.signalDescription,
        confidenceText: a.confidenceText,
        bannerTitle: a.bannerTitle,
        bannerDescription: a.bannerDescription,
      };
    });

    res.status(200).json({
      assets,
      updated: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null,
      cacheAgeSeconds: cacheAge,
    });
  } catch (err: any) {
    console.error('[Market] Error serving prices:', err.message || err);
    const fallback = Object.keys(ASSETS).map((t) => {
      const p = ASSETS[t];
      const a = ANALYTICS[t];
      return { ticker: t, name: p.name, price: p.price, change: p.change, ...a };
    });
    res.status(200).json({ assets: fallback, updated: null, cacheAgeSeconds: 0, source: 'embedded-fallback' });
  }
});
