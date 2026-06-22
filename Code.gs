/***********************************************************************
 * DISTANCE TRAVELED  -  Google Apps Script backend and health monitor
 * For: John Karavage  (karavage@gmail.com)
 * TOL Summer 2026
 *
 * WHAT THIS DOES
 *   1. Receives every saved session from the app and writes it to your
 *      Google Sheet (one row per save, plus a live "Status" tab that
 *      shows where each student stands).
 *   2. Runs a real health check at 5:00 AM and 5:00 PM every day and
 *      EMAILS YOU the result. This runs on Google's servers, so it works
 *      even when no phone or computer has the app open. This is the part
 *      an AI assistant cannot do for you; this script can.
 *   3. Answers the app's "Instructor sheet reachable" check so your
 *      teacher dashboard can confirm the backend is alive.
 *
 * BUILT TO HANDLE: ~15 students saving over a 6-week course, including
 *   several students hitting "save" at the same moment. All writes are
 *   serialized with a lock so nothing is lost or duplicated.
 *
 * ONE-TIME SETUP  (about 5 minutes)
 *   1. Go to https://sheets.google.com and create a blank Sheet.
 *      Name it something like "TOL Distance Traveled Responses".
 *   2. In that Sheet: Extensions menu  ->  Apps Script.
 *   3. Delete whatever code is there. Paste THIS ENTIRE FILE in.
 *   4. Click Save (disk icon).
 *   5. Click Deploy  ->  New deployment.
 *        - Click the gear, choose "Web app".
 *        - Description: TOL app
 *        - Execute as: Me (your account)
 *        - Who has access: Anyone
 *        - Click Deploy. Authorize when asked (allow access).
 *      Copy the Web app URL it gives you (ends in /exec).
 *   6. Open the app file (dt-atlas.html) in a text editor, find the line
 *      that starts with:   var SHEETS_URL =
 *      and paste your /exec URL between the quotes. Save the app file.
 *   7. Back in Apps Script, in the function dropdown at the top choose
 *      "createTriggers" and click Run once. Authorize if asked.
 *      This sets the 5 AM and 5 PM daily email checks.
 *   8. (Optional test) Choose "healthCheck" in the dropdown and click Run.
 *      You should get an email within a minute.
 *
 * To change who gets the email, edit RECIPIENT below.
 ***********************************************************************/

var RECIPIENT       = 'karavage@gmail.com';
var RESPONSES_SHEET = 'Responses';
var STATUS_SHEET    = 'Status';
var META_SHEET      = 'Meta';

// How long a save will wait for the lock before giving up (milliseconds).
// Generous enough that 15 students saving at once all succeed in turn.
var LOCK_TIMEOUT_MS = 30000;

// Course window. Outside this window the health check won't complain about
// quiet days, so you don't get false alarms before or after the program.
var COURSE_START = '2026-06-22T00:00:00';
var COURSE_END   = '2026-08-01T23:59:59';

var RESP_HEADERS = ['receivedAt','studentName','day','week','theme',
  'hookResponse','compellingResponse','journalResponse','distance',
  'pin','hasPhoto','sessionComplete','sessionsComplete','sessionsTotal',
  'percentComplete','coreValue1','coreValue2','startLine','clientTime'];

