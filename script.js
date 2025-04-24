// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    if (!finnhubResponse.ok) {
      throw new Error('Finnhub API request failed');
    }
    const finnhubData = await finnhubResponse.json();

    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&apikey=${twelveDataAPI}`);
    if (!twelveDataResponse.ok) {
      throw new Error('Twelve Data API request failed');
    }
    const twelveData = await twelveDataResponse.json();

    return { finnhubData, twelveData };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    alert('An error occurred while fetching stock data. Please try again later.');
    return null;
  }
}

// Function to fetch predictions (use static data here for now)
async function fetchPredictions(symbol) {
  // Static prediction data for testing (you can replace this with actual predictions)
  const predictions = {
    'AAPL': [150.23, 151.56, 152.78, 153.12, 154.23],  // Example for AAPL stock
    'GOOG': [2800.25, 2805.15, 2810.33, 2815.22, 2820.30]  // Example for GOOG stock
  };

  return predictions[symbol] || [];
}

function generatePredictedDates(startTime, numPoints = 6) {
  const predictedTimes = [];
  const start = new Date(startTime);

  for (let i = 1; i <= numPoints; i++) {
    const next = new Date(start);
    next.setMinutes(start.getMinutes() + i * 30); // 30-minute intervals
    predictedTimes.push(next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }));
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
          tension: 0.1,
          borderDash: [5, 5],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy',
            speed: 10,
            threshold: 10
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Price ($)'
          },
          ticks: {
            beginAtZero: false
          }
        }
      }
    }
  });
}

// Function to update Buy/Sell recommendation (Static Example)
function displayRecommendation(symbol) {
  const recommendation = document.getElementById('buySellRecommendation');
  const amountRecommendation = document.getElementById('buyAmountRecommendation');

  if (symbol === 'AAPL') {
    recommendation.innerHTML = '<strong>Recommendation:</strong> Buy!';
    amountRecommendation.innerHTML = '<strong>Amount to Buy:</strong> $500 worth of AAPL stock';
  } else if (symbol === 'GOOG') {
    recommendation.innerHTML = '<strong>Recommendation:</strong> Sell!';
    amountRecommendation.innerHTML = '<strong>Amount to Sell:</strong> $300 worth of GOOG stock';
  }
}

// Handle form submission
document.getElementById('stock-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const stockSymbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!stockSymbol) {
    alert('Please enter a stock symbol.');
    return;
  }

  document.getElementById('loading-spinner').style.display = 'flex';
  const stockData = await fetchStockData(stockSymbol);
  const predictions = await fetchPredictions(stockSymbol);

  if (!stockData || predictions.length === 0) {
    document.getElementById('loading-spinner').style.display = 'none';
    return;
  }

  // Example for displaying stock data (e.g., open price from Finnhub API)
  const openPrice = stockData.finnhubData.o;

  // Generate predictions and display the chart
  const predictedTimes = generatePredictedDates(stockData.twelveData.meta.timestamp);
  displayPredictionChart(
    [new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })],
    [openPrice],
    predictedTimes,
    predictions
  );

  // Display buy/sell recommendation
  displayRecommendation(stockSymbol);

  // Hide loading spinner and show results
  document.getElementById('loading-spinner').style.display = 'none';
  document.getElementById('prediction-results').style.display = 'block';
});

document.getElementById('nextDayButton').addEventListener('click', async () => {
  const stockSymbol = document.getElementById('stock-symbol').value.toUpperCase();
  const predictions = await fetchPredictions(stockSymbol);

  if (predictions.length > 0) {
    displayPredictionChart(
      generatePredictedDates(new Date().getTime(), 12),
     
