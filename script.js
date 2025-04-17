// API keys for Finnhub and Twelve Data (replace with your actual keys)
const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

// Fetch stock data: current price (Finnhub), historical data (Twelve Data)
async function fetchStockData(symbol) {
  const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
  const finnhubData = await finnhubResponse.json();

  const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&apikey=${twelveDataAPI}`);
  const twelveData = await twelveDataResponse.json();

  return { finnhubData, twelveData };
}

// Main function to get stock data, predictions, and update the UI
async function getStockData(event) {
  event.preventDefault();  // Prevent form from submitting

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  const { finnhubData, twelveData } = await fetchStockData(symbol);

  // Historical data from Twelve Data
  const historicalPrices = twelveData.values.map(entry => parseFloat(entry.close));
  const dates = twelveData.values.map(entry => entry.datetime);

  // Predict future prices based on historical data
  const predictedPrices = predictFuturePrices(historicalPrices);
  const predictedDates = generatePredictedDates(dates);

  // Display the prediction chart (historical + predicted)
  displayPredictionChart(dates, historicalPrices, predictedDates, predictedPrices);

  const currentPrice = finnhubData.c;
  const recommendation = generateBuySellSignal(predictedPrices[0], currentPrice); // Use first predicted value for recommendation
  const bestTimeToBuy = getBestTimeToBuy(predictedPrices);

  const balance = 10000;  // Example balance
  const buyAmount = calculateBuyAmount(balance, currentPrice);

  // Display results
  document.getElementById('buySellRecommendation').innerHTML = `
    <p><strong>Recommendation: </strong>${recommendation}</p>
    <p><strong>Current Price: </strong>$${currentPrice}</p>
    <p><strong>Predicted Price (next): </strong>$${predictedPrices[0].toFixed(2)}</p>
    <p><strong>Best Time to Buy: </strong>${bestTimeToBuy}</p>
  `;

  document.getElementById('buyAmountRecommendation').innerHTML = `
    <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${currentPrice}</p>
  `;
}

// Predict future stock prices (for the next 5 minutes, for example)
function predictFuturePrices(historicalPrices) {
  const predictions = [];
  const lastPrice = historicalPrices[historicalPrices.length - 1];
  const dailyIncreaseRate = 1.02;  // Example: assume 2% daily growth

  for (let i = 0; i < 10; i++) {  // Predict for the next 10 intervals (minutes, hours, etc.)
    const predictedPrice = lastPrice * Math.pow(dailyIncreaseRate, i + 1);
    predictions.push(predictedPrice);
  }

  return predictions;
}

// Generate predicted dates for the next 10 intervals
function generatePredictedDates(dates) {
  const lastDate = new Date(dates[dates.length - 1]);
  const predictedDates = [];

  for (let i = 1; i <= 10; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setMinutes(lastDate.getMinutes() + i * 10);  // Adjust to your time interval (e.g., every 10 minutes)
    predictedDates.push(nextDate.toLocaleTimeString());  // Format time for better display
  }

  return predictedDates;
}

// Function to display the prediction chart (historical + predicted)
function displayPredictionChart(dates, historicalPrices, predictedDates, predictedPrices) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...dates, ...predictedDates],  // Combine historical and predicted dates
      datasets: [
        {
          label: 'Stock Price (Historical)',
          data: historicalPrices,
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1
        },
        {
          label: 'Stock Price (Predicted)',
          data: predictedPrices,
          fill: false,
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.1,
          borderDash: [5, 5]  // Dashed line for predicted data
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
  const bestDay = predictedPrices.indexOf(minPrice);
  return `Time ${predictedDates[bestDay]} (Predicted price: $${minPrice.toFixed(2)})`;
}

// Calculate how many shares the user can buy with their balance
function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Event listener for form submission
document.getElementById('stock-form').addEventListener('submit', getStockData);