/* ---------- receive a save from the app ---------- */
function doPost(e) {
  // Validate the request body before doing anything else.
  if (!e || !e.postData || !e.postData.contents) {
    return json({ ok: false, error: 'No data received.' });
  }

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Could not read the save (invalid JSON).' });
  }

  // A save with no student name is junk; reject it so the data and the
  // "no submissions in 24h" alert stay meaningful.
  if (!data || !String(data.studentName || '').trim()) {
    return json({ ok: false, error: 'Missing student name.' });
  }

  // Serialize all writes. Without this, two students saving at the same
  // instant can clobber each other or create duplicate Status rows.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
  } catch (err) {
    return json({ ok: false, error: 'Server busy, please tap save again.' });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = getOrCreateSheet(ss, RESPONSES_SHEET, RESP_HEADERS);

    sh.appendRow([
      new Date(),
      str(data.studentName), num(data.day), num(data.week), str(data.theme),
      str(data.hookResponse), str(data.compellingResponse), str(data.journalResponse),
      str(data.distance), str(data.pin), bool(data.hasPhoto), bool(data.sessionComplete),
      num(data.sessionsComplete), num(data.sessionsTotal), num(data.percentComplete),
      str(data.coreValue1), str(data.coreValue2), str(data.startLine),
      data.timestamp ? new Date(Number(data.timestamp)) : ''
    ]);

    updateStatus(ss, data);
    SpreadsheetApp.flush(); // make sure it's written before we release the lock
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- live per-student status tab ----------
   Always called from inside the doPost lock, so it is safe to read the
   sheet, find the student's row, and overwrite it in place.
   Rows are matched on a NORMALIZED name (case- and spacing-insensitive)
   so "john  smith", "John Smith", and "JOHN SMITH" all land on one row
   even though students retype their name by hand. */
function updateStatus(ss, data) {
  if (!data.studentName || String(data.studentName).indexOf('HEALTH CHECK') === 0) return;
  var headers = ['studentName','sessionsComplete','sessionsTotal','percentComplete','lastUpdate','lastSession'];
  var sh = getOrCreateSheet(ss, STATUS_SHEET, headers);
  var display = normName(data.studentName);
  var key = matchKey(display);
  var values = sh.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < values.length; i++) {
    if (matchKey(values[i][0]) === key) { rowIdx = i + 1; break; }
  }
  var row = [ display, num(data.sessionsComplete), num(data.sessionsTotal),
              num(data.percentComplete), new Date(), str(data.theme) ];
  if (rowIdx === -1) sh.appendRow(row);
  else sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
}

/* Tidy a name for display: collapse spaces, trim, Title Case. Mirrors the
   app's normalizeName() so the Sheet shows clean, consistent names. */
function normName(raw) {
  var n = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  return n.replace(/\S+/g, function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}
/* Case/spacing-insensitive key used only for matching one student to one row. */
function matchKey(raw) {
  return String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim().toLowerCase();
}

/* ---------- health endpoint for the app dashboard (JSONP) ---------- */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.health) {
    var info = healthSnapshot();
    if (p.callback) {
      return ContentService
        .createTextOutput(p.callback + '(' + JSON.stringify(JSON.stringify(info)) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return json(info);
  }
  return ContentService.createTextOutput('Distance Traveled backend is running.');
}

function healthSnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RESPONSES_SHEET);
  var rows = 0, students = 0, lastSub = '';
  if (sh && sh.getLastRow() > 1) {
    var v = sh.getDataRange().getValues();
    rows = v.length - 1;
    var names = {}, last = 0;
    for (var i = 1; i < v.length; i++) {
      var nm = String(v[i][1]);
      if (nm && nm.indexOf('HEALTH CHECK') !== 0) names[nm] = true;
      var t = v[i][0] ? new Date(v[i][0]).getTime() : 0;
      if (t > last) last = t;
    }
    students = Object.keys(names).length;
    if (last) lastSub = new Date(last).toLocaleString();
  }
  // per-student roster from the Status sheet (for the teacher dashboard)
  var roster = [];
  var st = ss.getSheetByName(STATUS_SHEET);
  if (st && st.getLastRow() > 1) {
    var sv = st.getDataRange().getValues();
    for (var r = 1; r < sv.length; r++) {
      roster.push({ name: String(sv[r][0]), complete: Number(sv[r][1]) || 0,
                    total: Number(sv[r][2]) || 0, pct: Number(sv[r][3]) || 0,
                    lastUpdate: sv[r][4] ? new Date(sv[r][4]).toLocaleString() : '' });
    }
  }
  return { ok: true, rows: rows, students: students,
           lastSubmission: lastSub, lastCheck: getMeta('lastCheck'), roster: roster };
}

