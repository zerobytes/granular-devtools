// Inject the page-context bridge. The injected script reaches into the page's
// __GRANULAR_DEVTOOLS_HOOK__ and forwards events back to the content script.
(function injectBridge() {
  try {
    const url = chrome.runtime.getURL('inject.js');
    const s = document.createElement('script');
    s.src = url;
    s.async = false;
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (err) {
    console.warn('[granular-devtools] inject failed', err);
  }
})();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'granular-devtools') return;
  try {
    chrome.runtime.sendMessage({ source: 'granular-content', payload: data });
  } catch {}
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.source !== 'granular-panel') return;
  window.postMessage({ source: 'granular-panel', payload: msg.payload }, '*');
});
