// Function to fetch and calculate total staked ROUTE
function fetchTotalRouteStaked() {
  try {
    const response = UrlFetchApp.fetch(
      'https://sentry.lcd.routerprotocol.com/cosmos/staking/v1beta1/pool',
      { muteHttpExceptions: true }
    );
    
    const data = JSON.parse(response.getContentText());
    return Number(data.pool.bonded_tokens) / Math.pow(10, 18);
  } catch (error) {
    Logger.log('Error fetching staked data: ' + error);
    return 0;
  }
}

// Main function to record total staked data
function recordTotalStakedData() {
  try {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName('Total Route Staked');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Total Route Staked');
      // Add headers
      sheet.getRange('A1:B1').setValues([[
        'Timestamp',
        'Total Route Staked'
      ]]);
      
      // Format headers
      sheet.getRange('A1:B1')
        .setBackground('#D3D3D3')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
    }
    
    // Fetch and prepare data
    const totalStaked = fetchTotalRouteStaked();
    const rowData = [new Date(), totalStaked];
    
    // Add new row of data
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Format the new row
    sheet.getRange(nextRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(nextRow, 2).setNumberFormat('#,##0.000000');
    
    // Auto-size columns
    sheet.autoResizeColumns(1, 2);
    
    Logger.log('Total staked data updated successfully');
    
  } catch(error) {
    Logger.log('Error recording total staked data: ' + error);
  }
}

// Create trigger to run every hour
function createHourlyStakedDataTrigger() {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if(trigger.getHandlerFunction() === 'recordTotalStakedData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('recordTotalStakedData')
      .timeBased()
      .everyHours(1)
      .create();
}
