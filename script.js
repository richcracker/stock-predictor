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

// Fetch and display stock news (using Finnhub News API as an example)
async function fetchStockNews(symbol) {
  const finnhubAPI = 'd00h83pr01qk939o3nn0d00h83pr01qk939o3nng';  // Replace with your Finnhub API key
  const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2025-04-01&to=2025-04-20&token=${finnhubAPI}`);
  const newsData = await response.json();
  return newsData;
}

// Display the stock news articles
function displayStockNews(newsData) {
  const newsContainer = document.getElementById('news-articles');
  newsContainer.innerHTML = '';  // Clear existing articles

  newsData.forEach(news => {
    const article = document.createElement('div');
    article.classList.add('news-article');
    article.innerHTML = `
      <h3><a href="${news.url}" target="_blank">${news.headline}</a></h3>
      <p>${news.summary}</p>
      <p><strong>Source: </strong>${news.source}</p>
      <p><strong>Published: </strong>${new Date(news.datetime * 1000).toLocaleDateString()}</p>
    `;
    newsContainer.appendChild(article);
  });
}

// Function to handle stock comparison
async function compareStocks(symbol1, symbol2) {
  const { finnhubData: data1, twelveData: twelveData1 } = await fetchStockData(symbol1);
  const { finnhubData: data2, twelveData: twelveData2 } = await fetchStockData(symbol2);

  const comparisonResults = `
    <h3>Comparison Results:</h3>
    <h4>${symbol1} vs ${symbol2}</h4>
    <p><strong>${symbol1} Current Price:</strong> $${data1.c}</p>
    <p><strong>${symbol2} Current Price:</strong> $${data2.c}</p>
    <p><strong>${symbol1} 52-week High:</strong> $${data1.h}</p>
    <p><strong>${symbol2} 52-week High:</strong> $${data2.h}</p>
    <p><strong>${symbol1} 52-week Low:</strong> $${data1.l}</p>
    <p><strong>${symbol2} 52-week Low:</strong> $${data2.l}</p>
  `;
  document.getElementById('comparison-results').innerHTML = comparisonResults;
}

// Generate predicted dates for the prediction chart
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

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
  // Handle stock form submission
  document.getElementById('stock-form').addEventListener('submit', async (event) => {
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
  });

  // Handle stock comparison form submission
  document.getElementById('comparison-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const symbol1 = document.getElementById('comparison-symbol1').value.toUpperCase();
    const symbol2 = document.getElementById('comparison-symbol2').value.toUpperCase();

    if (!symbol1 || !symbol2) {
      alert("Please enter two stock symbols.");
      return;
    }

    // Compare the stocks
    await compareStocks(symbol1, symbol2);
  });

  // Handle news display when a stock symbol is entered
  document.getElementById('stock-symbol').addEventListener('input', async (event) => {
    const symbol = event.target.value.toUpperCase();
    if (symbol) {
      const newsData = await fetchStockNews(symbol);
      displayStockNews(newsData);
    }
  });
});
