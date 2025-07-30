/**
 * API endpoint for retrieving candlestick data for a given stock symbol.
 *
 * It fetches data from Yahoo Finance's chart API with 1-minute intervals for
 * the past trading day. The response contains arrays of timestamps and OHLC
 * values which are packaged into a structured JSON payload for the frontend.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol' });
  }

  try {
    // Request 1 day of 1‑minute interval data for the given symbol
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set('range', '1d');
    url.searchParams.set('interval', '1m');
    url.searchParams.set('includePrePost', 'false');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Yahoo chart API returned ${response.status}`);
    }
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: 'No data found' });
    }
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [] } = quote;

    // Build an array of candlesticks with date objects for Chart.js
    const candles = timestamps.map((ts, idx) => ({
      t: ts * 1000, // convert to milliseconds
      o: open[idx],
      h: high[idx],
      l: low[idx],
      c: close[idx],
    })).filter((item) => typeof item.o === 'number');

    return res.status(200).json({ candles });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}