(function injectBridge() {
  try {
    const url = chrome.runtime.getURL('inject.js');
    const s = document.createElement('script');
    s.src = url;
    s.async = false;
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
    console.log('[granular-devtools/content] inject.js injected');
  } catch (err) {
    console.warn('[granular-devtools/content] inject failed', err);
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
