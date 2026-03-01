// slopodar v0.3.0 — iife-for-life
// calibration-informed LLM text pattern detector
// no AI, no server, no model. vanilla JS heuristics.
//
// architecture:
//   phase 1: sentence stream analysis (voice markers, structural rhetoric)
//   phase 2: text-node highlighters (transition, em-dash, abstract noun)
//   phase 3: tabbed badge UI (readings, history, about, debug)
//   phase 4: persist to chrome.storage.local
//
// v0.3.0 additions:
//   - debug log (internal event accumulator)
//   - chrome.storage.local persistence (history + prefs)
//   - tabbed badge with minimize/maximize
//   - 2s delayed hover tooltips on metric rows
//   - about tab with calibration-backed metric explanations
//   - history tab with paginated past analyses
//   - debug tab with log viewer + JSON export

(function slopodar() {
  'use strict';

  var VERSION = '0.3.0';

  // ══════════════════════════════════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════════════════════════════════

  var HISTORY_MAX = 5000;
  var LOG_MAX = 500;
  var TOOLTIP_DELAY = 1000;
  var MIN_WORDS = 50;
  var HISTORY_PAGE_SIZE = 20;

  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1,
    NOSCRIPT: 1, SVG: 1, INPUT: 1, BUTTON: 1, NAV: 1
  };

  var ROOT_SELECTORS = [
    'article', 'main', '[role="main"]',
    '.content', '.post', '.entry',
    '#__next', '#app'
  ];

  // ══════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function per1k(count, total) {
    return total > 0 ? ((count / total) * 1000).toFixed(1) : '0';
  }

  function pctSent(count, total) {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  }

  // ══════════════════════════════════════════════════════════════════
  // DEBUG LOG
  // ══════════════════════════════════════════════════════════════════

  var _log = [];
  var _logEnabled = false;

  function log(event, detail) {
    // always log init and root-probe regardless of toggle
    if (!_logEnabled && event !== 'init' && event !== 'root-probe') return;
    var entry = { ts: Date.now(), url: location.href, event: event };
    if (detail !== undefined) {
      try { entry.detail = JSON.parse(JSON.stringify(detail)); }
      catch (e) { entry.detail = String(detail); }
    }
    _log.push(entry);
    if (_log.length > LOG_MAX) _log.shift();
  }

  log('init', { version: VERSION, url: location.href, title: document.title });

  // ══════════════════════════════════════════════════════════════════
  // STORAGE LAYER
  // ══════════════════════════════════════════════════════════════════

  var hasStorage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

  var store = {
    get: function (key, cb) {
      if (!hasStorage) { cb(null); return; }
      chrome.storage.local.get(key, function (r) {
        cb(chrome.runtime.lastError ? null : (r[key] !== undefined ? r[key] : null));
      });
    },
    set: function (obj, cb) {
      if (!hasStorage) { if (cb) cb(); return; }
      chrome.storage.local.set(obj, function () {
        if (cb) cb(chrome.runtime.lastError ? chrome.runtime.lastError : null);
      });
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // CONTENT ROOT DISCOVERY
  // ══════════════════════════════════════════════════════════════════

  var rootSelector = 'body';
  var root = null;
  var rootProbe = [];
  var bestChars = 0;

  for (var ri = 0; ri < ROOT_SELECTORS.length; ri++) {
    var candidate = document.querySelector(ROOT_SELECTORS[ri]);
    var hit = !!candidate;
    var chars = hit ? (candidate.textContent || '').length : 0;
    rootProbe.push({
      selector: ROOT_SELECTORS[ri],
      hit: hit,
      chars: chars
    });
    // pick the selector with the most text content (not just the first match)
    if (hit && chars > bestChars) {
      root = candidate;
      rootSelector = ROOT_SELECTORS[ri];
      bestChars = chars;
    }
  }
  if (!root) root = document.body;

  log('root-probe', { selected: rootSelector, chain: rootProbe });

  if (!root) return;

  // ══════════════════════════════════════════════════════════════════
  // RESULTS OBJECT
  // ══════════════════════════════════════════════════════════════════

  var results = {
    emdash: 0, absnoun: 0, transition: 0,
    epigram: 0, anadiplosis: 0, isocolon: 0, antithesis: 0,
    totalWords: 0, totalSentences: 0, nomDensity: 0,
    contractions: 0, firstPerson: 0, questions: 0
  };

  // ══════════════════════════════════════════════════════════════════
  // PHASE 1: SENTENCE STREAM ANALYSIS
  // ══════════════════════════════════════════════════════════════════

  var fullText = '';
  var sentences = [];

  (function () {
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var chunks = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) {
        var t = walk.currentNode.textContent.trim();
        if (t) chunks.push(t);
      }
    }
    fullText = chunks.join(' ');
    if (!fullText) return;

    var allWords = fullText.split(/\s+/).filter(function (w) { return w.length > 0; });
    results.totalWords = allWords.length;

    sentences = fullText.split(/(?<=[.!?])\s+/).filter(function (s) {
      return s.trim().length > 0;
    });
    results.totalSentences = sentences.length;

    log('text-walk', {
      chunks: chunks.length,
      words: results.totalWords,
      sentences: results.totalSentences,
      textLen: fullText.length
    });

    if (sentences.length < 2) return;

    // nominalisation density
    var absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
    var absMatches = fullText.match(absRe);
    var absCount = absMatches ? absMatches.length : 0;
    if (results.totalWords > 0) {
      results.nomDensity = ((absCount / results.totalWords) * 100).toFixed(1);
    }

    // contractions
    var contractRe = /\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b/gi;
    var contractMatches = fullText.match(contractRe);
    results.contractions = contractMatches ? contractMatches.length : 0;

    // first-person pronouns
    var fpRe = /\b(I|me|my|mine|myself)\b/g;
    var fpMatches = fullText.match(fpRe);
    results.firstPerson = fpMatches ? fpMatches.length : 0;

    // questions
    var qCount = 0;
    for (var q = 0; q < sentences.length; q++) {
      if (sentences[q].trim().match(/\?$/)) qCount++;
    }
    results.questions = qCount;

    // per-sentence-pair analysis
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var sClean = s.replace(/[.!?]+$/, '').trim();
      var sWords = sClean.split(/\s+/).filter(function (w) { return w.length > 0; });

      // epigrammatic closure
      if (i > 0 && sWords.length > 0 && sWords.length <= 6) {
        var prevClean = sentences[i - 1].replace(/[.!?]+$/, '').trim();
        var prevWords = prevClean.split(/\s+/).filter(function (w) { return w.length > 0; });
        if (prevWords.length > 10) {
          results.epigram++;
        }
      }

      // antithesis
      var antiPatterns = [
        /\bnot\s+\w+[,;]\s*but\b/i,
        /\b\w+[,;]\s*not\s+\w+/i,
        /\brather\s+than\b/i,
        /\binstead\s+of\b/i,
        /\bnothing\s+was\b/i,
        /\bnot\s+through\b.*\bthrough\b/i,
        /\bnot\s+just\b/i
      ];
      for (var ap = 0; ap < antiPatterns.length; ap++) {
        if (antiPatterns[ap].test(s)) { results.antithesis++; break; }
      }

      // pair-based detectors
      if (i < sentences.length - 1) {
        var nextClean = sentences[i + 1].replace(/[.!?]+$/, '').trim();
        var nextWords = nextClean.split(/\s+/).filter(function (w) { return w.length > 0; });

        // isocolon
        if (sWords.length >= 5 && nextWords.length >= 5 && Math.abs(sWords.length - nextWords.length) <= 1) {
          results.isocolon++;
        }

        // anadiplosis
        var tail = sWords.slice(-2).map(function (w) { return w.toLowerCase().replace(/[^a-z]/g, ''); });
        var head = nextWords.slice(0, 3).map(function (w) { return w.toLowerCase().replace(/[^a-z]/g, ''); });
        for (var k = 0; k < tail.length; k++) {
          if (tail[k].length < 4) continue;
          var hFound = false;
          for (var l = 0; l < head.length; l++) {
            if (tail[k] === head[l]) { hFound = true; break; }
          }
          if (hFound) { results.anadiplosis++; break; }
        }
      }
    }

    log('phase1-result', results);
  })();

  // ══════════════════════════════════════════════════════════════════
  // PHASE 2: TEXT-NODE HIGHLIGHTERS
  // ══════════════════════════════════════════════════════════════════

  // 1. transition word highlighter (#1 discriminator, d = -4.36)
  (function () {
    var re = /\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|Notably|Interestingly|Crucially|Essentially|Particularly)\b/g;
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!re.test(node.textContent)) continue;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var text = node.textContent;
      var lastIdx = 0;
      var match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        count++;
        var span = document.createElement('span');
        span.className = 'sloptics-transition';
        span.setAttribute('data-n', count);
        span.textContent = match[0];
        frag.appendChild(span);
        lastIdx = re.lastIndex;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.transition = count;
    log('highlight-transition', { count: count });
  })();

  // 2. em-dash highlighter
  (function () {
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.textContent.indexOf('\u2014') === -1) continue;
      var frag = document.createDocumentFragment();
      var parts = node.textContent.split('\u2014');
      for (var j = 0; j < parts.length; j++) {
        if (j > 0) {
          count++;
          var span = document.createElement('span');
          span.className = 'sloptics-emdash';
          span.setAttribute('data-n', count);
          span.textContent = '\u2014';
          frag.appendChild(span);
        }
        if (parts[j]) frag.appendChild(document.createTextNode(parts[j]));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.emdash = count;
    log('highlight-emdash', { count: count });
  })();

  // 3. abstract noun highlighter
  (function () {
    var re = /\b(\w+(?:tion|ment|ness|ity|ence|ance))\b/gi;
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!re.test(node.textContent)) continue;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var text = node.textContent;
      var lastIdx = 0;
      var match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        count++;
        var span = document.createElement('span');
        span.className = 'sloptics-absnoun';
        span.setAttribute('data-n', count);
        span.textContent = match[0];
        frag.appendChild(span);
        lastIdx = re.lastIndex;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.absnoun = count;
    log('highlight-absnoun', { count: count });
  })();

  // ══════════════════════════════════════════════════════════════════
  // PHASE 3: BADGE UI
  // ══════════════════════════════════════════════════════════════════

  if (results.totalWords < MIN_WORDS) return;

  // ── metric data (tooltips + about tab content) ──

  var VOICE_METRICS = [
    {
      id: 'questions', icon: '\u2049', label: 'questions',
      value: pctSent(results.questions, results.totalSentences) + '%',
      active: results.questions > 0, signal: 'human',
      tip: '% of sentences ending in ?. Human avg: 6.2%. AI avg: 1.0%. Clearest single discriminator (d\u00A0=\u00A01.78).',
      about: [
        'Percentage of sentences that end with a question mark.',
        'In calibration, pre-LLM human writers asked questions in 6.2% of sentences on average.',
        'AI company blogs: 1.0%. Every human writer exceeded every AI blog\'s question rate.',
        'Gwern led at 13.7%. Questions imply a writer thinking with the reader, not presenting to them.',
        'Cohen\'s d = 1.78. Near-perfect separation in the current dataset.'
      ].join(' ')
    },
    {
      id: 'firstPerson', icon: '\u{1D4D8}', label: 'first person',
      value: per1k(results.firstPerson, results.totalWords) + '/k',
      active: results.firstPerson > 0, signal: 'human',
      tip: 'I/me/my per 1k words. Human avg: 14.5. AI avg: 3.6. Someone is in the room, or they aren\'t.',
      about: [
        'Occurrences of I/me/my/mine/myself per 1,000 words.',
        'Human average: 14.5/k. AI company blogs: 3.6/k.',
        'Post-LLM human writers use more first person (19.2/k) than pre-LLM writers \u2014',
        'possibly a conscious humanness signal. Swartz\'s Productivity essay at 42.5/k is the benchmark.',
        'First person means someone is in the room. Its absence means a press release.',
        'Cohen\'s d = 1.28.'
      ].join(' ')
    },
    {
      id: 'contractions', icon: '\u2019', label: 'contractions',
      value: per1k(results.contractions, results.totalWords) + '/k',
      active: results.contractions > 0, signal: 'human',
      tip: 'Don\'t/won\'t/can\'t per 1k. AI blogs: literally zero. Any contractions = probably human.',
      about: [
        'Don\'t, won\'t, can\'t, it\'s \u2014 35 contraction forms tracked, per 1,000 words.',
        'In calibration, AI company blogs produced literally zero contractions across all samples.',
        'Human writers are bimodal: PG contracts heavily (17\u201339/k), Spolsky and Gwern don\'t contract at all.',
        'The signal is asymmetric: any contractions = probably human. Zero contractions = could be either.',
        'Presence is a whitelist signal, not a blacklist. Cohen\'s d = 0.96.'
      ].join(' ')
    },
    {
      id: 'transitions', icon: '\u2234', label: 'transitions',
      value: per1k(results.transition, results.totalWords) + '/k',
      active: results.transition > 0, signal: 'ai',
      tip: 'However/Moreover/Furthermore per 1k. #1 discriminator (d\u00A0=\u00A0\u22124.36). Zero overlap human\u2194AI.',
      about: [
        'However, Moreover, Furthermore, Additionally, Consequently, Nevertheless \u2014',
        '17 formal transition words per 1,000 words.',
        'The #1 discriminator in calibration (Cohen\'s d = \u22124.36). The largest effect size in the entire dataset.',
        'AI company blogs averaged 1.2/k. Pre-LLM humans: 0.17/k.',
        'Zero overlap between the two groups. 13 of 19 human writers had a transition density of exactly 0.0.',
        'When you see these words, an LLM was either writing or editing.'
      ].join(' ')
    },
    {
      id: 'nomDensity', icon: '%', label: 'nom density',
      value: results.nomDensity + '%',
      active: parseFloat(results.nomDensity) > 0, signal: 'ai',
      tip: '-tion/-ment/-ness as % of words. AI: 3.0%. Human: 1.7%. Verbs forced into noun service.',
      about: [
        'Words ending in -tion, -ment, -ness, -ity, -ence, -ance as a percentage of total words.',
        'AI company blogs: 3.0%. Human writers: 1.7%. Cohen\'s d = \u22122.92.',
        'Nominalisations are verbs forced into noun service \u2014',
        '"the implementation of the solution" instead of "we implemented it."',
        'Higher density correlates with the corporate voice register LLMs default to.',
        'It strips agency from sentences. Nobody does anything; things just have implementation and utilisation.'
      ].join(' ')
    }
  ];

  var RHETORIC_METRICS = [
    {
      id: 'emdash', icon: '\u2014', label: 'em-dash',
      value: results.emdash, active: results.emdash > 0,
      tip: 'Raw em-dash count. Style marker, not a discriminator. A writing fingerprint, not a tell.',
      about: [
        'Raw count of em-dash characters (\u2014). Not a clean discriminator \u2014',
        'both humans and AI use em-dashes freely.',
        'Tracked because em-dash density is a style marker: patio11 and Gwern use them heavily,',
        'Spolsky doesn\'t use them at all.',
        'Escalating colour from yellow to red shows accumulation, not judgment.',
        'Em-dashes are a writing fingerprint, not a tell.'
      ].join(' ')
    },
    {
      id: 'absnoun', icon: '\u00b6', label: 'abs noun',
      value: results.absnoun, active: results.absnoun > 0,
      tip: 'Raw nominalisation count. Inline highlights show where agency drains from sentences.',
      about: [
        'Raw count of words matching nominalisation suffixes (-tion, -ment, -ness, -ity, -ence, -ance).',
        'The inline highlighting version of the nominalisation density metric.',
        'Individual occurrences are highlighted in the page text with escalating purple intensity,',
        'so you can see where the nominal clusters are \u2014 the sentences where nobody does anything,',
        'things just have "implementation" and "utilisation."'
      ].join(' ')
    },
    {
      id: 'epigram', icon: '\u23ce', label: 'epigram',
      value: results.epigram, active: results.epigram > 0,
      tip: 'Short sentence (\u22646 words) after long (>10). Rhetoric, not a tell. PG scores higher than AI.',
      about: [
        'A short sentence (\u22646 words) following a longer one (>10 words).',
        'The motivational poster closer: "That was the point." "Detection is the intervention."',
        'Calibration showed pre-LLM humans score higher on epigrammatic closure than AI \u2014',
        'PG and Atwood are masters of the short punch.',
        'This does NOT indicate AI. It indicates rhetoric.',
        'At high density (10+ per page), it becomes a texture tell \u2014',
        'human writers vary their closers, LLMs have one lick.'
      ].join(' ')
    },
    {
      id: 'isocolon', icon: '\u2194', label: 'isocolon',
      value: results.isocolon, active: results.isocolon > 0,
      tip: 'Consecutive same-length sentences. Balanced parallel structure. At volume, reveals rhythmic monotony.',
      about: [
        'Consecutive sentences within \u00b11 word of each other\'s length, both \u22655 words.',
        'Balanced parallel structure. Like epigram, this is rhetoric \u2014 good writers use it deliberately.',
        'Measured because at volume it reveals rhythmic monotony:',
        'if every pair of sentences is the same length, something mechanical is generating them.'
      ].join(' ')
    },
    {
      id: 'antithesis', icon: '\u00ac', label: 'antithesis',
      value: results.antithesis, active: results.antithesis > 0,
      tip: '"Not X, but Y" patterns. Classical rhetoric at low density; Redundant Antithesis at high.',
      about: [
        '"Not X, but Y" / "rather than" / "instead of" \u2014 seven patterns of negation contrast.',
        'Classical rhetoric when used deliberately.',
        'Becomes Redundant Antithesis (slopodar #2) when the negation adds no information.',
        'One or two per piece is style. Seven or eight is reflex.'
      ].join(' ')
    },
    {
      id: 'anadiplosis', icon: '\u2248', label: 'anadiplosis',
      value: results.anadiplosis, active: results.anadiplosis > 0,
      tip: 'Last word repeated at start of next sentence. Chain rhetoric. Mechanical at density.',
      about: [
        'The last content word of one sentence appearing in the first three words of the next.',
        '"The name creates distance. The distance creates choice." Classical chain rhetoric.',
        'At natural frequency (1\u20132 per piece), it\'s a deliberate device.',
        'At high density, it\'s the LLM playing its one closing lick repeatedly \u2014 slopodar #12.'
      ].join(' ')
    }
  ];

  // ── badge DOM construction ──

  var badge = el('div', 'slopodar-badge');
  badge.id = 'slopodar-badge';

  // header (drag handle)
  var header = el('div', 'slopodar-header');
  var titleSpan = el('span', 'slopodar-title', 'slopodar');
  var versionSpan = el('span', 'slopodar-version', 'v' + VERSION);
  titleSpan.appendChild(document.createTextNode(' '));
  titleSpan.appendChild(versionSpan);
  var minBtn = el('button', 'slopodar-minimize', '\u2013');
  minBtn.setAttribute('title', 'minimize');
  header.appendChild(titleSpan);
  header.appendChild(minBtn);
  badge.appendChild(header);

  // body (hidden when minimized)
  var body = el('div', 'slopodar-body');

  // tabs
  var tabBar = el('div', 'slopodar-tabs');
  var tabDefs = [
    { id: 'readings', label: 'Readings' },
    { id: 'history', label: 'History' },
    { id: 'about', label: 'About' },
    { id: 'debug', label: 'Debug' }
  ];
  for (var ti = 0; ti < tabDefs.length; ti++) {
    var tab = el('button', 'slopodar-tab', tabDefs[ti].label);
    tab.setAttribute('data-tab', tabDefs[ti].id);
    if (ti === 0) tab.classList.add('slopodar-tab-active');
    tabBar.appendChild(tab);
  }
  body.appendChild(tabBar);

  // ── readings panel ──
  var readingsPanel = el('div', 'slopodar-panel');
  readingsPanel.setAttribute('data-panel', 'readings');

  function buildMetricRow(m) {
    var row = el('div', 'slopodar-row');
    row.setAttribute('data-tip', m.tip);
    row.setAttribute('data-metric', m.id);

    var icon = el('span', 'slopodar-icon', m.icon);
    var label = el('span', 'slopodar-label', m.label);
    var val = el('span', 'slopodar-val', String(m.value));

    if (m.active) {
      if (m.signal === 'human') {
        val.classList.add('slopodar-human');
        icon.classList.add('slopodar-human');
        label.classList.add('slopodar-human');
      } else if (m.signal === 'ai') {
        val.classList.add('slopodar-ai');
        icon.classList.add('slopodar-ai');
        label.classList.add('slopodar-ai');
      } else {
        val.classList.add('slopodar-hit');
        icon.classList.add('slopodar-hit');
        label.classList.add('slopodar-hit');
      }
    }

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(val);
    return row;
  }

  // voice section
  readingsPanel.appendChild(el('div', 'slopodar-section-label', 'voice'));
  for (var vi = 0; vi < VOICE_METRICS.length; vi++) {
    readingsPanel.appendChild(buildMetricRow(VOICE_METRICS[vi]));
  }

  // rhetoric section
  readingsPanel.appendChild(el('div', 'slopodar-section-label', 'rhetoric'));
  for (var rhi = 0; rhi < RHETORIC_METRICS.length; rhi++) {
    readingsPanel.appendChild(buildMetricRow(RHETORIC_METRICS[rhi]));
  }

  body.appendChild(readingsPanel);

  // ── history panel ──
  var historyPanel = el('div', 'slopodar-panel');
  historyPanel.setAttribute('data-panel', 'history');
  historyPanel.style.display = 'none';

  var historyList = el('div', 'slopodar-history-list');
  var historyStatus = el('div', 'slopodar-history-status', 'Loading history\u2026');
  historyPanel.appendChild(historyStatus);
  historyPanel.appendChild(historyList);

  var historyMoreBtn = el('button', 'slopodar-history-more', 'Show more');
  historyMoreBtn.style.display = 'none';
  historyPanel.appendChild(historyMoreBtn);

  var historyClearBtn = el('button', 'slopodar-history-clear', 'Clear history');
  historyClearBtn.style.display = 'none';
  historyPanel.appendChild(historyClearBtn);

  var _historyData = [];
  var _historyShown = 0;
  var _historyLoaded = false;

  function formatDate(ts) {
    var d = new Date(ts);
    var mon = d.getMonth() + 1;
    var day = d.getDate();
    var hr = d.getHours();
    var min = d.getMinutes();
    return d.getFullYear() + '-' +
      (mon < 10 ? '0' : '') + mon + '-' +
      (day < 10 ? '0' : '') + day + ' ' +
      (hr < 10 ? '0' : '') + hr + ':' +
      (min < 10 ? '0' : '') + min;
  }

  function truncUrl(url, max) {
    if (url.length <= max) return url;
    return url.substring(0, max - 1) + '\u2026';
  }

  function renderHistoryPage() {
    var end = Math.min(_historyShown + HISTORY_PAGE_SIZE, _historyData.length);
    for (var hi = _historyShown; hi < end; hi++) {
      var rec = _historyData[_historyData.length - 1 - hi]; // reverse chronological
      if (!rec) continue;
      var row = el('div', 'slopodar-history-row');

      var datePart = el('span', 'slopodar-history-date', formatDate(rec.ts));
      var urlPart = el('span', 'slopodar-history-url', truncUrl(rec.url || '', 45));
      urlPart.setAttribute('title', rec.url || '');
      var wordsPart = el('span', 'slopodar-history-words',
        (rec.metrics ? rec.metrics.totalWords : '?') + 'w');

      row.appendChild(datePart);
      row.appendChild(urlPart);
      row.appendChild(wordsPart);
      historyList.appendChild(row);
    }
    _historyShown = end;
    historyMoreBtn.style.display = (_historyShown < _historyData.length) ? '' : 'none';
  }

  function loadHistory() {
    if (_historyLoaded) return;
    _historyLoaded = true;
    store.get('slopodar_history', function (history) {
      _historyData = history || [];
      historyStatus.textContent = _historyData.length === 0
        ? 'No history yet. Browse some pages.'
        : _historyData.length + ' page' + (_historyData.length === 1 ? '' : 's') + ' recorded';
      historyClearBtn.style.display = _historyData.length > 0 ? '' : 'none';
      if (_historyData.length > 0) {
        renderHistoryPage();
      }
    });
  }

  historyMoreBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    renderHistoryPage();
  });

  historyClearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    store.set({ slopodar_history: [] }, function () {
      _historyData = [];
      _historyShown = 0;
      historyList.innerHTML = '';
      historyStatus.textContent = 'History cleared.';
      historyClearBtn.style.display = 'none';
      historyMoreBtn.style.display = 'none';
    });
  });

  body.appendChild(historyPanel);

  // ── about panel ──
  var aboutPanel = el('div', 'slopodar-panel slopodar-about');
  aboutPanel.setAttribute('data-panel', 'about');
  aboutPanel.style.display = 'none';

  function buildAboutSection(sectionLabel, metrics) {
    var sec = el('div', 'slopodar-about-section');
    sec.appendChild(el('div', 'slopodar-section-label', sectionLabel));

    for (var ai = 0; ai < metrics.length; ai++) {
      var m = metrics[ai];
      var entry = el('div', 'slopodar-about-entry');
      entry.appendChild(el('div', 'slopodar-about-name', m.icon + ' ' + m.label));
      entry.appendChild(el('div', 'slopodar-about-text', m.about));
      sec.appendChild(entry);
    }
    return sec;
  }

  aboutPanel.appendChild(buildAboutSection('voice', VOICE_METRICS));
  aboutPanel.appendChild(buildAboutSection('rhetoric', RHETORIC_METRICS));

  body.appendChild(aboutPanel);

  // ── debug panel ──
  var debugPanel = el('div', 'slopodar-panel');
  debugPanel.setAttribute('data-panel', 'debug');
  debugPanel.style.display = 'none';

  // log toggle
  var debugToggleRow = el('div', 'slopodar-debug-toggle-row');
  debugToggleRow.appendChild(el('span', 'slopodar-debug-label', 'Verbose logging: '));
  var debugToggleBtn = el('button', 'slopodar-debug-toggle', _logEnabled ? 'ON' : 'OFF');
  debugToggleRow.appendChild(debugToggleBtn);
  debugPanel.appendChild(debugToggleRow);

  debugToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    _logEnabled = !_logEnabled;
    debugToggleBtn.textContent = _logEnabled ? 'ON' : 'OFF';
    debugToggleBtn.classList.toggle('slopodar-debug-on', _logEnabled);
    log('debug-toggle', { enabled: _logEnabled });
    savePrefs();
  });

  // root info
  var rootInfo = el('div', 'slopodar-debug-info');
  rootInfo.textContent = 'Root: ' + rootSelector + ' (' + (root.textContent || '').length + ' chars)';
  debugPanel.appendChild(rootInfo);

  // selector chain detail
  var chainInfo = el('div', 'slopodar-debug-info');
  var chainParts = [];
  for (var ci = 0; ci < rootProbe.length; ci++) {
    var p = rootProbe[ci];
    chainParts.push(p.selector + (p.hit ? ' \u2713 ' + p.chars + 'ch' : ' \u2717'));
  }
  chainInfo.textContent = chainParts.join(' \u2192 ');
  debugPanel.appendChild(chainInfo);

  // log viewer
  var logViewer = el('div', 'slopodar-debug-log');
  debugPanel.appendChild(logViewer);

  function refreshLogViewer() {
    logViewer.innerHTML = '';
    if (_log.length === 0) {
      logViewer.appendChild(el('div', 'slopodar-debug-empty', 'No log entries yet.'));
      return;
    }
    for (var li = _log.length - 1; li >= 0; li--) {
      var entry = _log[li];
      var line = el('div', 'slopodar-debug-line');
      line.appendChild(el('span', 'slopodar-debug-event', entry.event));
      if (entry.detail) {
        var detailStr = typeof entry.detail === 'string'
          ? entry.detail
          : JSON.stringify(entry.detail);
        if (detailStr.length > 120) detailStr = detailStr.substring(0, 117) + '\u2026';
        line.appendChild(el('span', 'slopodar-debug-detail', ' ' + detailStr));
      }
      logViewer.appendChild(line);
    }
  }

  // export button
  var debugExportBtn = el('button', 'slopodar-debug-export', 'Export JSON');
  debugExportBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var payload = JSON.stringify({
      version: VERSION,
      url: location.href,
      title: document.title,
      rootSelector: rootSelector,
      rootProbe: rootProbe,
      results: results,
      log: _log
    }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'slopodar-debug-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    log('debug-export', { entries: _log.length });
  });
  debugPanel.appendChild(debugExportBtn);

  body.appendChild(debugPanel);

  // footer
  var footer = el('div', 'slopodar-footer');
  footer.textContent = results.totalWords + ' words \u00b7 ' + results.totalSentences + ' sentences';

  badge.appendChild(body);
  badge.appendChild(footer);

  // ── tooltip system ──

  var tipTimer = null;
  var tipEl = null;

  function showTooltip(row) {
    hideTooltip();
    var text = row.getAttribute('data-tip');
    if (!text) return;

    tipEl = el('div', 'slopodar-tooltip', text);

    // position relative to badge
    var badgeRect = badge.getBoundingClientRect();
    var rowRect = row.getBoundingClientRect();

    // vertical: align with the row
    tipEl.style.top = (rowRect.top - badgeRect.top) + 'px';

    // horizontal: appear on the side with more room
    if (badgeRect.left > window.innerWidth / 2) {
      tipEl.style.right = '100%';
      tipEl.style.left = 'auto';
      tipEl.style.marginRight = '8px';
      tipEl.style.marginLeft = '0';
    } else {
      tipEl.style.left = '100%';
      tipEl.style.right = 'auto';
      tipEl.style.marginLeft = '8px';
      tipEl.style.marginRight = '0';
    }

    badge.appendChild(tipEl);
  }

  function hideTooltip() {
    clearTimeout(tipTimer);
    if (tipEl && tipEl.parentNode) {
      tipEl.parentNode.removeChild(tipEl);
    }
    tipEl = null;
  }

  readingsPanel.addEventListener('mouseover', function (e) {
    var row = e.target.closest('.slopodar-row[data-tip]');
    if (!row) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      showTooltip(row);
    }, TOOLTIP_DELAY);
  });

  readingsPanel.addEventListener('mouseout', function (e) {
    var row = e.target.closest('.slopodar-row[data-tip]');
    if (!row) return;
    hideTooltip();
  });

  // ── tab switching ──

  var _activeTab = 'readings';

  function switchTab(name) {
    _activeTab = name;
    var tabs = tabBar.querySelectorAll('.slopodar-tab');
    for (var si = 0; si < tabs.length; si++) {
      if (tabs[si].getAttribute('data-tab') === name) {
        tabs[si].classList.add('slopodar-tab-active');
      } else {
        tabs[si].classList.remove('slopodar-tab-active');
      }
    }
    var panels = body.querySelectorAll('.slopodar-panel');
    for (var pi = 0; pi < panels.length; pi++) {
      panels[pi].style.display = (panels[pi].getAttribute('data-panel') === name) ? '' : 'none';
    }
    if (name === 'debug') refreshLogViewer();
    if (name === 'history') loadHistory();
    savePrefs();
  }

  tabBar.addEventListener('click', function (e) {
    var tab = e.target.closest('.slopodar-tab');
    if (!tab) return;
    e.stopPropagation();
    switchTab(tab.getAttribute('data-tab'));
  });

  // ── minimize/maximize ──

  var _minimized = false;

  function setMinimized(min) {
    _minimized = min;
    if (min) {
      badge.classList.add('slopodar-minimized');
      minBtn.textContent = '\u25A1';
      minBtn.setAttribute('title', 'maximize');
    } else {
      badge.classList.remove('slopodar-minimized');
      minBtn.textContent = '\u2013';
      minBtn.setAttribute('title', 'minimize');
    }
  }

  minBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    e.preventDefault();
    setMinimized(!_minimized);
    savePrefs();
  });

  // ── drag handling (header as handle) ──

  var dragging = false;
  var dragDx = 0, dragDy = 0;

  header.addEventListener('mousedown', function (e) {
    if (e.target.closest('.slopodar-minimize')) return;
    dragging = true;
    dragDx = e.clientX - badge.getBoundingClientRect().left;
    dragDy = e.clientY - badge.getBoundingClientRect().top;
    badge.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    badge.style.right = 'auto';
    badge.style.bottom = 'auto';
    badge.style.left = (e.clientX - dragDx) + 'px';
    badge.style.top = (e.clientY - dragDy) + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    badge.style.cursor = '';
  });

  // ── prefs persistence ──

  function savePrefs() {
    store.set({
      slopodar_prefs: {
        minimized: _minimized,
        logEnabled: _logEnabled,
        activeTab: _activeTab
      }
    });
  }

  function applyPrefs(prefs) {
    if (!prefs) return;
    if (prefs.minimized) setMinimized(true);
    if (prefs.logEnabled) {
      _logEnabled = true;
      debugToggleBtn.textContent = 'ON';
      debugToggleBtn.classList.add('slopodar-debug-on');
    }
    if (prefs.activeTab && prefs.activeTab !== 'readings') {
      switchTab(prefs.activeTab);
    }
  }

  // ── render badge ──

  badge.style.display = 'none';
  document.body.appendChild(badge);

  // load prefs with 200ms fallback timeout
  var _prefTimeout = setTimeout(function () {
    badge.style.display = '';
    log('badge-render', { fallback: true });
  }, 200);

  store.get('slopodar_prefs', function (prefs) {
    clearTimeout(_prefTimeout);
    applyPrefs(prefs);
    badge.style.display = '';
    log('badge-render', { prefs: prefs || 'defaults' });
  });

  // ══════════════════════════════════════════════════════════════════
  // PHASE 4: PERSIST (then seed history panel from the written data)
  // ══════════════════════════════════════════════════════════════════

  var record = {
    url: location.href,
    title: document.title,
    ts: Date.now(),
    version: VERSION,
    rootSelector: rootSelector,
    metrics: {
      questions: results.questions,
      questionRate: pctSent(results.questions, results.totalSentences),
      firstPerson: results.firstPerson,
      firstPersonPer1k: per1k(results.firstPerson, results.totalWords),
      contractions: results.contractions,
      contractionsPer1k: per1k(results.contractions, results.totalWords),
      transition: results.transition,
      transitionPer1k: per1k(results.transition, results.totalWords),
      nomDensity: results.nomDensity,
      emdash: results.emdash,
      absnoun: results.absnoun,
      epigram: results.epigram,
      isocolon: results.isocolon,
      antithesis: results.antithesis,
      anadiplosis: results.anadiplosis,
      totalWords: results.totalWords,
      totalSentences: results.totalSentences
    }
  };

  store.get('slopodar_history', function (history) {
    history = history || [];
    history.push(record);
    if (history.length > HISTORY_MAX) {
      history = history.slice(history.length - HISTORY_MAX);
    }
    store.set({ slopodar_history: history }, function (err) {
      log('storage-write', { ok: !err, count: history.length });
      // seed history panel from what we just wrote (avoids a second read)
      if (!_historyLoaded) {
        _historyLoaded = true;
        _historyData = history;
        historyStatus.textContent = history.length + ' page' +
          (history.length === 1 ? '' : 's') + ' recorded';
        historyClearBtn.style.display = history.length > 0 ? '' : 'none';
        if (_activeTab === 'history') renderHistoryPage();
      }
    });
  });

})();
