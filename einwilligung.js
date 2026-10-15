/*
 * Einwilligungs-Modul (Cookie-Banner) fuer start.kaspareit-trading.com, seit 15.10.2026.
 *
 * Grundsatz: Das Banner erscheint NUR, wenn in WERKZEUGE mindestens ein nicht notwendiges
 * Werkzeug eingetragen ist (z. B. Meta-Pixel). Solange die Liste leer ist, passiert nichts:
 * kein Banner, kein Speichern, keine Anfrage an Dritte. So bleibt die Seite ohne Tracking banner-frei.
 *
 * Abnahme/Test: ?einwilligung=test an die Adresse haengen. Dann erscheint das Banner mit einem
 * Beispiel-Werkzeug, das nichts laedt; gespeichert wird getrennt unter "kt-einwilligung-test".
 *
 * Werkzeug freischalten (spaeter, z. B. Meta-Pixel): Eintrag in WERKZEUGE mit id, Name, Zweck
 * (DE/EN) und laden()-Funktion. laden() laeuft erst nach Zustimmung, bei jedem Seitenaufruf.
 * Vorher die Datenschutzerklaerung um das Werkzeug ergaenzen.
 *
 * Gespeichert wird nur die Entscheidung selbst (localStorage "kt-einwilligung"), das ist fuer
 * den gewuenschten Dienst unbedingt erforderlich (Paragraf 25 Abs. 2 Nr. 2 TDDDG).
 * Eingebunden wird die Datei von scripts\veroeffentlichen.ps1 (Marker EINWILLIGUNG-START/-ENDE).
 */
