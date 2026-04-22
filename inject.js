(function granularDevtoolsBridge() {
  const HOOK_KEY = '__GRANULAR_DEVTOOLS_HOOK__';

  function send(kind, payload) {
    try {
      window.postMessage({ source: 'granular-devtools', kind, ...(payload || {}) }, '*');
    } catch {}
  }

  function attach(hook) {
    hook.attach();
    send('attached', { snapshot: hook.snapshot() });

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== 'granular-panel') return;
      const cmd = data.payload && data.payload.command;
      if (cmd === 'snapshot') {
        send('snapshot', { snapshot: hook.snapshot() });
      } else if (cmd === 'reset') {
        hook.reset();
        send('snapshot', { snapshot: hook.snapshot() });
      } else if (cmd === 'detach') {
        hook.detach();
        send('detached');
      } else if (cmd === 'attach') {
        hook.attach();
        send('attached', { snapshot: hook.snapshot() });
      }
    });
  }

  function tryAttach() {
    const hook = window[HOOK_KEY];
    if (hook) {
      attach(hook);
      return true;
    }
    return false;
  }

  if (tryAttach()) return;

  // Poll for the hook for up to 10s after page load.
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 250;
    if (tryAttach() || elapsed > 10_000) clearInterval(interval);
  }, 250);

  send('waiting');
})();
