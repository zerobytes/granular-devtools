# Granular DevTools

Browser extension (Chrome / Firefox, Manifest V3) that surfaces live
information from `@granularjs/core`'s runtime profiler in a dedicated
**Granular** panel inside DevTools.

## Features

- Live counters: total schedules, flushes, hosts flushed, accumulated flush time.
- Top hosts (over the last ~2s window) sorted by total flush cost.
- Streaming list of recent flush/schedule events with timestamps and elapsed time.
- Attach / detach / reset / snapshot controls.

## How it talks to your app

The extension listens for the global hook `window.__GRANULAR_DEVTOOLS_HOOK__`.
Granular **does not install the hook automatically** — the app must opt in
explicitly, ideally only in development:

```js
// src/main.js (or main.jsx, entry-client.js, …)
import { installDevtoolsHook } from '@granularjs/core';

if (import.meta.env.DEV) installDevtoolsHook();          // Vite
// or:  if (process.env.NODE_ENV !== 'production') installDevtoolsHook();
```

`installDevtoolsHook()` registers a `postMessage` bridge and exposes a
`snapshot()` / `attach()` / `detach()` / `reset()` API the extension uses.
The runtime profiler itself only turns on when the extension calls `attach()`,
so the hook is essentially free at runtime when no DevTools panel is open.

Templates from `@granularjs/create-app` (1.x+) wire the opt-in for you. If
your app pre-dates that, add the snippet above to your entry file.

## Install (developer mode)

### Chrome / Edge / Brave
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**, choose this directory (`granular-devtools/`).
4. Open DevTools on a page that calls `installDevtoolsHook()` and switch to the **Granular** tab.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and choose `manifest.json` inside this directory.
3. Open DevTools and switch to the **Granular** tab.

## Architecture

```
┌─────────────┐      window.postMessage      ┌─────────────┐
│  inject.js  │ ◀───────────────────────────▶│ page (hook) │
└──────┬──────┘                              └─────────────┘
       │ window.postMessage
       ▼
┌─────────────┐       chrome.runtime         ┌──────────────┐
│  content.js │ ───────────────────────────▶ │ background.js │
└─────────────┘                              └──────┬────────┘
                                                    │ Port
                                                    ▼
                                            ┌────────────────┐
                                            │ devtools panel │
                                            └────────────────┘
```

- `inject.js` is loaded into the page context so it can read
  `window.__GRANULAR_DEVTOOLS_HOOK__`. It mirrors profiler events out via
  `window.postMessage` and forwards commands from the panel back to the hook.
- `content.js` relays messages between the page and the extension's runtime.
- `background.js` (service worker) routes panel commands and forwards page
  events to the right tab's panel.
- `panel.html / panel.js / panel.css` is the UI.

## Building / packaging

The extension is plain HTML/JS/CSS — no build step. To package:

```bash
cd granular-devtools
zip -r granular-devtools.zip . -x '*.DS_Store'
```

Submit the zip to the Chrome Web Store or to AMO (Firefox).