(function () {
  'use strict';

  var VERSION = 1; // erhoehen, wenn neue Werkzeuge dazukommen: dann wird neu gefragt
  var WERKZEUGE = [
    // Beispiel fuer spaeter (NICHT aktiv). Zweck-Text muss Anbieter und Drittland nennen (Meta, USA):
    // { id: 'meta', name: 'Meta-Pixel', zweck: { de: 'Misst, ob Besucher aus unserer Werbung bei Facebook und Instagram kommen. Anbieter Meta, Datenübermittlung in die USA.', en: 'Measures whether visitors come from our ads on Facebook and Instagram. Provider Meta, data transfer to the USA.' },
    //   laden: function () { /* Pixel-Code */ },
    //   entfernen: function () { ['_fbp', '_fbc'].forEach(function (n) { ['', '; domain=.kaspareit-trading.com'].forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; }); }); } }
  ];

  var test = /[?&]einwilligung=test\b/.test(location.search);
  if (test) {
    WERKZEUGE = [{ id: 'beispiel', name: 'Beispiel-Werkzeug (Test)',
      zweck: { de: 'Nur zur Abnahme. Lädt nichts und sendet nichts.', en: 'For review only. Loads and sends nothing.' },
      laden: function () { if (window.console) console.log('[Einwilligung] Beispiel-Werkzeug geladen (Test)'); } }];
  }
  if (!WERKZEUGE.length) return;

  var SCHLUESSEL = test ? 'kt-einwilligung-test' : 'kt-einwilligung';
  var en = /^en/i.test(document.documentElement.lang || '');
  var T = en ? {
    titel: 'Your privacy',
    text: 'We would like to use the following tools to measure how well our ads work. They only load if you agree. You can change your choice at any time via “Cookie settings” at the bottom of the page.',
    alle: 'Accept all', keine: 'Necessary only', einstellungen: 'Settings', speichern: 'Save selection',
    notwendig: 'Necessary', notwendigText: 'Stores only your choice in this banner. Always active.',
    datenschutz: 'Privacy policy', datenschutzUrl: '/datenschutz/', link: 'Cookie settings'
  } : {
    titel: 'Deine Privatsphäre',
    text: 'Wir möchten die folgenden Werkzeuge nutzen, um zu messen, wie gut unsere Werbung funktioniert. Sie laden nur, wenn du zustimmst. Deine Wahl kannst du jederzeit unten auf der Seite über „Cookie-Einstellungen“ ändern.',
    alle: 'Alle akzeptieren', keine: 'Nur notwendige', einstellungen: 'Einstellungen', speichern: 'Auswahl speichern',
    notwendig: 'Notwendig', notwendigText: 'Speichert nur deine Auswahl in diesem Banner. Immer aktiv.',
    datenschutz: 'Datenschutzerklärung', datenschutzUrl: '/datenschutz/', link: 'Cookie-Einstellungen'
  };

  var MAX_ALTER = 365 * 24 * 3600 * 1000; // nach 12 Monaten neu fragen
  function lesen() {
    try {
      var s = JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null');
      if (!s || s.v !== VERSION || !s.werkzeuge) return null;
      if (!(Date.now() - new Date(s.datum).getTime() < MAX_ALTER)) return null;
      // neues Werkzeug ohne gespeicherte Entscheidung: neu fragen
      for (var i = 0; i < WERKZEUGE.length; i++) if (!(WERKZEUGE[i].id in s.werkzeuge)) return null;
      return s;
    } catch (e) { return null; }
  }
  function weg(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  function jedes(liste, fn) { Array.prototype.forEach.call(liste, fn); }
  function schreiben(auswahl) {
    var s = { v: VERSION, datum: new Date().toISOString(), werkzeuge: auswahl };
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  var geladen = {};
  function anwenden(s) {
    WERKZEUGE.forEach(function (w) {
      if (s.werkzeuge[w.id] && !geladen[w.id]) {
        geladen[w.id] = true;
        try { w.laden(); } catch (e) {}
      }
    });
    try { document.dispatchEvent(new CustomEvent('kt-einwilligung', { detail: s })); } catch (e) {}
    // Widerruf eines bereits geladenen Werkzeugs: dessen Cookies loeschen (entfernen()), dann neu laden.
    var widerrufen = WERKZEUGE.filter(function (w) { return geladen[w.id] && !s.werkzeuge[w.id]; });
    widerrufen.forEach(function (w) { try { if (w.entfernen) w.entfernen(); } catch (e) {} });
    if (widerrufen.length) location.reload();
  }

  var css = '' +
    '#kt-ew{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;' +
    'background:#0f1617;color:#e7eced;border:1px solid rgba(64,198,204,.35);border-radius:14px;' +
    'box-shadow:0 18px 50px rgba(0,0,0,.55);padding:20px 20px 16px;font:15px/1.55 Manrope,-apple-system,"Helvetica Neue",Arial,sans-serif}' +
    '#kt-ew h2{outline:none;margin:0 0 6px;font-size:17px;font-weight:700;color:#e7eced;letter-spacing:0}' +
    '#kt-ew p{margin:0 0 12px;color:#bac4c6}' +
    '#kt-ew a{color:#40C6CC}' +
    '#kt-ew .kt-ew-knoepfe{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}' +
    '#kt-ew button{flex:1 1 150px;min-height:44px;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;padding:10px 14px}' +
    '#kt-ew .kt-ew-ja,#kt-ew .kt-ew-nein{background:#D8AE5E;color:#0a0f10;border:1px solid #D8AE5E}' +
    '#kt-ew .kt-ew-mehr{background:transparent;color:#e7eced;border:1px solid rgba(231,236,237,.35)}' +
    '#kt-ew button:focus-visible{outline:2px solid #40C6CC;outline-offset:2px}' +
    '#kt-ew .kt-ew-liste{display:none;margin:4px 0 12px;border-top:1px solid rgba(231,236,237,.12)}' +
    '#kt-ew.kt-ew-offen .kt-ew-liste{display:block}' +
    '#kt-ew label{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(231,236,237,.12);cursor:pointer}' +
    '#kt-ew label b{display:block;color:#e7eced}' +
    '#kt-ew label span{color:#8f999b;font-size:14px}' +
    '#kt-ew input{margin-top:4px;width:18px;height:18px;accent-color:#40C6CC;flex:0 0 auto}' +
    '@media (max-width:480px){#kt-ew{left:8px;right:8px;bottom:8px;padding:16px 14px 12px;font-size:14px}}';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var box = null;
  function zeigen(offen) {
    weg(box);
    var s = lesen();
    var st = document.getElementById('kt-ew-css');
    if (!st) { st = document.createElement('style'); st.id = 'kt-ew-css'; st.textContent = css; document.head.appendChild(st); }
    box = document.createElement('div');
    box.id = 'kt-ew';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'kt-ew-titel');
    var liste = '<label><input type="checkbox" checked disabled><span><b>' + esc(T.notwendig) + '</b>' + esc(T.notwendigText) + '</span></label>';
    WERKZEUGE.forEach(function (w) {
      var an = s ? !!s.werkzeuge[w.id] : false;
      liste += '<label><input type="checkbox" data-id="' + esc(w.id) + '"' + (an ? ' checked' : '') + '><span><b>' + esc(w.name) + '</b>' + esc(en ? w.zweck.en : w.zweck.de) + '</span></label>';
    });
    box.innerHTML = '<h2 id="kt-ew-titel" tabindex="-1">' + esc(T.titel) + '</h2>' +
      '<p>' + esc(T.text) + ' <a href="' + T.datenschutzUrl + '" target="_top">' + esc(T.datenschutz) + '</a></p>' +
      '<div class="kt-ew-liste">' + liste + '</div>' +
      '<div class="kt-ew-knoepfe">' +
      '<button type="button" class="kt-ew-nein">' + esc(T.keine) + '</button>' +
      '<button type="button" class="kt-ew-ja">' + esc(T.alle) + '</button>' +
      '<button type="button" class="kt-ew-mehr">' + esc(T.einstellungen) + '</button>' +
      '</div>';
    if (offen) box.className = 'kt-ew-offen';
    // an den Anfang von body, damit Tastatur und Screenreader das Banner zuerst erreichen
    document.body.insertBefore(box, document.body.firstChild);
    try { box.querySelector('#kt-ew-titel').focus({ preventScroll: true }); } catch (e) {}

    function fertig(auswahl) {
      var neu = schreiben(auswahl); weg(box); box = null; anwenden(neu);
      var l = document.getElementById('kt-ew-link');
      if (l && offen) { try { l.focus({ preventScroll: true }); } catch (e) {} }
    }
    function alle(wert) { var a = {}; WERKZEUGE.forEach(function (w) { a[w.id] = wert; }); return a; }
    box.querySelector('.kt-ew-ja').onclick = function () { fertig(alle(true)); };
    box.querySelector('.kt-ew-nein').onclick = function () { fertig(alle(false)); };
    var mehr = box.querySelector('.kt-ew-mehr');
    function mehrAnpassen() {
      var o = box.classList.contains('kt-ew-offen');
      mehr.textContent = o ? T.speichern : T.einstellungen;
    }
    mehr.onclick = function () {
      if (!box.classList.contains('kt-ew-offen')) { box.classList.add('kt-ew-offen'); mehrAnpassen(); return; }
      var a = {};
      jedes(box.querySelectorAll('input[data-id]'), function (i) { a[i.getAttribute('data-id')] = i.checked; });
      fertig(a);
    };
    mehrAnpassen();
  }

  function fusszeilenLink() {
    var ziel = document.querySelector('p.cpy');
    if (!ziel || document.getElementById('kt-ew-link')) return;
    var a = document.createElement('a');
    a.id = 'kt-ew-link'; a.href = '#'; a.textContent = T.link;
    a.onclick = function (e) { e.preventDefault(); zeigen(true); };
    ziel.appendChild(document.createTextNode(' ·  '));
    ziel.appendChild(a);
  }

  window.ktEinwilligung = { oeffnen: function () { zeigen(true); }, stand: lesen };

  function start() {
    fusszeilenLink();
    var s = lesen();
    if (s) anwenden(s); else zeigen(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
