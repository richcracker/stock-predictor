// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';

  // Append exchange tag for Twelve Data (required for many U.S. stocks)
  const twelveSymbol = `${symbol}:NASDAQ`;

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    const finnhubData = await finnhubResponse.json();
    console.log("Finnhub data:", finnhubData);

    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${twelveSymbol}&interval=1day&apikey=${twelveDataAPI}`);
    const twelveData = await twelveDataResponse.json();
    console.log("Twelve Data:", twelveData);

    return { finnhubData, twelveData };
  } catch (error) {
    console.error("Error in fetchStockData:", error);
    throw error;
  }
}

async function fetchPredictions(symbol) {
  try {
    const response = await fetch('https://raw.githubusercontent.com/richcracker/stock-predictor/main/predictions.json');
    const data = await response.json();
    return data[symbol] || [];
  } catch (err) {
    console.error("Error fetching predictions:", err);
    return [];
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

function calculateBuyAmount(balance, currentPrice) {
  return Math.floor(balance / currentPrice);
}

// Main function
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

    if (!twelveData || !twelveData.values || twelveData.status === "error") {
      console.error("Invalid Twelve Data response:", twelveData);
      throw new Error("Twelve Data fetch failed.");
    }

    if (!finnhubData || finnhubData.c === undefined) {
      console.error("Invalid Finnhub response:", finnhubData);
      throw new Error("Finnhub fetch failed.");
    }

    const prices = twelveData.values.map(entry => parseFloat(entry.close));
    const times = twelveData.values.map(entry => new Date(entry.datetime).toLocaleDateString());

    const predictions = await fetchPredictions(symbol);
    const predictedPrices = predictions;
    const predictedTimes = generatePredictedDates(new Date());

    displayPredictionChart(times, prices, predictedTimes, predictedPrices);

    const recommendation = generateBuySellSignal(predictedPrices[0], finnhubData.c);
    const bestTimeToBuy = getBestTimeToBuy(predictedPrices, predictedTimes);

    document.getElementById('buySellRecommendation').innerHTML = `
      <p><strong>Recommendation:</strong> ${recommendation}</p>
      <p><strong>Current Price:</strong> $${finnhubData.c}</p>
      <p><strong>Predicted Price (next):</strong> $${predictedPrices?.[0] ? predictedPrices[0].toFixed(2) : 'N/A'}</p>
      <p><strong>Best Time to Buy:</strong> ${bestTimeToBuy}</p>
    `;

    const balance = 10000;
    const buyAmount = calculateBuyAmount(balance, finnhubData.c);
    document.getElementById('buyAmountRecommendation').innerHTML = `
      <p><strong>Amount to Buy:</strong> ${buyAmount} shares at $${finnhubData.c}</p>
    `;

    document.getElementById('prediction-results').style.display = 'block';
  } catch (error) {
    console.error("Error during getStockData:", error);
    alert("An error occurred while fetching data. Please try again.");
  } finally {
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

document.getElementById('stock-form').addEventListener('submit', getStockData);
