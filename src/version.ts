/**
 * Application Version
 * Short version of the git commit being deployed.
 * 
 * Note: Not rendered anywhere in the UI.
 * Can be inspected in source code, in HTML source (<meta name="app-version">),
 * or via browser DevTools `window.__APP_VERSION__`.
 */

declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'git-dev';

if (typeof window !== 'undefined') {
  (window as unknown as { __APP_VERSION__: string }).__APP_VERSION__ = APP_VERSION;
}
