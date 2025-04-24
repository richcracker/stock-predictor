// API Keys
const API_KEY_FINNHUB = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Insert your Finnhub API key here
const API_KEY_TWELVE_DATA = '927a99953b2a4ced8cb90b89cb8d405c';  // Insert your Twelve Data API key here

// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  try {
    // Fetch stock data from Finnhub API (for current price)
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY_FINNHUB}`);
    if (!finnhubResponse.ok) {
      throw new Error('Finnhub API request failed');
    }
    const finnhubData = await finnhubResponse.json();

    // Fetch stock data from Twelve Data API (for historical data)
    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&apikey=${API_KEY_TWELVE_DATA}`);
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

// Function to fetch predictions (static data for testing here)
async function fetchPredictions(symbol) {
  // Static prediction data for testing (replace with actual prediction model output)
  const predictions = {
    'AAPL': [150.23, 151.56, 152.78, 153.12, 154.23],  // Example for AAPL stock
    'GOOG': [2800.25, 2805.15, 2810.33, 2815.22, 2820.30]  // Example for GOOG stock
  };

  return predictions[symbol] || [];
}

// Function to generate full day times (for the entire trading day)
function generateFullDayTimes() {
  const times = [];
  const start = new Date();
  start.setHours(9, 30, 0, 0); // Market opens at 9:30 AM
  const end = new Date();
  end.setHours(16, 0, 0, 0); // Market closes at 4:00 PM

  // Generate times for each minute of the trading day
  while (start <= end) {
    times.push(start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    start.setMinutes(start.getMinutes() + 1); // Increment by 1 minute
  }

  return times;
}

// Display the prediction chart with zooming and panning enabled
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
            maxRotation: 45,
            autoSkip: true
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          ticks: {
            callback: function (value) {
              return '$' + value.toFixed(2);
            }
          },
          title: {
            display: true,
            text: 'Price'
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
      },
      zoom: {
        enabled: true,
        mode: 'xy', // Enable zooming in both axes
        speed: 0.1
      },
      pan: {
        enabled: true,
        mode: 'xy',
        speed: 5
      }
    }
  });

  if (fullDay) {
    document.getElementById('nextDayButton').style.display = 'inline-block';
  }
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

// Get best time to buy based on predictions
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

// Calculate how much stock user can buy
function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Get stock data and display
async function getStockData(event) {
  event.preventDefault();  // Prevent form from submitting

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  // Show the spinner
  document.getElementById('loading-spinner').style.display = 'flex';

  try {
    // Fetch initial stock data
    const { finnhubData, twelveData } = await fetchStockData(symbol);
    if (!finnhubData || !twelveData) {
      throw new Error('Failed to fetch stock data.');
    }
    const prices = twelveData.values.map(entry => parseFloat(entry.close));
    const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleTimeString());

    // Fetch predictions
    const predictions = await fetchPredictions(symbol);
    const predictedPrices = predictions;  // Use the actual prediction model's output here
    const predictedTimes = generateFullDayTimes();  // Generate full day times for predictions

    // Display the prediction chart
    displayPredictionChart(times, prices, predictedTimes, predictedPrices, true);

    // Generate buy/sell signal and best time to buy
    const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);
    const bestTimeToBuy = getBestTimeToBuy(predictedPrices, predictedTimes);

    // Display recommendation and best time to buy
    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation: </strong>${recommendation}</p>
      <p><strong>Current Price: </strong>$${finnhubData.c}</p>
      <p><strong>Predicted Price (next): </strong>$${predictedPrices?.[0] ? predictedPrices[0].toFixed(2) : 'N/A'}</p>
      <p><strong>Best Time to Buy: </strong>${bestTimeToBuy}</p>
    `;

    // Display amount of stock user can buy based on balance
    const balance = 10000;  // Example balance
    const buyAmount = calculateBuyAmount(balance, finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${finnhubData.c}</p>
    `;

    // Show the prediction results section (which was initially hidden)
    document.getElementById('prediction-results').style.display = 'block';  // Make the results visible
  } catch (error) {
    alert("An error occurred while fetching data. Please try again.");
    console.error(error); // Log the error for debugging
  } finally {
    // Hide the spinner after the data is fetched and processed
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

// Event listener for form submission
document.getElementById('stock-form').addEventListener('submit', getStockData);
