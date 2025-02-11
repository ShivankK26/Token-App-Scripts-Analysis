// Function to fetch total staked ROUTE data
function fetchTotalStakedROUTE() {
  try {
    const response = UrlFetchApp.fetch(
      'https://hub.routerprotocol.com/_next/data/UKpFlD_rehphUPcO4uJNK/staking.json',
      { muteHttpExceptions: true }
    );
    
    const data = JSON.parse(response.getContentText());
    return {
      totalStaked: parseFloat(data.pageProps.totalStakedRoute),
      apr: parseFloat(data.pageProps.apr),
      inflationRate: parseFloat(data.pageProps.inflationRate),
      unbondingPeriod: parseInt(data.pageProps.unbondingPeriod)
    };
  } catch (error) {
    Logger.log('Error fetching staking data: ' + error);
    return {
      totalStaked: 0,
      apr: 0,
      inflationRate: 0,
      unbondingPeriod: 0
    };
  }
}

// Main function to record staking data
function recordStakingData() {
  try {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName('Total Staked ROUTE');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Total Staked ROUTE');
      // Add headers
      sheet.getRange('A1:E1').setValues([[
        'Timestamp',
        'Total Staked ROUTE',
        'APR (%)',
        'Inflation Rate (%)',
        'Unbonding Period (days)'
      ]]);
      
      // Format headers
      sheet.getRange('A1:E1')
        .setBackground('#D3D3D3')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
    }
    
    // Fetch current data
    const stakingData = fetchTotalStakedROUTE();
    
    // Prepare row data
    const rowData = [
      new Date(),
      stakingData.totalStaked,
      stakingData.apr,
      stakingData.inflationRate,
      stakingData.unbondingPeriod
    ];
    
    // Add new row of data
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Format the new row
    sheet.getRange(nextRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(nextRow, 2).setNumberFormat('#,##0.000000');
    sheet.getRange(nextRow, 3, 1, 2).setNumberFormat('#,##0.00"%"');
    sheet.getRange(nextRow, 5).setNumberFormat('#,##0" days"');
    
    // Auto-size columns
    sheet.autoResizeColumns(1, rowData.length);
    
    Logger.log('Staking data updated successfully');
    
  } catch(error) {
    Logger.log('Error recording staking data: ' + error);
  }
}

// Create trigger to run every hour
function createHourlyStakingTrigger() {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if(trigger.getHandlerFunction() === 'recordStakingData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('recordStakingData')
      .timeBased()
      .everyHours(1)
      .create();
}
