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
  // Replace with actual machine learning predictions or prediction logic
  const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
  const data = await response.json();
  return data[symbol] || [];
}

function generatePredictedTimes(dates) {
  const lastDate = new Date(dates[dates.length - 1]);
  const predictedTimes = [];

  for (let i = 1; i <= 6; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setHours(lastDate.getHours() + i);  // Spread predictions over the day
    predictedTimes.push(nextDate.toLocaleTimeString());
  }

  return predictedTimes;
}

// Display the prediction chart
function displayPredictionChart(times, prices, predictedTimes, predictedPrices) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times.concat(predictedTimes),
      datasets: [
        {
          label: 'Stock Price (Historical)',
          data: prices,
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
        },
        {
          label: 'Predicted Stock Price',
          data: predictedPrices,
          fill: false,
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            callback: function (value, index, values) {
              // Format the time labels to be more readable (AM/PM)
              return new Date(values[index].label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
      },
    },
  });
}

function generateBuySellSignal(predictedPrice, currentPrice) {
  if (predictedPrice > currentPrice * 1.02) {
    return "BUY";
  } else if (predictedPrice < currentPrice * 0.98) {
    return "SELL";
  } else {
    return "HOLD";
  }
}

function getBestTimeToBuy(predictedPrices, predictedTimes) {
  if (
    !Array.isArray(predictedPrices) || predictedPrices.length === 0 ||
    !Array.isArray(predictedTimes) || predictedTimes.length === 0
  ) {
    return "Not enough prediction data available.";
  }

  const minPrice = Math.min(...predictedPrices);
  const index = predictedPrices.indexOf(minPrice);

  // Make sure the index is valid and there's a matching time
  if (index >= 0 && predictedTimes[index]) {
    return `${predictedTimes[index]} (Predicted price: $${minPrice.toFixed(2)})`;
  } else {
    return "Best time could not be determined.";
  }
}


function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

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
  const predictedTimes = generatePredictedTimes(times);  // Generate future times for predictions

  // Display the prediction chart
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

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stock-form').addEventListener('submit', getStockData);
});
