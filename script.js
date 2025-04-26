// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';

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

// Function to fetch predictions (replace with actual ML model)
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

function generatePredictedDates(startTime, numPoints = 6) {
  const predictedTimes = [];
  const start = new Date(startTime);

  for (let i = 1; i <= numPoints; i++) {
    const next = new Date(start);
    next.setMinutes(start.getMinutes() + i * 30);
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

// Other functions for Buy/Sell signals, recommendations, etc. remain unchanged

// Get stock data and display
async function getStockData(event) {
  event.preventDefault();

  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  document.getElementById('loading-spinner').style.display = 'flex';

  try {
    const { finnhubData, twelveData } = await fetchStockData(symbol);

    const prices = twelveData.values.map(entry => parseFloat(entry.close));
    const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleTimeString());

    const predictions = await fetchPredictions(symbol);

    const predictedPrices = predictions;
    const predictedTimes = generatePredictedDates(times[times.length - 1]);

    displayPredictionChart(times, prices, predictedTimes, predictedPrices);

    const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);
    const bestTimeToBuy = getBestTimeToBuy(predictedPrices, predictedTimes);

    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation: </strong>${recommendation}</p>
      <p><strong>Current Price: </strong>$${finnhubData.c}</p>
      <p><strong>Predicted Price (next): </strong>$${predictedPrices?.[0] ? predictedPrices[0].toFixed(2) : 'N/A'}</p>
      <p><strong>Best Time to Buy: </strong>${bestTimeToBuy}</p>
    `;

    const balance = 10000;
    const buyAmount = calculateBuyAmount(balance, finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy: </strong>${buyAmount} shares at $${finnhubData.c}</p>
    `;

    document.getElementById('prediction-results').style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    alert(`An error occurred: ${error.message}. Please try again.`);
  } finally {
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

document.getElementById('stock-form').addEventListener('submit', getStockData);
