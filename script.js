// Import machine learning functions (like the one trained using Colab, etc.)
async function fetchPredictions(symbol) {
  const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
  const data = await response.json();
  return data[symbol] || []; // Assuming predictions are keyed by stock symbol
}

// Fetch live stock data
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Twelve Data API key

  const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
  const finnhubData = await finnhubResponse.json();

  const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&apikey=${twelveDataAPI}`);
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

  // Fetch stock data from APIs (Finnhub and Twelve Data)
  const { finnhubData, twelveData } = await fetchStockData(symbol);
  const prices = twelveData.values.map(entry => parseFloat(entry.close));
  const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleTimeString());

  // Fetch predictions (using ML model or simple prediction logic)
  const predictions = await fetchPredictions(symbol);  // Use your ML predictions here
  const predictedPrices = predictions;  // Use the actual prediction model's output here
  const predictedTimes = generatePredictedTimes(times);  // Generate future times for predictions

  // Display the updated chart
  displayPredictionChart(times, prices, predictedTimes, predictedPrices);

  // Generate buy/sell signal and best time to buy
  const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);
  const bestTimeToBuy = getBestTimeToBuy(predictedPrices);

  // Display recommendation and best time to buy
  document.getElementById('buySellRecommendation').innerHTML = `
    <p><strong>Recommendation: </strong>${recommendation}</p>
    <p><strong>Current Price: </strong>$${finnhubData.c}</p>
    <p><strong>Predicted Price (next): </strong>$${predictedPrices[0].toFixed(2)}</p>
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


// Predict future stock prices using the ML model
function generatePredictedTimes(times) {
  const lastTime = new Date(times[times.length - 1]);
  const predictedTimes = [];

  for (let i = 1; i <= 6; i++) {
    const nextTime = new Date(lastTime);
    nextTime.setHours(lastTime.getHours() + i);  // Add hours for predictions
    predictedTimes.push(nextTime.toLocaleTimeString());
  }

  return predictedTimes;
}

function displayPredictionChart(times, prices, predictedTimes, predictedPrices) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...times, ...predictedTimes],
      datasets: [
        {
          label: 'Stock Price (Live)',
          data: prices,
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
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
          }
        }
      }
    },
  });
}

// Generate buy/sell signal based on predictions
function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) {
    return "BUY";
  } else if (predictedPrice < currentPrice * 0.98) {
    return "SELL";
  } else {
    return "HOLD";
  }
}

// Suggest best time to buy based on predicted prices
function getBestTimeToBuy(predictedPrices) {
  const minPrice = Math.min(...predictedPrices);
  const bestTime = predictedPrices.indexOf(minPrice);
  return `Time ${bestTime + 1} (Predicted price: $${minPrice.toFixed(2)})`;
}

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
});
