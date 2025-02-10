const CONFIG = {
  CEX_LIST: ['KuCoin', 'MEXC', 'ASCENDEX', 'GATE', 'BITGET', 'HTX']
};

function updateCEXData() {
  Logger.log('Starting updateCEXData function');
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('CEX Hourly Average');
  
  // Get the last row with data
  const lastRow = getLastRowWithData(sheet);
  
  // Calculate starting row for new data (lastRow + 2 for spacing)
  const startRow = lastRow === 1 ? 2 : lastRow + 1;
  
  // Get current date
  const currentDate = new Date();
  const formattedDate = Utilities.formatDate(currentDate, 'GMT', 'yyyy-MM-dd HH:mm');
  
  // Prepare data for each CEX
  const newData = [];
  
  for (const cex of CONFIG.CEX_LIST) {
    const rowData = getCEXData(cex);
    newData.push([
      formattedDate,
      cex,
      rowData.plusTwoPercent.toFixed(3),
      rowData.minusTwoPercent.toFixed(3),
      rowData.spread.toFixed(3),
      rowData.volume.toFixed(3)
    ]);
  }
  
  // Write data to sheet
  sheet.getRange(startRow, 1, newData.length, 6).setValues(newData);
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  
  // Sort by second column (ascending), then by first column (descending)
  range.sort([
    {column: 1, ascending: false},
    {column: 6, ascending: false}
  ]);

  createSummary()
  cleanUpData()

}

// Function to get the last row with data
function getLastRowWithData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 1;  // Return 1 if sheet is empty (for headers)
  
  // Check the last row in column A (Date)
  const values = sheet.getRange("A1:A" + lastRow).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== "") {
      return i + 1;
    }
  }
  return 1;
}

