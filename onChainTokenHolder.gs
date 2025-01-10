
// Token addresses configuration
const TOKENS = {
    ethereum: {
        v1: "0x16eccfdbb4ee1a85a33f3a9b21175cd7ae753db4",
        v2: "0x60F67E1015b3f069DD4358a78c38f83fE3a667A9"
    },
    polygon: {
        v1: "0x16eccfdbb4ee1a85a33f3a9b21175cd7ae753db4",
        v2: "0x93890f346C5D02C3863a06657bc72555dC72c527"
    },
    bsc: {
        v1: "0xfD2700c51812753215754De9EC51Cdd42Bf725B9",
    }
};

// Bitquery API configuration
const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_API_KEY = 'API_KEY'; // Replace with your API key

// Function to create GraphQL query
function createQuery(network, address, date) {
    return {
        query: `
        {
            EVM(dataset: archive, network: ${network}) {
                TokenHolders(
                    date: "${date}"
                    tokenSmartContract: "${address}"
                    where: {Balance: {Amount: {gt: "0"}}}
                ) {
                    uniq(of: Holder_Address)
                }
            }
        }`
    };
}

// Function to fetch holder count from Bitquery
function fetchHolderCount(network, address, date) {
    try {
        const options = {
            'method': 'post',
            'contentType': 'application/json',
            'headers': {
                'X-API-KEY': BITQUERY_API_KEY
            },
            'payload': JSON.stringify(createQuery(network, address, date))
        };

        const response = UrlFetchApp.fetch(BITQUERY_API, options);
        const responseData = JSON.parse(response.getContentText());
        return responseData.data.EVM.TokenHolders[0].uniq;
    } catch (error) {
        Logger.log(`Error fetching data for ${network} address ${address}: ${error.message}`);
        return 'Error';
    }
}

// Main function to update spreadsheet
function updateRouteHoldersData() {
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if the sheet exists, if not create it
    let sheet = spreadsheet.getSheetByName("ROUTE OnChain Token Holders");
    if (!sheet) {
        sheet = spreadsheet.insertSheet("ROUTE OnChain Token Holders");
        
        // Set headers
        const headers = [
            ['Date', 'ROUTE Version', 'Ethereum', 'BNB Chain']
        ];
        sheet.getRange(1, 1, 1, 4).setValues(headers);
        
        // Style headers
        const headerRange = sheet.getRange(1, 1, 1, 4);
        headerRange.setBackground('#E0E0E0');
        headerRange.setFontWeight('bold');
        
        // Set column widths
        sheet.setColumnWidth(1, 120); // Date
        sheet.setColumnWidth(2, 120); // ROUTE Version
        sheet.setColumnWidth(3, 120); // Ethereum
        sheet.setColumnWidth(4, 120); // BNB Chain
    }

    // Get current date
    const currentDate = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");
    
    // Fetch Ethereum data
    Logger.log('Fetching Ethereum data...');
    const ethV1Holders = fetchHolderCount('eth', TOKENS.ethereum.v1, currentDate);
    const ethV2Holders = fetchHolderCount('eth', TOKENS.ethereum.v2, currentDate);
    
    // Fetch BNB Chain data
    Logger.log('Fetching BNB Chain data...');
    const bscV1Holders = fetchHolderCount('bsc', TOKENS.bsc.v1, currentDate);

    // Prepare new data rows with an empty row for spacing
    const newData = [
        [currentDate, 'V1', ethV1Holders, bscV1Holders],
        [currentDate, 'V2', ethV2Holders, ''],
        ['', '', '', ''] // Empty row for spacing
    ];

    // Find the last row and append new data
    const lastRow = Math.max(1, sheet.getLastRow());
    sheet.getRange(lastRow + 1, 1, 3, 4).setValues(newData);

    // Log summary
    Logger.log('Summary:');
    Logger.log('=========');
    Logger.log(`Date: ${currentDate}`);
    Logger.log(`Ethereum V1 Holders: ${ethV1Holders}`);
    Logger.log(`Ethereum V2 Holders: ${ethV2Holders}`);
    Logger.log(`BNB Chain V1 Holders: ${bscV1Holders}`);
    Logger.log('Data updated successfully');
}
