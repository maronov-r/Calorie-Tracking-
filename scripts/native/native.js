// iPhone-app-only tweaks. scripts/build-www.mjs copies this into www/; the website never loads it.
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  document.documentElement.classList.add('native');

  var plugin = function (name) {
    try { return C.registerPlugin ? C.registerPlugin(name) : (C.Plugins || {})[name]; } catch (e) { return null; }
  };
  var StatusBar = plugin('StatusBar');
  var Keyboard = plugin('Keyboard');

  // Status bar: dark text on light themes, light text on dark themes. Follows the theme-color tag the app already updates.
  var isDark = function (hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return false;
    var n = parseInt(m[1], 16);
    var lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.5;
  };
  var meta = document.querySelector('meta[name=theme-color]');
  var syncStatusBar = function () {
    if (!StatusBar) return;
    var color = (meta && meta.getAttribute('content')) || '#F2EEE6';
    StatusBar.setStyle({ style: isDark(color) ? 'DARK' : 'LIGHT' }).catch(function () {});
  };
  syncStatusBar();
  if (meta) new MutationObserver(syncStatusBar).observe(meta, { attributes: true, attributeFilter: ['content'] });

  // Keyboard: keep the field you're typing in visible once the keyboard is up.
  if (Keyboard && Keyboard.addListener) {
    Keyboard.addListener('keyboardDidShow', function () {
      var el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
})();
