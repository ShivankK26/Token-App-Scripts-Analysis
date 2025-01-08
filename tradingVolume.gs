// Function to fetch KuCoin volume
function fetchKuCoinVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://api.kucoin.com/api/v1/market/stats?symbol=ROUTE-USDT',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    return parseFloat(data.data.volValue) || 0;
  } catch (error) {
    Logger.log('Error fetching KuCoin volume: ' + error);
    return 0;
  }
}

// Function to fetch MEXC volume
function fetchMEXCVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://api.mexc.com/api/v3/ticker/24hr?symbol=ROUTEUSDT',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    return parseFloat(data.quoteVolume) || 0;
  } catch (error) {
    Logger.log('Error fetching MEXC volume: ' + error);
    return 0;
  }
}

// Function to fetch AscendEX volume
function fetchAscendEXVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://ascendex.com/api/pro/v1/spot/ticker?symbol=ROUTE/USDT',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    const price = parseFloat(data.data.close);
    const volume = parseFloat(data.data.volume);
    return price * volume || 0;
  } catch (error) {
    Logger.log('Error fetching AscendEX volume: ' + error);
    return 0;
  }
}

// Function to fetch Gate.io volume
function fetchGateVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=ROUTE_USDT',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    return parseFloat(data[0].quote_volume) || 0;
  } catch (error) {
    Logger.log('Error fetching Gate.io volume: ' + error);
    return 0;
  }
}

// Function to fetch Bitget volume
function fetchBitgetVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://api.bitget.com/api/v2/spot/market/tickers?symbol=ROUTEUSDT',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    return parseFloat(data.data[0].usdtVolume) || 0;
  } catch (error) {
    Logger.log('Error fetching Bitget volume: ' + error);
    return 0;
  }
}

// Function to fetch HTX volume
function fetchHTXVolume() {
  try {
    const response = UrlFetchApp.fetch(
      'https://api.huobi.pro/market/detail?symbol=routeusdt',
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(response.getContentText());
    return parseFloat(data.tick.vol) || 0;
  } catch (error) {
    Logger.log('Error fetching HTX volume: ' + error);
    return 0;
  }
}

// Function to get volume for a specific exchange
function getExchangeVolume(exchange) {
  switch(exchange) {
    case 'KuCoin':
      return fetchKuCoinVolume();
    case 'MEXC':
      return fetchMEXCVolume();
    case 'ASCENDEX':
      return fetchAscendEXVolume();
    case 'GATE':
      return fetchGateVolume();
    case 'BITGET':
      return fetchBitgetVolume();
    case 'HTX':
      return fetchHTXVolume();
    default:
      return 0;
  }
}

// Main function to calculate and record total volume
function calculateTotalVolume() {
  try {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName('Total Trading Volume');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Total Trading Volume');
      // Add headers
      sheet.getRange('A1:H1').setValues([[
        'Timestamp',
        'Total Volume',
        ...CONFIG.CEX_LIST
      ]]);
      
      // Format headers
      sheet.getRange('A1:H1')
        .setBackground('#D3D3D3')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
    }
    
    let totalVolume = 0;
    const volumeByExchange = {};
    
    // Collect volume data from each exchange
    for (const cex of CONFIG.CEX_LIST) {
      const volume = getExchangeVolume(cex);
      volumeByExchange[cex] = volume;
      totalVolume += volume;
    }
    
    // Prepare row data
    const currentDate = new Date();
    const rowData = [
      currentDate,
      totalVolume,
      ...CONFIG.CEX_LIST.map(cex => volumeByExchange[cex] || 0)
    ];
    
    // Add new row of data
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Format the new row
    sheet.getRange(nextRow, 2, 1, rowData.length - 1).setNumberFormat('$#,##0.00');
    sheet.getRange(nextRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Auto-size columns
    sheet.autoResizeColumns(1, rowData.length);
    
    Logger.log('Volume data updated successfully');
    
  } catch(error) {
    Logger.log('Error calculating total volume: ' + error);
  }
}

// Create trigger to run every hour
function createHourlyVolumeTrigger() {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if(trigger.getHandlerFunction() === 'calculateTotalVolume') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('calculateTotalVolume')
      .timeBased()
      .everyHours(1)
      .create();
}