/* ---------- scheduled 5 AM and 5 PM check + email ---------- */
function healthCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var problems = [];

  // can we write?
  var writeOk = true;
  try {
    getOrCreateSheet(ss, META_SHEET, ['key','value']);
    setMeta('lastCheck', new Date().toLocaleString());
  } catch (err) { writeOk = false; problems.push('Cannot write to the Sheet: ' + err); }

  var snap = healthSnapshot();

  // submissions in the last 24h
  var recent = 0;
  var sh = ss.getSheetByName(RESPONSES_SHEET);
  if (sh && sh.getLastRow() > 1) {
    var v = sh.getDataRange().getValues();
    var cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (var i = 1; i < v.length; i++) {
      var t = v[i][0] ? new Date(v[i][0]).getTime() : 0;
      if (t >= cutoff) recent++;
    }
  }

  // During the course, zero submissions in 24h is worth flagging.
  var now = new Date();
  var inSession = (now >= new Date(COURSE_START) && now <= new Date(COURSE_END));
  if (inSession && recent === 0) problems.push('No student submissions in the last 24 hours during an active course week.');

  var status = problems.length ? 'ATTENTION NEEDED' : 'OK';
  var subject = 'TOL App Health (' + timeLabel(now) + '): ' + status;

  var body =
    'Distance Traveled  -  automated health check\n' +
    now.toLocaleString() + '\n\n' +
    'STATUS: ' + status + '\n\n' +
    'Total responses stored: ' + snap.rows + '\n' +
    'Unique students submitting: ' + snap.students + '\n' +
    'Submissions in last 24 hours: ' + recent + '\n' +
    'Most recent submission: ' + (snap.lastSubmission || 'none yet') + '\n' +
    'Sheet writable: ' + (writeOk ? 'yes' : 'NO') + '\n' +
    'Last Drive backup: ' + (getMeta('lastBackup') || 'none yet') + '\n\n' +
    (problems.length
        ? 'ISSUES:\n - ' + problems.join('\n - ') + '\n\n'
        : 'No issues detected.\n\n') +
    'Sheet: ' + ss.getUrl() + '\n' +
    'This is an automated message from your Apps Script monitor.';

  MailApp.sendEmail(RECIPIENT, subject, body);
}

/* ---------- set the daily triggers (run once) ----------
   Re-run this any time; it clears its own old triggers first, so it is
   safe to run again after you paste an updated version of this file. */
function createTriggers() {
  var mine = { healthCheck: true, backupSheet: true };
  var trigs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trigs.length; i++) {
    if (mine[trigs[i].getHandlerFunction()]) ScriptApp.deleteTrigger(trigs[i]);
  }
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(5).everyDays(1).create();
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(17).everyDays(1).create();
  ScriptApp.newTrigger('backupSheet').timeBased().atHour(2).everyDays(1).create();
  MailApp.sendEmail(RECIPIENT, 'TOL App: monitoring is set up',
    'Your automated jobs are now scheduled:\n' +
    ' - 5:00 AM and 5:00 PM: health check email with app + submission status.\n' +
    ' - 2:00 AM: full backup copy of your Sheet saved to Google Drive\n' +
    '   (folder "' + BACKUP_FOLDER + '", keeping the ' + BACKUP_KEEP + ' most recent).\n\n' +
    'Note: the backup needs Google Drive permission. The first time it runs\n' +
    '(or when you click Run on backupSheet) you may be asked to authorize.');
}

/* ---------- daily off-site backup of the whole Sheet ----------
   A single corrupted or deleted Sheet would otherwise lose everything.
   This keeps a rolling set of full copies in your Drive. */
var BACKUP_FOLDER = 'TOL Distance Traveled Backups';
var BACKUP_KEEP   = 14; // keep two weeks of daily copies

function backupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = getBackupFolder_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' BACKUP ' + stamp, folder);
  pruneBackups_(folder);
  setMeta('lastBackup', new Date().toLocaleString());
}
function getBackupFolder_() {
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}
function pruneBackups_(folder) {
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); files.push({ f: f, t: f.getDateCreated().getTime() }); }
  files.sort(function (a, b) { return b.t - a.t; }); // newest first
  for (var i = BACKUP_KEEP; i < files.length; i++) files[i].f.setTrashed(true);
}

