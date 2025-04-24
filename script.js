// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    if (!finnhubResponse.ok) throw new Error('Finnhub API request failed');
    const finnhubData = await finnhubResponse.json();

    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&start_date=2024-04-22 04:00:00&end_date=2024-04-22 20:00:00&apikey=${twelveDataAPI}`);
    if (!twelveDataResponse.ok) throw new Error('Twelve Data API request failed');
    const twelveData = await twelveDataResponse.json();

    return { finnhubData, twelveData };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    alert('An error occurred while fetching stock data. Please try again later.');
    return null;
  }
}

// Static predictions for demo
async function fetchPredictions(symbol) {
  const predictions = {
    'AAPL': [150.23, 151.56, 152.78, 153.12, 154.23],
    'GOOG': [2800.25, 2805.15, 2810.33, 2815.22, 2820.30]
  };
  return predictions[symbol] || [];
}

function generatePredictedDates(startTime, numPoints = 6) {
  const predictedTimes = [];
  const start = new Date(startTime);

  for (let i = 1; i <= numPoints; i++) {
    const next = new Date(start);
    next.setMinutes(start.getMinutes() + i * 30);
    predictedTimes.push(next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
  }

  return predictedTimes;
}

// Display the prediction chart
function displayPredictionChart(dates, prices, predictedTimes = [], predictedPrices = [], fullDay = false) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  if (window.predictionChart && typeof window.predictionChart.destroy === 'function') {
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
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
          }
        },
        y: {
          position: 'right'
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'x'
          }
        }
      }
    }
  });

  if (fullDay) {
    document.getElementById('nextDayButton').style.display = 'inline-block';
  }
}

// Generate buy/sell signal
function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) return "BUY";
  if (predictedPrice < currentPrice * 0.98) return "SELL";
  return "HOLD";
}

// Get best time to buy
function getBestTimeToBuy(predictedPrices, predictedTimes) {
  if (!Array.isArray(predictedPrices) || predictedPrices.length === 0 || !Array.isArray(predictedTimes) || predictedTimes.length === 0) {
    return "Not enough prediction data available.";
  }

  const minPrice = Math.min(...predictedPrices);
  const index = predictedPrices.indexOf(minPrice);
  if (index >= 0 && predictedTimes[index]) {
    return `${predictedTimes[index]} (Predicted price: $${minPrice.toFixed(2)})`;
  }
  return "Best time could not be determined.";
}

// Calculate buy amount
function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Get stock data and display
async function getStockData(event) {
  event.preventDefault();
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  document.getElementById('loading-spinner').style.display = 'flex';

  try {
    const result = await fetchStockData(symbol);
    if (!result) throw new Error('Stock data not fetched.');
    const { finnhubData, twelveData } = result;

    const prices = twelveData.values.map(entry => parseFloat(entry.close));
    const times = twelveData.values.map(entry => {
      const date = new Date(entry.datetime);
      return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    });

    const predictions = await fetchPredictions(symbol);
    const predictedTimes = generatePredictedDates(times[times.length - 1]);
    displayPredictionChart(times, prices, predictedTimes, predictions, true);

    const recommendation = generateBuySellSignal(predictions[0], finnhubData.c);
    const bestTimeToBuy = getBestTimeToBuy(predictions, predictedTimes);

    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation: </strong>${recommendation}</p>
      <p><strong>Current Price: </strong>$${finnhubData.c}</p>
      <p><strong>Predicted Price (next): </strong>$${predictions?.[0] ? predictions[0].toFixed(2) : 'N/A'}</p>
      <p><strong>Best Time to Buy: </strong>${bestTimeToBuy}</p>
    `;

    const balance = 10000;
    const buyAmount = calculateBuyAmount(balance, finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${finnhubData.c}</p>
    `;

    document.getElementById('prediction-results').style.display = 'block';
  } catch (error) {
    console.error(error);
    alert("An error occurred while fetching data.");
  } finally {
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

document.getElementById('stock-form').addEventListener('submit', getStockData);
