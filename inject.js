(function granularDevtoolsBridge() {
  const HOOK_KEY = '__GRANULAR_DEVTOOLS_HOOK__';
  const LOG = '[granular-devtools/inject]';

  function send(kind, payload) {
    try {
      window.postMessage({ source: 'granular-devtools', kind, ...(payload || {}) }, '*');
    } catch (err) {
      console.warn(LOG, 'postMessage failed', err);
    }
  }

  let attachedHook = null;

  function handlePanelCommand(cmd) {
    if (!attachedHook) {
      console.warn(LOG, 'panel command received but hook not attached yet:', cmd);
      send('waiting');
      return;
    }
    const hook = attachedHook;
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
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'granular-panel') return;
    const cmd = data.payload && data.payload.command;
    handlePanelCommand(cmd);
  });

  function attach(hook) {
    attachedHook = hook;
    try { hook.attach(); } catch (err) { console.warn(LOG, 'hook.attach failed', err); }
    console.log(LOG, 'hook attached');
    send('attached', { snapshot: hook.snapshot() });
    send('hook-installed', { version: hook.version || 1 });
  }

  function tryAttach() {
    const hook = window[HOOK_KEY];
    if (hook && !attachedHook) {
      attach(hook);
      return true;
    }
    return !!attachedHook;
  }

  if (tryAttach()) return;

  send('waiting');
  console.log(LOG, 'waiting for', HOOK_KEY, '— call installDevtoolsHook() in your app');

  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 250;
    if (tryAttach()) { clearInterval(interval); return; }
    if (elapsed >= 30_000) {
      clearInterval(interval);
      console.warn(LOG, 'gave up waiting for hook after 30s');
    }
  }, 250);
})();
