// Function to fetch predictions from GitHub
async function fetchPredictions() {
  // Replace with the raw URL of your predictions.json file in GitHub
  const response = await fetch('https://github.com/richcracker/stock-predictor/blob/main/predictions.json');
  const data = await response.json();
  return data;
}


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

async function getStockData(event) {
  event.preventDefault();  // Prevent form from submitting

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  // Fetch initial stock data
  const data = await fetchStockData(symbol);
  const prices = data.values.map(entry => parseFloat(entry.close));
  const dates = data.values.map(entry => entry.datetime);

  // Display chart with live data
  displayPredictionChart(dates, prices);

  // Update every 30 seconds
  setInterval(async () => {
    const updatedData = await fetchStockData(symbol);
    const updatedPrices = updatedData.values.map(entry => parseFloat(entry.close));
    const updatedDates = updatedData.values.map(entry => entry.datetime);
    
    // Update the chart with the new data
    displayPredictionChart(updatedDates, updatedPrices);
  }, 30000); // 30 seconds interval
}

  const { finnhubData, twelveData } = await fetchStockData(symbol);

  const historicalPrices = twelveData.values.map(entry => parseFloat(entry.close));
  const dates = twelveData.values.map(entry => entry.datetime);

  // Fetch predictions from the predictions.json file
  const predictions = await fetchPredictions();

  // Use predictions to enhance your chart or decision logic
  const predictedPrices = predictions[symbol] || []; // Example: using stock symbol to fetch specific predictions
  const predictedDates = generatePredictedDates(dates);

  // Update the chart with the predictions
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
//}


// Predict future stock prices (for the next part of the day)
//function predictFuturePrices(historicalPrices) {
//  const predictions = [];
//  const lastPrice = historicalPrices[historicalPrices.length - 1];
//   const dailyIncreaseRate = 1.02;  // Example: assume 2% daily growth

//  for (let i = 0; i < 6; i++) {  // Predict for the rest of the day
//    const predictedPrice = lastPrice * Math.pow(dailyIncreaseRate, i + 1);
//    predictions.push(predictedPrice);
//  }

//  return predictions;
//}

// Generate predicted dates for the rest of the trading day
function generatePredictedDates(dates) {
  const lastDate = new Date(dates[dates.length - 1]);
  const predictedDates = [];

  for (let i = 1; i <= 6; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setHours(lastDate.getHours() + i);  // Spread predictions over the day
    predictedDates.push(nextDate.toLocaleTimeString());
  }

  return predictedDates;
}

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
  const bestDay = predictedPrices.indexOf(minPrice);
  return `Hour ${bestDay + 1} (Predicted price: $${minPrice.toFixed(2)})`;
}

// Calculate how many shares the user can buy with their balance
function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
});
