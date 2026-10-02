/**
 * Prompter Bridge — pushes THIS Google Doc straight into the booth teleprompter.
 *
 * Why: a Google "Publish to web" link only refreshes every ~5 minutes, so edits lag.
 * This runs inside the Doc (server-side), reads the live text, and writes it directly
 * into the prompter's Firebase library — which the Control page shows in real time.
 * No CORS, no proxy, no publish cache.
 *
 * Setup: Extensions ▸ Apps Script, paste this file, Save. Reload the Doc, then use the
 * "📣 Prompter" menu ▸ "Set up…" once. See google-apps-script/README.md for the walk-through.
 */

// Shared Jomboy Firebase (same project the prompter uses). RTDB write rules are open,
// matching the prompter's own unauthenticated client writes — no key needed here.
var FIREBASE_DB = 'https://pinpoint-abf21-default-rtdb.firebaseio.com';

// ---- menu ----------------------------------------------------------------
function onOpen() {
  DocumentApp.getUi().createMenu('📣 Prompter')
    .addItem('Push to prompter now', 'pushNow')
    .addSeparator()
    .addItem('Set up (session + read name)…', 'setup')
    .addItem('Turn ON auto-push (every 1 min)', 'enableAutoPush')
    .addItem('Turn OFF auto-push', 'disableAutoPush')
    .addToUi();
}

function props() { return PropertiesService.getDocumentProperties(); }

function setup() {
  var ui = DocumentApp.getUi();
  var p = props();
  var t = ui.prompt('Prompter setup (1/2)',
    'Prompter session — the value in the Control page\'s "Session" pill (e.g. adread):',
    ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  var topic = t.getResponseText().trim();
  if (!topic) { ui.alert('Need a session value. Run Set up again.'); return; }

  var n = ui.prompt('Prompter setup (2/2)',
    'Name for this read in the library (e.g. T-Mobile read):',
    ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;

  p.setProperty('topic', topic);
  p.setProperty('name', n.getResponseText().trim() || DocumentApp.getActiveDocument().getName());
  if (!p.getProperty('ts')) p.setProperty('ts', String(Date.now())); // stable library order
  ui.alert('Saved ✓  Now click "Push to prompter now" — the read appears in the prompter library.');
}

// ---- push ----------------------------------------------------------------
function ppKey(t) { return String(t).trim().replace(/[.#$\[\]\/\s]+/g, '-'); }
function scriptId() { return 'gdoc_' + DocumentApp.getActiveDocument().getId(); }

function writeToFirebase() {
  var p = props();
  var topic = p.getProperty('topic');
  if (!topic) return { code: 0, body: 'not set up' };
  // PATCH (merge) so trim points the operator set in the prompter survive; ts stays stable.
  var payload = {
    name: p.getProperty('name') || DocumentApp.getActiveDocument().getName(),
    html: docToHtml(),
    ts: Number(p.getProperty('ts') || Date.now())
  };
  var url = FIREBASE_DB + '/prompter/' + ppKey(topic) + '/scripts/' + scriptId() + '.json';
  var res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function pushNow() {
  var p = props();
  if (!p.getProperty('topic')) { setup(); if (!p.getProperty('topic')) return; }
  var r = writeToFirebase();
  var ui = DocumentApp.getUi();
  if (r.code >= 200 && r.code < 300) ui.alert('Pushed to prompter ✓');
  else ui.alert('Push failed (' + r.code + ').\n' + String(r.body).slice(0, 200));
}

function autoPush() { writeToFirebase(); } // time-trigger entry point, no UI

function enableAutoPush() {
  disableAutoPush();
  ScriptApp.newTrigger('autoPush').timeBased().everyMinutes(1).create();
  DocumentApp.getUi().alert('Auto-push ON — this doc pushes to the prompter every minute.\n'
    + 'Use "Push to prompter now" any time you want it instantly.');
}
function disableAutoPush() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'autoPush') ScriptApp.deleteTrigger(tr);
  });
}

// ---- Doc → prompter HTML -------------------------------------------------
// Mirrors what a paste produces: <p> per line, <span> runs carrying color / highlight /
// bold / italic / underline. Near-black text is dropped so it stays visible on the dark
// prompter (the prompter's own paste path does the same).
function docToHtml() {
  var body = DocumentApp.getActiveDocument().getBody();
  var out = [];
  for (var i = 0; i < body.getNumChildren(); i++) {
    var el = body.getChild(i);
    var type = el.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
      var inner = runsToHtml(el.asText());
      out.push(inner.trim() === '' ? '<p><br></p>' : '<p>' + inner + '</p>');
    }
  }
  return out.join('');
}

function runsToHtml(t) {
  var s = t.getText();
  if (s.length === 0) return '';
  var idx = t.getTextAttributeIndices(); // offsets where formatting changes
  var html = '';
  for (var k = 0; k < idx.length; k++) {
    var start = idx[k];
    var end = (k + 1 < idx.length) ? idx[k + 1] : s.length;
    html += spanFor(t, start, s.substring(start, end));
  }
  return html;
}

function spanFor(t, pos, chunk) {
  var esc = escapeHtml(chunk).replace(/[\n\u000b]/g, '<br>'); // soft line breaks
  var st = [];
  var fg = t.getForegroundColor(pos);
  if (fg && !isDark(fg)) st.push('color:' + fg);
  var bg = t.getBackgroundColor(pos);
  if (bg && !isWhiteish(bg)) st.push('background-color:' + bg + ';border-radius:4px');
  if (t.isBold(pos)) st.push('font-weight:800');
  if (t.isItalic(pos)) st.push('font-style:italic');
  var deco = [];
  if (t.isUnderline(pos)) deco.push('underline');
  if (t.isStrikethrough(pos)) deco.push('line-through');
  if (deco.length) st.push('text-decoration:' + deco.join(' '));
  return st.length ? '<span style="' + st.join(';') + '">' + esc + '</span>' : esc;
}

function isDark(c) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  return !!m && parseInt(m[1], 16) < 60 && parseInt(m[2], 16) < 60 && parseInt(m[3], 16) < 60;
}
function isWhiteish(c) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  return !!m && parseInt(m[1], 16) > 230 && parseInt(m[2], 16) > 230 && parseInt(m[3], 16) > 230;
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
