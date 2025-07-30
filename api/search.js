/**
 * API endpoint for searching stock tickers using Yahoo Finance's search API.
 *
 * This function expects a `q` query parameter and returns a list of potential
 * matches containing the symbol and name. It uses the public Yahoo Finance
 * search endpoint which does not require authentication.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const query = req.query.q;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', query);
    url.searchParams.set('quotesCount', '10');
    url.searchParams.set('newsCount', '0');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Yahoo search API returned ${response.status}`);
    }
    const data = await response.json();
    const quotes = data.quotes || [];
    const results = quotes.map((item) => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.name || item.symbol,
    }));
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}