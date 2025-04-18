// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

  const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
  const finnhubData = await finnhubResponse.json();

  const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&apikey=${twelveDataAPI}`);
  const twelveData = await twelveDataResponse.json();

  return { finnhubData, twelveData };
}

// Function to fetch predictions (You can replace this with actual ML predictions)
async function fetchPredictions(symbol) {
  const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
  const data = await response.json();
  return data[symbol] || [];
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

  // Fetch initial stock data
  const { finnhubData, twelveData } = await fetchStockData(symbol);
  const prices = twelveData.values.map(entry => parseFloat(entry.close));
  const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleTimeString());

  // Fetch predictions
  const predictions = await fetchPredictions(symbol);
  const predictedPrices = predictions;  // Use the actual prediction model's output here
  const predictedTimes = generatePredictedDates(times[times.length - 1]);  // Generate future times for predictions

  // Display the prediction chart
  displayPredictionChart(times, prices, predictedTimes, predictedPrices);

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
}

// Switch to the next day’s chart
function showNextDayChart() {
  // Logic to switch to the next day’s chart
  alert('Displaying chart for the next trading day.');
  // Add code to switch chart data to the next day’s prediction or historical data
}

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
  document.getElementById('nextDayButton').addEventListener('click', showNextDayChart);
});
