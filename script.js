// Function to fetch stock data from APIs (FinnHub and Twelve Data)
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng'; // Replace with your API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c'; // Replace with your API key

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    const finnhubData = await finnhubResponse.json();
    
    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&apikey=${twelveDataAPI}`);
    const twelveData = await twelveDataResponse.json();

    return { finnhubData, twelveData };
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw new Error("Failed to fetch stock data.");
  }
}

// Fetch predictions (from a mock data file for now)
async function fetchPredictions(symbol) {
  try {
    const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
    const data = await response.json();
    return data[symbol] || [];
  } catch (error) {
    console.error("Error fetching predictions:", error);
    throw new Error("Failed to fetch predictions.");
  }
}

// Generate predicted dates (example: 6 future time points)
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

// Display prediction chart
function displayPredictionChart(dates, prices, predictedTimes = [], predictedPrices = []) {
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

// Generate buy/sell signal
function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) {
    return "BUY";
  } else if (predictedPrice < currentPrice * 0.98) {
    return "SELL";
  } else {
    return "HOLD";
  }
}

// Display stock data and predictions
async function getStockData(event) {
  event.preventDefault();  // Prevent form submission

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  // Show loading spinner
  document.getElementById('loading-spinner').style.display = 'flex';

  try {
    // Fetch stock data
    const { finnhubData, twelveData } = await fetchStockData(symbol);
    
    if (!finnhubData || !twelveData) {
      throw new Error('Missing or invalid data from one of the APIs.');
    }

    const prices = twelveData.values.map(entry => parseFloat(entry.close));
    const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleTimeString());

    // Fetch predictions
    const predictions = await fetchPredictions(symbol);

    const predictedPrices = predictions;
    const predictedTimes = generatePredictedDates(times[times.length - 1]);

    // Display prediction chart
    displayPredictionChart(times, prices, predictedTimes, predictedPrices);

    // Generate recommendation
    const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);

    // Display buy/sell recommendation
    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation: </strong>${recommendation}</p>
      <p><strong>Current Price: </strong>$${finnhubData.c}</p>
      <p><strong>Predicted Price (next): </strong>$${predictedPrices?.[0] ? predictedPrices[0].toFixed(2) : 'N/A'}</p>
    `;

    // Display amount user can buy
    const balance = 10000; // Example balance
    const buyAmount = Math.floor(balance / finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${finnhubData.c}</p>
    `;

    // Show prediction results
    document.getElementById('prediction-results').style.display = 'block';
  } catch (error) {
    console.error('Error fetching stock data or predictions:', error);
    alert(`An error occurred: ${error.message}. Please try again.`);
  } finally {
    // Hide loading spinner
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

// Event listener for form submission
document.getElementById('stock-form').addEventListener('submit', getStockData);
