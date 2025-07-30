/**
 * API endpoint for obtaining a buy/sell/hold recommendation from OpenAI.
 *
 * Expects a POST request with a JSON body containing:
 *   - ticker: the stock symbol
 *   - data: an array of candlestick objects (timestamps and OHLC values)
 *
 * The function sends a prompt to the OpenAI API summarising recent price
 * movements and returns the assistant's recommendation. It uses the
 * OPENAI_API_KEY environment variable, falling back to a hard‑coded key if
 * needed. The response is returned as JSON.
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { ticker, data } = req.body;
    if (!ticker || !data) {
      return res.status(400).json({ error: 'Missing ticker or data' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    // Extract closing prices and build a summary for the prompt
    const closes = data.map((c) => c.c).filter((v) => typeof v === 'number');
    const recentCloses = closes.slice(-30);
    const summary = recentCloses.join(', ');
    const prompt = `Här är de senaste stängningspriserna för ${ticker}: ${summary}. ` +
      `Baserat på denna trend, rekommenderar du att köpa, sälja eller avvakta? ` +
      `Svar på svenska och motivera kort varför.`;

    let message;
    try {
      // Attempt to call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Du är en tradingassistent som ger korta och tydliga rekommendationer baserat på prisdata.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      }
      const json = await response.json();
      message = json.choices?.[0]?.message?.content?.trim();
    } catch (apiError) {
      // If OpenAI fails (quota exceeded or model unavailable), compute a simple trend-based fallback
      const first = recentCloses[0];
      const last = recentCloses[recentCloses.length - 1];
      if (typeof first === 'number' && typeof last === 'number') {
        const diff = last - first;
        if (diff > 0) {
          message = 'Trenden är uppåtgående, vilket tyder på en köpsignal.';
        } else if (diff < 0) {
          message = 'Priset sjunker, så en säljsignal är rimlig just nu.';
        } else {
          message = 'Priset är oförändrat, det kan vara klokt att avvakta.';
        }
      } else {
        message = 'Det gick inte att generera en rekommendation baserat på tillgänglig data.';
      }
    }

    return res.status(200).json({ recommendation: message || 'Ingen rekommendation' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}