function createSummary() {
  Logger.log('Creating summary..')
  var sheet = SpreadsheetApp.getActive().getSheetByName('Summary');
  var values = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  var currentUTCDate = new Date();
  var utcYear = currentUTCDate.getUTCFullYear();
  var utcMonth = currentUTCDate.getUTCMonth(); // Note: Months are zero-indexed
  var utcDay = currentUTCDate.getUTCDate();

  // Normalize the time part of the date to midnight UTC to only compare the date
  currentUTCDate.setUTCFullYear(utcYear, utcMonth, utcDay);
  currentUTCDate.setUTCHours(0, 0, 0, 0);

  var previousDayUTC = new Date(currentUTCDate);
  previousDayUTC.setUTCDate(currentUTCDate.getUTCDate() - 1);

  var finalValues = []
  for (var value of values) {
    if (value[0] == '') {
      break
    }
    var dateInSheet = value[0]
    var utcDateInSheet = new Date(Date.UTC(dateInSheet.getFullYear(), dateInSheet.getMonth(), dateInSheet.getDate()));
    if (utcDateInSheet.getTime() == currentUTCDate.getTime()) {
      continue
    } else {
      finalValues.push(value)
    }
  }
  var data = getDetailedData(currentUTCDate)
  var resultArray = [...finalValues, ...data];
  Logger.log(resultArray)
  sheet.getRange(2, 1, resultArray.length, resultArray[0].length).setValues(resultArray)
  Logger.log('Created summary..')
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  
  // Sort by second column (ascending), then by first column (descending)
  range.sort([
    {column: 1, ascending: false},
    {column: 6, ascending: false}
  ]);
}

function getDetailedData(currentUTCDate) {
  var sheet = SpreadsheetApp.getActive().getSheetByName('CEX Hourly Average');
  var values = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  
  var cexMap = new Map();
  for (var value of values) {
    if (value[0] == '') {
      break
    }
    var dateInSheet = value[0]
    var utcDateInSheet = new Date(Date.UTC(dateInSheet.getFullYear(), dateInSheet.getMonth(), dateInSheet.getDate()));
    if (utcDateInSheet.getTime() === currentUTCDate.getTime()) {
      if (cexMap[value[1]] == null) {
        var obj = {}
        obj.plus2 = 0
        obj.minus2 = 0
        obj.spread = 0
        obj.volume = 0
        obj.len = 0
        cexMap[value[1]] = obj
      }
      cexMap[value[1]].plus2 = cexMap[value[1]].plus2 + value[2]
      cexMap[value[1]].minus2 = cexMap[value[1]].minus2 + value[3]
      cexMap[value[1]].spread = cexMap[value[1]].spread + value[4]
      cexMap[value[1]].volume = cexMap[value[1]].volume + value[5]
      cexMap[value[1]].len = cexMap[value[1]].len + 1
    }
  }

  var allData = []
  for (var [key, value] of Object.entries(cexMap)) {
    var sheetRow = []
    sheetRow.push(currentUTCDate)
    sheetRow.push(key)
    sheetRow.push(value.plus2 / value.len)
    sheetRow.push(value.minus2 / value.len)
    sheetRow.push(value.spread / value.len)
    sheetRow.push(value.volume / value.len)
    allData.push(sheetRow)
  }

  return allData
}

function cleanUpData() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('CEX Hourly Average');
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues(); // Get values from row 2 to last row

  var currentUTCDate = new Date();
  currentUTCDate.setUTCDate(currentUTCDate.getUTCDate() - 2); 

  var utcYear = currentUTCDate.getUTCFullYear();
  var utcMonth = currentUTCDate.getUTCMonth(); // Note: Months are zero-indexed
  var utcDay = currentUTCDate.getUTCDate();

  // Normalize the time part of the date to midnight UTC to only compare the date
  currentUTCDate.setUTCFullYear(utcYear, utcMonth, utcDay);
  currentUTCDate.setUTCHours(0, 0, 0, 0);

  // Array to store the rows to delete
  var rowsToDelete = [];

  // Loop through each row in the data
  for (var i = 0; i < values.length; i++) {
    var value = values[i];

    if (value[0] === '') {
      break;
    }

    // Parse the date in the first column
    var dateInSheet = new Date(value[0]);
    var utcDateInSheet = new Date(Date.UTC(dateInSheet.getFullYear(), dateInSheet.getMonth(), dateInSheet.getDate()));

    // Compare the date with the current UTC date
    if (utcDateInSheet.getTime() === currentUTCDate.getTime()) {
      // If dates don't match, mark this row for deletion (1-indexed row)
      rowsToDelete.push(i + 2); // +2 because we start from row 2 (row 1 is headers)
      Logger.log('Found matched date, marking row ' + (i + 2) + ' for deletion');
    }
  }

  // Delete rows in reverse order to avoid index shifting
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }
}
