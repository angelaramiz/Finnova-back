import { Router, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const marketRouter = Router();

const ASSETS: Record<string, { name: string; ticker: string; price: number; change: number }> = {
  XAU: { name: 'Oro', ticker: 'XAU', price: 4113, change: -0.42 },
  XAG: { name: 'Plata', ticker: 'XAG', price: 34.50, change: 0.38 },
  CL: { name: 'Petroleo', ticker: 'CL', price: 75.80, change: -1.15 },
  SPX: { name: 'S&P 500', ticker: 'SPX', price: 6024, change: 0.55 },
};

const ASSET_SEARCH_QUERIES: Record<string, string> = {
  XAU: 'XAUUSD gold spot price per troy ounce today 2026',
  XAG: 'XAGUSD silver spot price per troy ounce today 2026',
  CL: 'WTI crude oil CL futures price per barrel today 2026',
  SPX: 'S&P 500 SPX index level today 2026',
};

let cachedPrices: typeof ASSETS | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchPricesViaGemini(): Promise<typeof ASSETS | null> {
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

    const enriched: typeof ASSETS = { ...ASSETS };
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

async function getPrices(): Promise<typeof ASSETS> {
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

    const assets = Object.entries(prices).map(([ticker, data]) => ({
      ticker,
      name: data.name,
      price: data.price,
      change: data.change,
    }));

    res.status(200).json({
      assets,
      updated: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null,
      cacheAgeSeconds: cacheAge,
    });
  } catch (err: any) {
    console.error('[Market] Error serving prices:', err.message || err);
    const fallback = Object.entries(ASSETS).map(([ticker, data]) => ({
      ticker,
      name: data.name,
      price: data.price,
      change: data.change,
    }));
    res.status(200).json({
      assets: fallback,
      updated: null,
      cacheAgeSeconds: 0,
      source: 'embedded-fallback',
    });
  }
});
