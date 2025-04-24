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
            maxRotation: 0,
            autoSkip: true,
          }
        },
        y: {
          position: 'left',
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
            mode: 'xy',
            speed: 10,
            threshold: 10
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
              sensitivity: 1
            }
          }
        }
      }
    }
  });
}

// Handle the stock prediction form submission
document.getElementById('stock-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  document.getElementById('loading-spinner').style.display = 'flex';
  
  // Fetch stock data
  const stockData = await fetchStockData(symbol);
  if (!stockData) return;

  const { finnhubData, twelveData } = stockData;

  // Fetch predictions
  const predictions = await fetchPredictions(symbol);

  // Get the predicted times and prices
  const predictedTimes = generatePredictedDates(new Date());
  const predictedPrices = predictions;

  // Display the prediction chart
  displayPredictionChart(
    twelveData.values.slice(0, 6).map(item => item.datetime),
    twelveData.values.slice(0, 6).map(item => parseFloat(item.close)),
    predictedTimes,
    predictedPrices
  );

  // Update recommendation section
  document.getElementById('buySellRecommendation').innerHTML = `Buy/Sell Recommendation: ${finnhubData.c > finnhubData.o ? 'Buy' : 'Sell'}`;
  document.getElementById('buyAmountRecommendation').innerHTML = `Recommended Amount to Buy: ${finnhubData.c > finnhubData.o ? '100 shares' : '50 shares'}`;

  // Show results and hide the loading spinner
  document.getElementById('loading-spinner').style.display = 'none';
  document.getElementById('prediction-results').style.display = 'block';
});