// Function to get data for a specific CEX
// This is where you would integrate your API calls
// Function to fetch AscendEX data
function fetchAscendEXData(symbol = 'ROUTE/USDT') {
  try {
    Logger.log('Starting AscendEX data fetch for symbol: ' + symbol);
    
    // Fetch ticker data
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const tickerResponse = UrlFetchApp.fetch(
      `https://ascendex.com/api/pro/v1/spot/ticker?symbol=${symbol}`,
      tickerOptions
    );
    Logger.log('Ticker Response Status: ' + tickerResponse.getResponseCode());
    const tickerData = JSON.parse(tickerResponse.getContentText());
    Logger.log('Ticker Data: ' + JSON.stringify(tickerData));
    // Fetch orderbook data
    const orderbookOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const orderbookResponse = UrlFetchApp.fetch(
      `https://ascendex.com/api/pro/v1/depth?symbol=${symbol}`,
      orderbookOptions
    );
    Logger.log('Orderbook Response Status: ' + orderbookResponse.getResponseCode());
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));
    // Calculate depth values
    const lastTradedPrice = parseFloat(tickerData.data.close);
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };
    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };
    // Process bids for both +2% and -2% depth calculation
    orderbookData.data.data.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;
      // Calculate totals for ranges
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });

    orderbookData.data.data.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;
      // Calculate totals for ranges
      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });
    // Calculate spread using ask and bid from ticker data
    const askPrice = parseFloat(tickerData.data.ask[0]);
    const bidPrice = parseFloat(tickerData.data.bid[0]);
    const spread = ((askPrice - bidPrice) / bidPrice * 100).toFixed(2);
    // Get volume from ticker data
    const volume = parseFloat(tickerData.data.volume);
    Logger.log('Calculated values:');
    Logger.log('Plus Two Percent:' + totalValues["+2%"]);
    Logger.log('Minus Two Percent:'+ totalValues["-2%"]);
    Logger.log('Spread:'+ spread);
    Logger.log('Volume:'+ volume * lastTradedPrice);
    // Return processed data
    return {
      plusTwoPercent: parseFloat(totalValues["+2%"].toFixed(2)),
      minusTwoPercent: parseFloat(totalValues["-2%"].toFixed(2)),
      spread: parseFloat(spread),
      volume: volume * lastTradedPrice
    };
  } catch (error) {
    Logger.log('Error fetching AscendEX data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function fetchMEXCData(symbol = 'ROUTEUSDT') {
  try {
    Logger.log('Starting MEXC data fetch for symbol: ' + symbol);
    
    // Fetch ticker data
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const tickerResponse = UrlFetchApp.fetch(
      `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`,
      tickerOptions
    );
    Logger.log('Ticker Response Status: ' + tickerResponse.getResponseCode());
    const tickerData = JSON.parse(tickerResponse.getContentText());
    Logger.log('Ticker Data: ' + JSON.stringify(tickerData));
    // Fetch orderbook data
    const orderbookOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const orderbookResponse = UrlFetchApp.fetch(
      `https://api.mexc.com/api/v3/depth?symbol=${symbol}&limit=20`,
      orderbookOptions
    );
    Logger.log('Orderbook Response Status: ' + orderbookResponse.getResponseCode());
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));
    // Calculate depth values
    const lastTradedPrice = parseFloat(tickerData.lastPrice);
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };
    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };
    // Process bids for +2% depth calculation
    orderbookData.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });
    // Process asks for -2% depth calculation
    orderbookData.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;
      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });
    // Calculate spread using bid and ask from ticker data
    const spread = ((parseFloat(tickerData.askPrice) - parseFloat(tickerData.bidPrice)) / 
                    parseFloat(tickerData.bidPrice)) * 100;
    // Return processed data
    return {
      plusTwoPercent: totalValues["+2%"],
      minusTwoPercent: totalValues["-2%"],
      spread: spread,
      volume: parseFloat(tickerData.quoteVolume)
    };
  } catch (error) {
    Logger.log('Error fetching MEXC data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function fetchKuCoinData(symbol = 'ROUTE-USDT') {
  try {
    Logger.log('Starting KuCoin data fetch for symbol: ' + symbol);
    
    // Fetch ticker data with options
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const tickerResponse = UrlFetchApp.fetch(
      `https://api.kucoin.com/api/v1/market/stats?symbol=${symbol}`,
      tickerOptions
    );
    Logger.log('Ticker Response Status: ' + tickerResponse.getResponseCode());
    const tickerData = JSON.parse(tickerResponse.getContentText());
    Logger.log('Ticker Data: ' + JSON.stringify(tickerData));
    // Fetch orderbook data with options
    const orderbookOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const orderbookResponse = UrlFetchApp.fetch(
      `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${symbol}`,
      orderbookOptions
    );
    Logger.log(orderbookResponse)
    Logger.log('Orderbook Response Status: ' + orderbookResponse.getResponseCode());
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));
    // Calculate depth values
    const lastTradedPrice = parseFloat(tickerData.data.last);
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };
    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };
    // Process bids for +2% depth calculation
    orderbookData.data.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });
    // Process asks for -2% depth calculation
    orderbookData.data.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;
      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });
    // Calculate spread
    const spread = ((parseFloat(tickerData.data.sell) - parseFloat(tickerData.data.buy)) / 
                    parseFloat(tickerData.data.buy)) * 100;
    // Return processed data
    return {
      plusTwoPercent: totalValues["+2%"],
      minusTwoPercent: totalValues["-2%"],
      spread: spread,
      volume: parseFloat(tickerData.data.volValue)
    };
  } catch (error) {
    Logger.log('Error fetching KuCoin data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function fetchGateData(symbol = 'ROUTE_USDT') {
  try {
    Logger.log('Starting Gate.io data fetch for symbol: ' + symbol);
    
    // Fetch ticker data
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const tickerResponse = UrlFetchApp.fetch(
      `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol}`,
      tickerOptions
    );
    Logger.log('Ticker Response Status: ' + tickerResponse.getResponseCode());
    const tickerData = JSON.parse(tickerResponse.getContentText());
    Logger.log('Ticker Data: ' + JSON.stringify(tickerData));

    // Fetch orderbook data
    const orderbookOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };
    const orderbookResponse = UrlFetchApp.fetch(
      `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${symbol}`,
      orderbookOptions
    );
    Logger.log('Orderbook Response Status: ' + orderbookResponse.getResponseCode());
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));

    // Fetch trade data for last price
    const tradesResponse = UrlFetchApp.fetch(
      `https://api.gateio.ws/api/v4/spot/trades?currency_pair=${symbol}`,
      tickerOptions
    );
    const tradesData = JSON.parse(tradesResponse.getContentText());
    const lastTradedPrice = parseFloat(tradesData[0].price);

    // Calculate depth values
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };

    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };

    // Process bids for depth calculation
    orderbookData.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;

      // Calculate totals for ranges
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });

    orderbookData.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;

      // Calculate totals for ranges
      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });

    // Calculate spread
    const askPrice = parseFloat(tickerData[0].lowest_ask);
    const bidPrice = parseFloat(tickerData[0].highest_bid);
    const spread = ((askPrice - bidPrice) / bidPrice * 100).toFixed(2);

    // Return processed data
    return {
      plusTwoPercent: totalValues["+2%"],
      minusTwoPercent: totalValues["-2%"],
      spread: parseFloat(spread),
      volume: parseFloat(tickerData[0].quote_volume)
    };
  } catch (error) {
    Logger.log('Error fetching Gate.io data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function fetchBitgetData(symbol = 'ROUTEUSDT') {
  try {
    Logger.log('Starting Bitget data fetch for symbol: ' + symbol);
    
    // Fetch ticker data
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };

    // Get ticker data version 2 for last price
    const tickerV2Response = UrlFetchApp.fetch(
      `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}`,
      tickerOptions
    );
    const tickerV2Data = JSON.parse(tickerV2Response.getContentText());
    Logger.log('Ticker V2 Data: ' + JSON.stringify(tickerV2Data));

    // Get ticker data version 1 for other stats
    const tickerV1Response = UrlFetchApp.fetch(
      `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${symbol}_SPBL`,
      tickerOptions
    );
    const tickerV1Data = JSON.parse(tickerV1Response.getContentText());
    Logger.log('Ticker V1 Data: ' + JSON.stringify(tickerV1Data));

    // Fetch orderbook data
    const orderbookResponse = UrlFetchApp.fetch(
      `https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${symbol}&type=step0&limit=100`,
      tickerOptions
    );
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));

    // Calculate depth values
    const lastTradedPrice = parseFloat(tickerV2Data.data[0].lastPr);
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };

    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };

    // Process bids for both +2% and -2% depth calculation
    orderbookData.data.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;

      // Calculate totals for ranges
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });

    // Process bids for both +2% and -2% depth calculation
    orderbookData.data.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;
      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });

    // Get quote volume and spread from ticker data
    const volume = parseFloat(tickerV2Data.data[0].usdtVolume);
    const askPrice = parseFloat(tickerV2Data.data[0].askPr);
    const bidPrice = parseFloat(tickerV2Data.data[0].bidPr);
    const spread = ((askPrice - bidPrice) / bidPrice * 100).toFixed(2);

    // Return processed data
    return {
      plusTwoPercent: totalValues["+2%"],
      minusTwoPercent: totalValues["-2%"],
      spread: parseFloat(spread),
      volume: volume
    };
  } catch (error) {
    Logger.log('Error fetching Bitget data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function fetchHTXData(symbol = 'routeusdt') {
  try {
    Logger.log('Starting HTX data fetch for symbol: ' + symbol);
    
    // Fetch ticker data
    const tickerOptions = {
      'method': 'get',
      'muteHttpExceptions': true
    };

    // Get trade data
    const tickerResponse = UrlFetchApp.fetch(
      `https://api.huobi.pro/market/trade?symbol=${symbol}`,
      tickerOptions
    );
    Logger.log('Trade Response Status: ' + tickerResponse.getResponseCode());
    const tickerData = JSON.parse(tickerResponse.getContentText());
    Logger.log('Trade Data: ' + JSON.stringify(tickerData));

    // Get orderbook data
    const orderbookResponse = UrlFetchApp.fetch(
      `https://api.huobi.pro/market/depth?symbol=${symbol}&depth=20&type=step0`,
      tickerOptions
    );
    Logger.log('Orderbook Response Status: ' + orderbookResponse.getResponseCode());
    const orderbookData = JSON.parse(orderbookResponse.getContentText());
    Logger.log('Orderbook Data: ' + JSON.stringify(orderbookData));

    // Calculate depth values
    const lastTradedPrice = tickerData.tick.data[0].price;
    const ranges = {
      "+2%": lastTradedPrice * 1.02,
      "-2%": lastTradedPrice * 0.98
    };

    const totalValues = {
      "+2%": 0,
      "-2%": 0
    };

    // Process bids for both +2% and -2% depth calculation
    orderbookData.tick.bids.forEach(bid => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const value = price * quantity;

      // Calculate totals for ranges
      if (price >= ranges["-2%"]) {
        totalValues["-2%"] += value;
      }
    });

    orderbookData.tick.asks.forEach(ask => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const value = price * quantity;

      if (price <= ranges["+2%"]) {
        totalValues["+2%"] += value;
      }
    });

    // Get spread using best ask and bid from orderbook
    const askPrice = parseFloat(orderbookData.tick.asks[0][0]);
    const bidPrice = parseFloat(orderbookData.tick.bids[0][0]);
    const spread = ((askPrice - bidPrice) / bidPrice * 100).toFixed(2);

    // Get 24h market details for volume
    const detailResponse = UrlFetchApp.fetch(
      `https://api.huobi.pro/market/detail?symbol=${symbol}`,
      tickerOptions
    );
    const detailData = JSON.parse(detailResponse.getContentText());
    const volume = parseFloat(detailData.tick.vol);

    Logger.log('Calculated values:');
    Logger.log('Plus Two Percent:', totalValues["+2%"]);
    Logger.log('Minus Two Percent:', totalValues["-2%"]);
    Logger.log('Spread:', spread);
    Logger.log('Volume:', volume);

    // Return processed data
    return {
      plusTwoPercent: totalValues["+2%"],
      minusTwoPercent: totalValues["-2%"],
      spread: parseFloat(spread),
      volume: volume
    };

  } catch (error) {
    Logger.log('Error fetching HTX data: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

function sendBitgetHourlyUpdate() {
  try {
    // Fetch Bitget data
    const bitgetData = fetchBitgetData('ROUTEUSDT');
    
    // Format the message with metrics
    let message = {
      "text": "Bitget Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *Bitget Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${bitgetData.spread.toFixed(3)}%
• +2% Depth: $${bitgetData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${bitgetData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${bitgetData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('Bitget hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending Bitget hourly update: ' + error);
  }
}

function sendHTXHourlyUpdate() {
  try {
    // Fetch Bitget data
    const HTXData = fetchHTXData('routeusdt');
    
    // Format the message with metrics
    let message = {
      "text": "HTX Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *HTX Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${HTXData.spread.toFixed(3)}%
• +2% Depth: $${HTXData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${HTXData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${HTXData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('HTX hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending HTX hourly update: ' + error);
  }
}

function sendMEXCHourlyUpdate() {
  try {
    // Fetch Bitget data
    const mexcData = fetchMEXCData('ROUTEUSDT');
    
    // Format the message with metrics
    let message = {
      "text": "MEXC Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *MEXC Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${mexcData.spread.toFixed(3)}%
• +2% Depth: $${mexcData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${mexcData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${mexcData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('MEXC hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending MEXC hourly update: ' + error);
  }
}

function sendKucoinHourlyUpdate() {
  try {
    // Fetch Bitget data
    const kuCoinData = fetchKuCoinData('ROUTE-USDT');
    
    // Format the message with metrics
    let message = {
      "text": "Kucoin Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *Kucoin Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${kuCoinData.spread.toFixed(3)}%
• +2% Depth: $${kuCoinData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${kuCoinData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${kuCoinData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('Kucoin hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending Kucoin hourly update: ' + error);
  }
}

function sendASCENDEXHourlyUpdate() {
  try {
    // Fetch Bitget data
    const ascendexData = fetchAscendEXData('ROUTE/USDT');
    
    // Format the message with metrics
    let message = {
      "text": "ASCENDEX Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *ASCENDEX Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${ascendexData.spread.toFixed(3)}%
• +2% Depth: $${ascendexData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${ascendexData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${ascendexData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('ASCENDEX hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending ASCENDEX hourly update: ' + error);
  }
}

function sendGATEHourlyUpdate() {
  try {
    // Fetch Bitget data
    const gateData = fetchGateData('ROUTE_USDT');
    
    // Format the message with metrics
    let message = {
      "text": "GATE Hourly Update",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":chart_with_upwards_trend: *GATE Hourly Market Update* :chart_with_upwards_trend:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Current Metrics:*\n
• Spread: ${gateData.spread.toFixed(3)}%
• +2% Depth: $${gateData.plusTwoPercent.toFixed(2)}
• -2% Depth: $${gateData.minusTwoPercent.toFixed(2)}
• 24h Volume: $${gateData.volume.toLocaleString()}`
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Last updated: ${new Date().toUTCString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack
    const webhook = "";
    var options = {
      "method": "post",
      "contentType": "application/json",
      "muteHttpExceptions": true,
      "payload": JSON.stringify(message)
    };

    UrlFetchApp.fetch(webhook, options);
    Logger.log('GATE hourly update sent successfully');
    
  } catch(error) {
    Logger.log('Error sending GATE hourly update: ' + error);
  }
}

// Create a trigger to run this function hourly
function createHourlyTrigger() {
  // Delete any existing triggers with the same function name
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if(trigger.getHandlerFunction() === 'sendBitgetHourlyUpdate') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('sendBitgetHourlyUpdate')
      .timeBased()
      .everyHours(1)
      .create();
}

function getCEXData(cexName) {
  Logger.log('Getting data for CEX: ' + cexName);
  try {
    switch(cexName) {
      case 'KuCoin':
        const kuCoinData = fetchKuCoinData('ROUTE-USDT');
        Logger.log('KuCoin data fetched: ' + JSON.stringify(kuCoinData));
        return kuCoinData;
      case 'MEXC':
        const mexcData = fetchMEXCData('ROUTEUSDT');
        Logger.log('MEXC data fetched: ' + JSON.stringify(mexcData));
        return mexcData;
      case 'ASCENDEX':
        const ascendexData = fetchAscendEXData('ROUTE/USDT');
        Logger.log('AscendEX data fetched: ' + JSON.stringify(ascendexData));
        return ascendexData;
      case 'GATE':
        const gateData = fetchGateData('ROUTE_USDT');
        Logger.log('Gate.io data fetched: ' + JSON.stringify(gateData));
        return gateData;
      case 'BITGET':
        const bitgetData = fetchBitgetData('ROUTEUSDT');
        Logger.log('Bitget data fetched: ' + JSON.stringify(bitgetData));
        return bitgetData;  
      case 'HTX':
        const HTXData = fetchHTXData('routeusdt');
        Logger.log('HTX data fetched: ' + JSON.stringify(HTXData));
        return HTXData;   
      default:
        Logger.log('nothing just logging.');
        return {
          plusTwoPercent: 0,
          minusTwoPercent: 0,
          spread: 0,
          volume: 0
        };
    }
  } catch (error) {
    Logger.log('Error in getCEXData: ' + error);
    return {
      plusTwoPercent: 0,
      minusTwoPercent: 0,
      spread: 0,
      volume: 0
    };
  }
}

// Test function to debug MEXC API
function testMEXCAPI() {
  Logger.log('Starting MEXC API test');
  try {
    const data = fetchMEXCData('ROUTEUSDT');
    Logger.log('Test results:');
    Logger.log('Volume:', data.volume.toLocaleString());
    Logger.log('Spread:', data.spread);
    Logger.log('-2%:', data.minusTwoPercent.toFixed(2));
    Logger.log('+2%:', data.plusTwoPercent.toFixed(2));
  } catch (error) {
    Logger.log('Test error: ' + error);
  }
}

// Test function to debug KuCoin API
function testKuCoinAPI() {
  Logger.log('Starting KuCoin API test');
  try {
    const data = fetchKuCoinData('ROUTE-USDT');
    Logger.log('Test results:');
    Logger.log('Plus Two Percent: ' + data.plusTwoPercent);
    Logger.log('Minus Two Percent: ' + data.minusTwoPercent);
    Logger.log('Spread: ' + data.spread);
    Logger.log('Volume: ' + data.volume);
  } catch (error) {
    Logger.log('Test error: ' + error);
  }
}