/* ---------- one-time load test: prove concurrent saves are safe ----------
   Run this ONCE from the Apps Script editor (choose loadTest, click Run)
   AFTER you have deployed the web app. It fires 15 saves at your live
   endpoint at the same instant, confirms all 15 distinct rows landed with
   no duplicates and nothing lost, cleans up the test rows, and emails you
   the result. The test names start with "HEALTH CHECK" so they never touch
   the Status tab or your real student counts. */
function loadTest() {
  var url;
  try { url = ScriptApp.getService().getUrl(); } catch (e) { url = ''; }
  if (!url) {
    MailApp.sendEmail(RECIPIENT, 'TOL App Load Test: NOT RUN',
      'Could not find the deployed web app URL. Deploy the web app first ' +
      '(Deploy -> New deployment -> Web app), then run loadTest again.');
    return 'No web app URL - deploy first.';
  }

  var N = 15;
  var runId = 'HEALTH CHECK LT' + Date.now();
  var requests = [];
  for (var i = 1; i <= N; i++) {
    var payload = {
      studentName: runId + '-' + i, day: i, week: 1, theme: 'Load test',
      hookResponse: 'lt', distance: 'lt', pin: '*', hasPhoto: false,
      sessionComplete: false, sessionsComplete: 0, sessionsTotal: 30,
      percentComplete: 0, timestamp: Date.now()
    };
    requests.push({ url: url, method: 'post', contentType: 'text/plain',
                    payload: JSON.stringify(payload), muteHttpExceptions: true });
  }

  // fetchAll issues all requests in parallel - a real concurrency test of the lock.
  UrlFetchApp.fetchAll(requests);
  Utilities.sleep(2500); // let every write settle

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RESPONSES_SHEET);
  var v = sh.getDataRange().getValues();
  var counts = {}, rowsToDelete = [];
  for (var r = v.length - 1; r >= 1; r--) {
    var nm = String(v[r][1]);
    if (nm.indexOf(runId) === 0) { counts[nm] = (counts[nm] || 0) + 1; rowsToDelete.push(r + 1); }
  }
  var distinct = Object.keys(counts).length;
  var dupes = 0; for (var k in counts) if (counts[k] > 1) dupes += counts[k] - 1;

  // clean up test rows (delete bottom-up so indexes stay valid)
  rowsToDelete.sort(function (a, b) { return b - a; });
  for (var d = 0; d < rowsToDelete.length; d++) sh.deleteRow(rowsToDelete[d]);

  var pass = (distinct === N && dupes === 0);
  var msg =
    'TOL App load test - ' + (pass ? 'PASSED' : 'FAILED') + '\n\n' +
    'Fired ' + N + ' saves at the same instant at:\n' + url + '\n\n' +
    'Distinct rows that landed: ' + distinct + '  (expected ' + N + ')\n' +
    'Duplicate rows: ' + dupes + '  (expected 0)\n' +
    'Test rows cleaned up afterward: ' + rowsToDelete.length + '\n\n' +
    (pass
      ? 'All saves arrived exactly once. The backend handles your whole class saving together.'
      : 'MISMATCH - some saves were lost or duplicated. Re-check the lock in doPost and that the web app is deployed with access set to Anyone.');
  MailApp.sendEmail(RECIPIENT, 'TOL App Load Test: ' + (pass ? 'PASSED' : 'FAILED'), msg);
  return msg;
}

/* ---------- helpers ---------- */
function getOrCreateSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  else if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function getMeta(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(META_SHEET); if (!sh) return '';
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === key) return String(v[i][1]);
  return '';
}
function setMeta(key, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = getOrCreateSheet(ss, META_SHEET, ['key','value']);
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value]);
}
function timeLabel(d) { var h = d.getHours(); return h < 12 ? '5 AM' : '5 PM'; }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function str(x)  { return (x === undefined || x === null) ? '' : String(x); }
function num(x)  { var n = Number(x); return isNaN(n) ? '' : n; }
function bool(x) { return x ? 'yes' : 'no'; }
