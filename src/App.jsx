import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Tooltip, Legend } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';

// Register the necessary Chart.js components
ChartJS.register(
  CandlestickController,
  CandlestickElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
);

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [symbol, setSymbol] = useState(null);
  const [candles, setCandles] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // Fetch search suggestions as the user types
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data.results);
      } catch (err) {
        console.error('Error fetching suggestions:', err.message);
      }
    };
    // Debounce suggestions by 300ms
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Fetch candles and recommendation when a symbol is selected
  useEffect(() => {
    if (!symbol) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const candleRes = await axios.get(`/api/candles?symbol=${encodeURIComponent(symbol)}`);
        const { candles: rawCandles } = candleRes.data;
        setCandles(rawCandles);
        updateChart(rawCandles);
        await fetchRecommendation(symbol, rawCandles);
      } catch (err) {
        console.error('Error fetching data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Set up periodic refresh every 60 seconds
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const updateChart = (candleData) => {
    const dataset = candleData.map((c) => ({ x: c.t, o: c.o, h: c.h, l: c.l, c: c.c }));
    setChartData({
      datasets: [
        {
          label: symbol,
          data: dataset,
          color: {
            up: '#4caf50',
            down: '#f44336',
            unchanged: '#757575',
          },
        },
      ],
    });
  };

  const fetchRecommendation = async (ticker, candleData) => {
    try {
      const res = await axios.post('/api/recommendation', {
        ticker,
        data: candleData,
      });
      setRecommendation(res.data.recommendation);
    } catch (err) {
      console.error('Error fetching recommendation:', err.message);
    }
  };

  const handleSuggestionClick = (item) => {
    setSymbol(item.symbol);
    setQuery(item.symbol);
    setSuggestions([]);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          tooltipFormat: 'PPpp',
        },
        ticks: {
          source: 'auto',
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: false,
        position: 'right',
        title: {
          display: true,
          text: 'Pris (USD)',
        },
      },
    },
  };

  return (
    <div className="app-container">
      <header>
        <h1>AI Aktie Hjälp</h1>
        <p>Sök efter en aktie och få realtidsdata med AI‑drivna rekommendationer.</p>
      </header>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Sök efter aktie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((item) => (
              <div
                key={item.symbol}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(item)}
              >
                {item.symbol} – {item.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-container">
        {chartData ? (
          <Chart type='candlestick' data={chartData} options={chartOptions} />
        ) : (
          <p>Välj en aktie för att se grafen.</p>
        )}
      </div>
      {loading && <div className="loading">Laddar data...</div>}
      {recommendation && (
        <div className="recommendation">
          <strong>AI‑förslag:</strong> {recommendation}
        </div>
      )}
    </div>
  );
}

export default App;