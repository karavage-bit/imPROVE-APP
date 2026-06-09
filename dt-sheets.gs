// Distance Traveled — Google Apps Script Backend
// Deploy as Web App: Execute as Me, Anyone can access
// Paste the deployment URL into dt-atlas.html SHEETS_URL constant

var SPREADSHEET_ID = ''; // Leave blank to auto-create, or paste your Sheets ID here

function getOrCreateSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var existing = DriveApp.getFilesByName('TOL Distance Traveled 2026');
  if (existing.hasNext()) {
    var file = existing.next();
    return SpreadsheetApp.openById(file.getId());
  }
  var ss = SpreadsheetApp.create('TOL Distance Traveled 2026');
  // Set up summary sheet
  var summary = ss.getActiveSheet();
  summary.setName('_Summary');
  summary.getRange('A1:F1').setValues([['Student', 'Core Value 1', 'Core Value 2', 'Days Complete', 'Last Entry', 'Sheet Link']]);
  summary.getRange('A1:F1').setFontWeight('bold').setBackground('#1a2742').setFontColor('#f1e7d2');
  Logger.log('Created spreadsheet: ' + ss.getId());
  return ss;
}

function getOrCreateStudentSheet(ss, studentName) {
  var safeName = studentName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30).trim();
  var sheet = ss.getSheetByName(safeName);
  if (!sheet) {
    sheet = ss.insertSheet(safeName);
    var headers = ['Day', 'Theme', 'Timestamp', 'Real Moment', 'Horizon', 'Pin', 'Has Photo', 'Has Voice'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a2742').setFontColor('#f1e7d2');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 300);
    sheet.setColumnWidth(5, 200);
  }
  return sheet;
}

function updateSummaryRow(ss, studentName, coreValue1, coreValue2, daysComplete) {
  var summary = ss.getSheetByName('_Summary');
  if (!summary) return;
  var data = summary.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === studentName) { rowIndex = i + 1; break; }
  }
  var studentSheet = ss.getSheetByName(studentName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30).trim());
  var sheetUrl = studentSheet ? 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit#gid=' + studentSheet.getSheetId() : '';
  var rowData = [studentName, coreValue1 || '', coreValue2 || '', daysComplete || 0, new Date(), sheetUrl];
  if (rowIndex === -1) {
    summary.appendRow(rowData);
  } else {
    summary.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  }
}

function doPost(e) {
  var result = { ok: false };
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = getOrCreateSpreadsheet();
    var sheet = getOrCreateStudentSheet(ss, data.studentName);
    
    // Find existing row for this day or append new
    var allData = sheet.getDataRange().getValues();
    var existingRow = -1;
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][0]) === String(data.day)) { existingRow = i + 1; break; }
    }
    
    var rowData = [
      data.day,
      data.theme || '',
      new Date(data.timestamp || Date.now()),
      data.realMoment || '',
      data.horizon || '',
      data.pin || '',
      data.hasPhoto ? 'Yes' : 'No',
      data.hasVoice ? 'Yes' : 'No'
    ];
    
    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    // Count filled days
    var filled = 0;
    var rows = sheet.getDataRange().getValues();
    for (var j = 1; j < rows.length; j++) {
      if (rows[j][3] || rows[j][4] || rows[j][5]) filled++;
    }
    
    updateSummaryRow(ss, data.studentName, data.coreValue1, data.coreValue2, filled);
    result = { ok: true, spreadsheetId: ss.getId(), rows: filled };
  } catch (err) {
    result = { ok: false, error: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Distance Traveled API is live' })).setMimeType(ContentService.MimeType.JSON);
}
