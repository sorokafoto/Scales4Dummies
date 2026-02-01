/**
 * Scales4Dummies — интерактивный гриф гитары
 * Ноты, строй, тональности, подсветка.
 */

(function () {
  'use strict';

  // --- Константы ---
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NUM_FRETS = 25; // лады 0–24

  const TUNING_6 = ['E', 'A', 'D', 'G', 'B', 'E'];
  const TUNING_7 = ['B', 'E', 'A', 'D', 'G', 'B', 'E'];

  // Формулы тональностей: полутоновые интервалы от тоники (0–11)
  const SCALES = {
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Major Pentatonic': [0, 2, 4, 7, 9],
    'Minor Pentatonic': [0, 3, 5, 7, 10],
    'Dorian': [0, 2, 3, 5, 7, 9, 10],
    'Phrygian': [0, 1, 3, 5, 7, 8, 10],
    'Lydian': [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian': [0, 1, 3, 5, 6, 8, 10]
  };

  // --- Модель: нота на позиции ---
  function noteIndexFromName(name) {
    const i = NOTES.indexOf(name);
    return i >= 0 ? i : 0;
  }

  function getNoteAt(tuning, stringIndex, fret) {
    const openNote = tuning[stringIndex];
    const openIndex = noteIndexFromName(openNote);
    const noteIndex = (openIndex + fret) % 12;
    return { name: NOTES[noteIndex], index: noteIndex };
  }

  // --- DOM ---
  const rootSelect = document.getElementById('root');
  const scaleTypeSelect = document.getElementById('scale-type');
  const tuningContainer = document.getElementById('tuning-controls');
  const fretboardEl = document.getElementById('fretboard');
  const scaleLegendEl = document.getElementById('scale-legend');
  const stringsRadios = document.querySelectorAll('input[name="strings"]');

  let numStrings = 6;
  let tuning = TUNING_6.slice();

  // Заполнение select тоники и типа тональности
  NOTES.forEach(function (n) {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    rootSelect.appendChild(o);
  });

  Object.keys(SCALES).forEach(function (name) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    scaleTypeSelect.appendChild(o);
  });

  // Построение блока строя (6 или 7 select)
  function buildTuningControls() {
    tuningContainer.innerHTML = '';
    for (let i = 0; i < numStrings; i++) {
      const label = document.createElement('label');
      label.className = 'tuning-label';
      const span = document.createElement('span');
      span.className = 'tuning-string-num';
      span.textContent = (i + 1) + '.';
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Струна ' + (i + 1));
      NOTES.forEach(function (n) {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        if (tuning[i] === n) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () {
        tuning[i] = sel.value;
        renderFretboard();
        updateScaleLegend();
        saveState();
      });
      label.appendChild(span);
      label.appendChild(sel);
      tuningContainer.appendChild(label);
    }
  }

  // Множество нот текущей тональности (индексы 0–11)
  function getScaleNoteIndices() {
    const rootName = rootSelect.value;
    const scaleName = scaleTypeSelect.value;
    const rootIdx = noteIndexFromName(rootName);
    const intervals = SCALES[scaleName] || SCALES['Major'];
    const set = new Set();
    intervals.forEach(function (step) {
      set.add((rootIdx + step) % 12);
    });
    return set;
  }

  // Отрисовка грифа: первая строка — номера ладов 0..24, далее по строке на каждую струну
  function renderFretboard() {
    clearHoverMatch();
    const scaleIndices = getScaleNoteIndices();
    fretboardEl.innerHTML = '';
    fretboardEl.style.gridTemplateColumns = 'repeat(' + NUM_FRETS + ', minmax(0, 1fr))';
    fretboardEl.style.gridTemplateRows = 'auto repeat(' + numStrings + ', var(--cell-height))';

    for (let f = 0; f < NUM_FRETS; f++) {
      const cell = document.createElement('div');
      cell.className = 'cell fret-label';
      cell.textContent = f;
      fretboardEl.appendChild(cell);
    }
    for (let s = 0; s < numStrings; s++) {
      for (let f = 0; f < NUM_FRETS; f++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (f === 0) cell.classList.add('fret-0');
        const note = getNoteAt(tuning, s, f);
        cell.textContent = note.name;
        cell.setAttribute('data-note-index', note.index);
        if (scaleIndices.has(note.index)) cell.classList.add('in-scale');
        fretboardEl.appendChild(cell);
      }
    }
  }

  function clearHoverMatch() {
    fretboardEl.querySelectorAll('.hover-match').forEach(function (el) {
      el.classList.remove('hover-match');
    });
  }

  function updateScaleLegend() {
    const rootName = rootSelect.value;
    const scaleName = scaleTypeSelect.value;
    const indices = getScaleNoteIndices();
    const names = Array.from(indices).sort(function (a, b) { return a - b; }).map(function (i) { return NOTES[i]; });
    scaleLegendEl.innerHTML = '<strong>Ноты в тональности ' + rootName + ' ' + scaleName + ':</strong> ' + names.join(', ');
  }

  // Переключение 6/7 струн
  function setNumStrings(n) {
    numStrings = n;
    tuning = (n === 7 ? TUNING_7 : TUNING_6).slice();
    buildTuningControls();
    renderFretboard();
    updateScaleLegend();
    saveState();
  }

  stringsRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      setNumStrings(parseInt(radio.value, 10));
    });
  });

  rootSelect.addEventListener('change', function () {
    renderFretboard();
    updateScaleLegend();
    saveState();
  });
  scaleTypeSelect.addEventListener('change', function () {
    renderFretboard();
    updateScaleLegend();
    saveState();
  });

  // --- localStorage ---
  const STORAGE_KEY = 'scales4dummies';
  const THEME_KEY = 'scales4dummies_theme';

  function isDarkTheme() {
    return document.body.classList.contains('theme-dark');
  }

  function setTheme(dark) {
    if (dark) {
      document.body.classList.add('theme-dark');
      if (themeToggleEl) themeToggleEl.textContent = 'Ночь / День';
    } else {
      document.body.classList.remove('theme-dark');
      if (themeToggleEl) themeToggleEl.textContent = 'День / Ночь';
    }
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch (e) { /* ignore */ }
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') setTheme(true);
      else setTheme(false);
    } catch (e) { setTheme(false); }
  }

  const themeToggleEl = document.getElementById('theme-toggle');
  if (themeToggleEl) {
    themeToggleEl.addEventListener('click', function () {
      setTheme(!isDarkTheme());
    });
  }

  function saveState() {
    try {
      const state = {
        numStrings: numStrings,
        tuning: tuning,
        root: rootSelect.value,
        scaleType: scaleTypeSelect.value
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.numStrings === 7) {
        document.querySelector('input[name="strings"][value="7"]').checked = true;
        numStrings = 7;
        tuning = (state.tuning && state.tuning.length === 7) ? state.tuning.slice() : TUNING_7.slice();
      } else {
        numStrings = 6;
        tuning = (state.tuning && state.tuning.length === 6) ? state.tuning.slice() : TUNING_6.slice();
      }
      if (state.root && NOTES.indexOf(state.root) >= 0) rootSelect.value = state.root;
      if (state.scaleType && SCALES[state.scaleType]) scaleTypeSelect.value = state.scaleType;
    } catch (e) { /* ignore */ }
  }

  // Hover: подсветка одинаковых нот в тональности
  fretboardEl.addEventListener('mouseover', function (e) {
    var cell = e.target;
    if (!cell.classList || !cell.classList.contains('cell') || cell.classList.contains('fret-label')) return;
    if (!cell.classList.contains('in-scale')) return;
    var noteIndex = cell.getAttribute('data-note-index');
    if (noteIndex === null) return;
    clearHoverMatch();
    fretboardEl.querySelectorAll('.cell.in-scale[data-note-index="' + noteIndex + '"]').forEach(function (el) {
      el.classList.add('hover-match');
    });
  });
  fretboardEl.addEventListener('mouseout', function (e) {
    if (fretboardEl.contains(e.relatedTarget)) return;
    clearHoverMatch();
  });

  // --- Инициализация ---
  loadTheme();
  loadState();
  buildTuningControls();
  renderFretboard();
  updateScaleLegend();
})();
