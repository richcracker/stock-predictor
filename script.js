// Fetch stock data from Finnhub and Twelve Data APIs
async function fetchStockData(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const twelveDataAPI = '927a99953b2a4ced8cb90b89cb8d405c';  // Replace with your Twelve Data API key

  try {
    const finnhubResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubAPI}`);
    if (!finnhubResponse.ok) {
      throw new Error('Finnhub API request failed');
    }
    const finnhubData = await finnhubResponse.json();

    const twelveDataResponse = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&apikey=${twelveDataAPI}`);
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

// Function to fetch predictions (use static data here for now)
async function fetchPredictions(symbol) {
  // Static prediction data for testing (you can replace this with actual predictions)
  const predictions = {
    'AAPL': [150.23, 151.56, 152.78, 153.12, 154.23],  // Example for AAPL stock
    'GOOG': [2800.25, 2805.15, 2810.33, 2815.22, 2820.30]  // Example for GOOG stock
  };

  // Check if symbol exists in static data, otherwise return an empty array
  return predictions[symbol] || [];
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

// Display the prediction chart with full trading day and value on the right
function displayPredictionChart(dates, prices, predictedTimes = [], predictedPrices = [], fullDay = false) {
  const ctx = document.getElementById('predictionChart').getContext('2d');

  if (window.predictionChart && typeof window.predictionChart.destroy === 'function') {
    window.predictionChart.destroy();
  }

  // Combining all dates and prices for the full trading day
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
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'Predicted Price',
          data: allPredictions,
          borderColor: 'rgba(255, 99, 132, 1)',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 0
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
          position: 'bottom', // Keep the dates at the bottom
        },
        y: {
          position: 'right', // Place the stock value on the right side
          ticks: {
            beginAtZero: false,
            callback: function(value) { return `$${value.toFixed(2)}`; } // Format the y-axis labels as currency
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(tooltipItem) {
              return `$${tooltipItem.raw.toFixed(2)}`; // Show the price in tooltips
            }
          }
        }
      },
      elements: {
        point: {
          radius: 0 // Hide points on the line
        }
      }
    }
  });

  if (fullDay) {
    document.getElementById('nextDayButton').style.display = 'inline-block';
  }
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

    // Fetch predictions (now using static data)
    const predictions = await fetchPredictions(symbol);
    const predictedPrices = predictions;  // Use the static prediction data
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
