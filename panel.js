const tabId = chrome.devtools.inspectedWindow.tabId;
const port = chrome.runtime.connect({ name: 'granular-devtools-panel' });
port.postMessage({ kind: 'init', tabId });

const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const topHostsEl = document.getElementById('top-hosts');
const eventsEl = document.getElementById('events');

const recentEvents = [];
const RECENT_LIMIT = 100;

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = 'status ' + cls;
}

function fmtNum(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '-';
  return n < 1 ? n.toFixed(2) : n.toFixed(2);
}

function renderStats(stats) {
  if (!stats) { statsEl.textContent = 'No data yet.'; return; }
  statsEl.innerHTML = '';
  const fields = [
    ['Schedules', stats.schedules],
    ['Flushes', stats.flushes],
    ['Hosts flushed', stats.hostsFlushed],
    ['Total ms', fmtNum(stats.flushTime)],
  ];
  for (const [k, v] of fields) {
    const a = document.createElement('span'); a.className = 'k'; a.textContent = k;
    const b = document.createElement('span'); b.className = 'v'; b.textContent = String(v);
    statsEl.appendChild(a); statsEl.appendChild(b);
  }
}

function renderTopHosts(rows) {
  topHostsEl.innerHTML = '';
  for (const r of rows || []) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escape(r.host)}</td><td class="right">${r.count}</td><td class="right">${fmtNum(r.totalTime)}</td><td class="right">${fmtNum(r.avgTime)}</td>`;
    topHostsEl.appendChild(tr);
  }
}

function renderEvents() {
  eventsEl.innerHTML = '';
  const slice = recentEvents.slice(-RECENT_LIMIT).reverse();
  for (const ev of slice) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtTime(ev.time)}</td><td>${escape(ev.type)}</td><td>${escape(ev.host || '')}</td><td>${ev.priority ?? ''}</td><td class="right">${ev.elapsed != null ? fmtNum(ev.elapsed) : ''}</td>`;
    eventsEl.appendChild(tr);
  }
}

function fmtTime(t) {
  if (typeof t !== 'number') return '-';
  const ms = t % 60000;
  return (ms / 1000).toFixed(3) + 's';
}

function escape(s) {
  return String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function applySnapshot(snap) {
  renderStats(snap.stats);
  renderTopHosts(snap.topByHost);
  if (snap.recentEvents) {
    recentEvents.length = 0;
    recentEvents.push(...snap.recentEvents);
    renderEvents();
  }
}

port.onMessage.addListener((msg) => {
  if (!msg || msg.source !== 'granular-devtools') return;
  if (msg.kind === 'attached') {
    setStatus('attached', 'attached');
    if (msg.snapshot) applySnapshot(msg.snapshot);
  } else if (msg.kind === 'detached') {
    setStatus('detached');
  } else if (msg.kind === 'snapshot') {
    setStatus('connected', 'connected');
    if (msg.snapshot) applySnapshot(msg.snapshot);
  } else if (msg.kind === 'event') {
    recentEvents.push(msg.event);
    if (recentEvents.length > 1000) recentEvents.splice(0, recentEvents.length - 1000);
    renderEvents();
  } else if (msg.kind === 'hook-installed') {
    setStatus('hook installed', 'connected');
  } else if (msg.kind === 'waiting') {
    setStatus('waiting for hook');
  }
});

function send(command) {
  port.postMessage({ kind: 'forward-to-page', payload: { command } });
}

document.getElementById('btn-attach').onclick = () => send('attach');
document.getElementById('btn-snapshot').onclick = () => send('snapshot');
document.getElementById('btn-reset').onclick = () => send('reset');
document.getElementById('btn-detach').onclick = () => send('detach');

setStatus('connecting...');
send('snapshot');
