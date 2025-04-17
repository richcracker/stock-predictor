// Function to fetch predictions from GitHub
async function fetchPredictions() {
  // Replace with the raw URL of your predictions.json file in GitHub
  const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
  const data = await response.json();
  return data;
}

// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

  const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
  const finnhubData = await finnhubResponse.json();

  const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&apikey=${twelveDataAPI}`);
  const twelveData = await twelveDataResponse.json();

  return { finnhubData, twelveData };
}

// Handle form submission and fetching stock data
async function getStockData(event) {
  event.preventDefault();  // Prevent form from submitting

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  // Fetch initial stock data
  const data = await fetchStockData(symbol);
  const prices = data.twelveData.values.map(entry => parseFloat(entry.close));
  const dates = data.twelveData.values.map(entry => entry.datetime);

  // Display chart with live data
  displayPredictionChart(dates, prices);

  // Update every 30 seconds
  setInterval(async () => {
    const updatedData = await fetchStockData(symbol);
    const updatedPrices = updatedData.twelveData.values.map(entry => parseFloat(entry.close));
    const updatedDates = updatedData.twelveData.values.map(entry => entry.datetime);
    
    // Update the chart with the new data
    displayPredictionChart(updatedDates, updatedPrices);
  }, 30000); // 30 seconds interval
}

// Generate predicted dates for the rest of the trading day (for displaying future price predictions)
function generatePredictedDates(dates) {
  const lastDate = new Date(dates[dates.length - 1]);
  const predictedDates = [];

  for (let i = 1; i <= 6; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setMinutes(lastDate.getMinutes() + i * 1);  // Spread predictions over the day
    predictedDates.push(nextDate.toLocaleTimeString());
  }

  return predictedDates;
}

// Function to display the chart with stock data
function displayPredictionChart(dates, prices) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Stock Price (1-Min Interval)',
          data: prices,
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
    },
  });
}

// Generate buy/sell signal based on predicted prices
function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) {
    return "BUY";
  } else if (predictedPrice < currentPrice * 0.98) {
    return "SELL";
  } else {
    return "HOLD";
  }
}

// Suggest when to buy based on predictions (the best time is when the price is the lowest)
function getBestTimeToBuy(predictedPrices) {
  const minPrice = Math.min(...predictedPrices);
  const bestTimeIndex = predictedPrices.indexOf(minPrice);
  return `Minute ${bestTimeIndex + 1} (Predicted price: $${minPrice.toFixed(2)})`;
}

// Calculate how many shares the user can buy with their balance
function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
});
