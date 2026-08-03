// beforeinstallprompt only exists on Chromium (Chrome/Edge/Android WebView)
// AND only after the browser's own engagement heuristics are satisfied --
// it never fires at all on Safari or Firefox, and on Chromium it can take a
// visit or two before it does. Rather than the "Download app" button simply
// not existing until then (which is what it looked like before -- the
// button was invisible with no explanation), this gives every browser/
// platform a concrete manual path so there's always something actionable.
export type InstallPlatform = "ios-safari" | "android-chrome" | "mac-safari" | "firefox" | "other";

export function detectInstallPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (!isIOS && isSafari) return "mac-safari";
  if (/Firefox/.test(ua)) return "firefox";
  if (/Android/.test(ua) && /Chrome/.test(ua)) return "android-chrome";
  return "other";
}

export const INSTALL_INSTRUCTIONS: Record<InstallPlatform, string> = {
  "ios-safari": 'Tap the Share icon in Safari\'s toolbar, then "Add to Home Screen".',
  "android-chrome":
    'Tap the ⋮ menu in Chrome, then "Install app" (or "Add to Home screen"). If you don\'t see it yet, browse around a bit first -- Chrome only offers it after you\'ve used the site briefly.',
  "mac-safari": 'Open the File menu in Safari and choose "Add to Dock".',
  firefox: "Firefox doesn't support installing this as an app, but you can bookmark it (Ctrl/Cmd+D) for quick access.",
  other:
    'Look for an install icon in your browser\'s address bar, or an "Install app" / "Add to Home screen" option in its menu.',
};
