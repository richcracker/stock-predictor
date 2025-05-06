// Required Chart.js plugins
Chart.register(
  Chart.Zoom,
  Chart.FinancialController,
  Chart.CandlestickController,
  Chart.OhlcController,
  Chart.CandlestickElement,
  Chart.OhlcElement
);

// Global variables
let isCandlestick = false;

async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';
  const twelveSymbol = `${symbol}:NASDAQ`;

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    const finnhubData = await finnhubResponse.json();

    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${twelveSymbol}&interval=1day&apikey=${twelveDataAPI}&outputsize=30`);
    const twelveData = await twelveDataResponse.json();

    return { finnhubData, twelveData };
  } catch (error) {
    console.error("Error in fetchStockData:", error);
    throw error;
  }
}

async function fetchPredictions(symbol) {
  try {
    const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
    const data = await response.json();
    return data[symbol] || [];
  } catch (err) {
    console.error("Error fetching predictions:", err);
    return [];
  }
}

function generatePredictedDates(startTime, numPoints = 6) {
  const predictedTimes = [];
  const start = new Date(startTime);
  for (let i = 1; i <= numPoints; i++) {
    const next = new Date(start);
    next.setMinutes(start.getMinutes() + i * 30);
    predictedTimes.push(next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }));
  }
  return predictedTimes;
}

function displayPredictionChart(times, prices, predictedTimes = [], predictedPrices = [], fullDay = false, candlestickData = []) {
  const ctx = document.getElementById('predictionChart').getContext('2d');
  if (window.predictionChart && typeof window.predictionChart.destroy === 'function') {
    window.predictionChart.destroy();
  }

  const data = {
    labels: [...times, ...predictedTimes],
    datasets: []
  };

  if (isCandlestick && candlestickData.length > 0) {
    data.datasets.push({
      label: 'Candlestick Data',
      data: candlestickData.map(entry => ({
        x: entry.datetime,
        o: parseFloat(entry.open),
        h: parseFloat(entry.high),
        l: parseFloat(entry.low),
        c: parseFloat(entry.close)
      })),
      type: 'candlestick',
      color: {
        up: 'green',
        down: 'red',
        unchanged: 'grey'
      }
    });
  } else {
    const actualLine = [...prices, ...Array(predictedTimes.length).fill(null)];
    const predictedLine = [...Array(times.length).fill(null), ...predictedPrices];

    data.datasets.push({
      label: 'Actual Price',
      data: actualLine,
      borderColor: 'rgba(75, 192, 192, 1)',
      tension: 0.1
    }, {
      label: 'Predicted Price',
      data: predictedLine,
      borderColor: 'rgba(255, 99, 132, 1)',
      borderDash: [5, 5],
      tension: 0.3
    });
  }

  window.predictionChart = new Chart(ctx, {
    type: isCandlestick ? 'candlestick' : 'line',
    data: data,
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          mode: 'nearest',
          intersect: false,
        },
        legend: {
          position: 'top'
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          },
          ticks: { autoSkip: true, maxRotation: 45 }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });

  if (fullDay) {
    document.getElementById('nextDayButton').style.display = 'inline-block';
  }
}

function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) return "BUY";
  if (predictedPrice < currentPrice * 0.98) return "SELL";
  return "HOLD";
}

function getBestTimeToBuy(predictedPrices, predictedTimes) {
  const minPrice = Math.min(...predictedPrices);
  const index = predictedPrices.indexOf(minPrice);
  return index >= 0 ? `${predictedTimes[index]} (Predicted: $${minPrice.toFixed(2)})` : "N/A";
}

function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

async function getStockData(event) {
  event.preventDefault();
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) return alert("Please enter a stock symbol.");
  document.getElementById('loading-spinner').style.display = 'flex';

  try {
    const { finnhubData, twelveData } = await fetchStockData(symbol);
    if (!twelveData?.values?.length || !finnhubData?.c) throw new Error("API error");

    const prices = twelveData.values.map(e => parseFloat(e.close)).reverse();
    const times = twelveData.values.map(e => e.datetime).reverse();
    const candlestickData = twelveData.values.slice().reverse();

    const predictions = await fetchPredictions(symbol);
    const predictedTimes = generatePredictedDates(new Date());
    const fullDay = true;

    displayPredictionChart(times, prices, predictedTimes, predictions, fullDay, candlestickData);

    const recommendation = generateBuySellSignal(predictions[0], finnhubData.c);
    const bestTimeToBuy = getBestTimeToBuy(predictions, predictedTimes);

    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation:</strong> ${recommendation}</p>
      <p><strong>Current Price:</strong> $${finnhubData.c}</p>
      <p><strong>Predicted Price (next):</strong> $${predictions?.[0]?.toFixed(2) || 'N/A'}</p>
      <p><strong>Best Time to Buy:</strong> ${bestTimeToBuy}</p>
    `;

    const buyAmount = calculateBuyAmount(10000, finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy:</strong> ${buyAmount} shares at $${finnhubData.c}</p>
    `;

    document.getElementById('prediction-results').style.display = 'block';
  } catch (error) {
    alert("An error occurred while fetching data.");
    console.error(error);
  } finally {
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

// Event listeners
document.getElementById('stock-form').addEventListener('submit', getStockData);
document.getElementById('fullscreenButton').addEventListener('click', () => {
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer.requestFullscreen) chartContainer.requestFullscreen();
});
document.getElementById('toggleChartTypeButton').addEventListener('click', () => {
  isCandlestick = !isCandlestick;
  const fakeSubmit = new Event('submit');
  document.getElementById('stock-form').dispatchEvent(fakeSubmit);
});
