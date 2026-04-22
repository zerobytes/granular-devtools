// Service worker. We mainly act as a relay between content scripts and
// the devtools panel. Connections from the panel arrive on the
// "granular-devtools-panel" port; content scripts post messages via
// runtime.sendMessage with { source: "granular-content", ... }.

const panelPorts = new Map(); // tabId -> Port

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'granular-devtools-panel') return;
  let tabId = null;
  port.onMessage.addListener((msg) => {
    if (msg && msg.kind === 'init') {
      tabId = msg.tabId;
      panelPorts.set(tabId, port);
    } else if (msg && msg.kind === 'forward-to-page') {
      if (tabId == null) return;
      chrome.tabs.sendMessage(tabId, { source: 'granular-panel', payload: msg.payload }).catch(() => {});
    }
  });
  port.onDisconnect.addListener(() => {
    if (tabId != null && panelPorts.get(tabId) === port) panelPorts.delete(tabId);
  });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.source !== 'granular-content') return;
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;
  const port = panelPorts.get(tabId);
  if (!port) return;
  try { port.postMessage(msg.payload); } catch {}
});
