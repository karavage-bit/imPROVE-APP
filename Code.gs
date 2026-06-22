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
   sheet, find the student's row, and overwrite it in place. */
function updateStatus(ss, data) {
  if (!data.studentName || String(data.studentName).indexOf('HEALTH CHECK') === 0) return;
  var headers = ['studentName','sessionsComplete','sessionsTotal','percentComplete','lastUpdate','lastSession'];
  var sh = getOrCreateSheet(ss, STATUS_SHEET, headers);
  var values = sh.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.studentName)) { rowIdx = i + 1; break; }
  }
  var row = [ str(data.studentName), num(data.sessionsComplete), num(data.sessionsTotal),
              num(data.percentComplete), new Date(), str(data.theme) ];
  if (rowIdx === -1) sh.appendRow(row);
  else sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
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
    'Sheet writable: ' + (writeOk ? 'yes' : 'NO') + '\n\n' +
    (problems.length
        ? 'ISSUES:\n - ' + problems.join('\n - ') + '\n\n'
        : 'No issues detected.\n\n') +
    'Sheet: ' + ss.getUrl() + '\n' +
    'This is an automated message from your Apps Script monitor.';

  MailApp.sendEmail(RECIPIENT, subject, body);
}

/* ---------- set the two daily triggers (run once) ---------- */
function createTriggers() {
  var trigs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trigs.length; i++) {
    if (trigs[i].getHandlerFunction() === 'healthCheck') ScriptApp.deleteTrigger(trigs[i]);
  }
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(5).everyDays(1).create();
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(17).everyDays(1).create();
  MailApp.sendEmail(RECIPIENT, 'TOL App: monitoring is set up',
    'Your 5:00 AM and 5:00 PM health checks are now scheduled.\n' +
    'You will get an email at each check with the status of the app and student submissions.');
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
