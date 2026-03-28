import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// === TEMP DEBUG: Catch ALL errors and show on screen ===
window.__errors = [];
const showError = (msg) => {
  window.__errors.push(msg);
  const root = document.getElementById('root');
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff0000;color:#fff;padding:12px;font-size:13px;z-index:99999;word-break:break-all;white-space:pre-wrap;max-height:60vh;overflow-y:auto;';
  div.textContent = '🚨 ERROR:\n' + msg;
  document.body.appendChild(div);
};
window.addEventListener('error', (e) => {
  showError((e.message || '') + '\n' + (e.filename || '') + ':' + (e.lineno || ''));
});
window.addEventListener('unhandledrejection', (e) => {
  showError('Promise rejection: ' + (e.reason?.message || e.reason || String(e.reason)));
});
// ======================================================

try {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
} catch(e) {
  showError('ReactDOM.render crash: ' + e.message + '\n' + e.stack);
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
