// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';

  const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
  const finnhubData = await finnhubResponse.json();

  const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=5min&outputsize=96&apikey=${twelveDataAPI}`);
  const twelveData = await twelveDataResponse.json();

  return { finnhubData, twelveData };
}

// Fetch predictions (Mock or ML model here)
async function fetchPredictions(symbol) {
  const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
  const data = await response.json();
  return data[symbol.toUpperCase()] || []; // fallback added
}

// Generate times for predicted prices
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

// Display chart
function displayPredictionChart(dates, prices, predictedTimes = [], predictedPrices = []) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  if (window.predictionChart) {
    window.predictionChart.destroy();
  }

  const allLabels = [...dates, ...predictedTimes];
  const allPrices = [...prices, ...Array(predictedTimes.length).fill(null)];
  const allPredictions = [...Array(dates.length).fill(null), ...predictedPrices];

  window.predictionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Actual Price',
          data: allPrices,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1
        },
        {
          label: 'Predicted Price',
          data: allPredictions,
          borderColor: 'rgba(255, 99, 132, 1)',
          borderDash: [5, 5],
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            autoSkip: true
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  });
}

// Signal logic
function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) return "BUY";
  else if (predictedPrice < currentPrice * 0.98) return "SELL";
  else return "HOLD";
}

// Best time logic
function getBestTimeToBuy(predictedPrices, predictedTimes) {
  if (!Array.isArray(predictedPrices) || predictedPrices.length === 0 || !Array.isArray(predictedTimes) || predictedTimes.length === 0) {
    return "Not enough prediction data available.";
  }

  const minPrice = Math.min(...predictedPrices);
  const index = predictedPrices.indexOf(minPrice);

  if (index >= 0 && predictedTimes[index]) {
    return `${predictedTimes[index]} (Predicted price: $${minPrice.toFixed(2)})`;
  } else {
    return "Best time could not be determined.";
  }
}

function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Main logic for form submit
async function getStockData(event) {
  event.preventDefault();

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  const { finnhubData, twelveData } = await fetchStockData(symbol);

  const prices = twelveData.values.map(entry => parseFloat(entry.close)).reverse();
  const times = twelveData.values.map(entry => {
    const time = new Date(entry.datetime);
    return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }).reverse();

  // Fallback if no prediction data exists
  let predictedPrices = await fetchPredictions(symbol);
  if (!predictedPrices || predictedPrices.length === 0) {
    predictedPrices = [
      prices[prices.length - 1] * 1.01,
      prices[prices.length - 1] * 1.015,
      prices[prices.length - 1] * 1.02,
      prices[prices.length - 1] * 1.025,
      prices[prices.length - 1] * 1.03,
      prices[prices.length - 1] * 1.035
    ];
  }

  const predictedTimes = generatePredictedDates(Date.now(), predictedPrices.length);

  displayPredictionChart(times, prices, predictedTimes, predictedPrices);

  const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);
  const bestTimeToBuy = getBestTimeToBuy(predictedPrices, predictedTimes);

  document.getElementById('buySellRecommendation').innerHTML = `
    <p><strong>Recommendation: </strong>${recommendation}</p>
    <p><strong>Current Price: </strong>$${finnhubData.c}</p>
    <p><strong>Predicted Price (next): </strong>$${predictedPrices?.[0]?.toFixed(2) || 'N/A'}</p>
    <p><strong>Best Time to Buy: </strong>${bestTimeToBuy}</p>
  `;

  const balance = 10000;
  const buyAmount = calculateBuyAmount(balance, finnhubData.c);
  document.getElementById('buyAmountRecommendation').innerHTML = `
    <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${finnhubData.c}</p>
  `;

  document.getElementById('prediction-results').style.display = 'block';
}

// Initialize form event listener
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
});
