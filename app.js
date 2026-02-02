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

  // Ступени тональностей: латинские цифры с бемолями/диезами
  const DEGREE_LABELS = {
    'Major': ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
    'Natural Minor': ['I', 'II', 'bIII', 'IV', 'V', 'bVI', 'bVII'],
    'Harmonic Minor': ['I', 'II', 'bIII', 'IV', 'V', 'bVI', 'VII'],
    'Major Pentatonic': ['I', 'II', 'III', 'V', 'VI'],
    'Minor Pentatonic': ['I', 'bIII', 'IV', 'V', 'bVII'],
    'Dorian': ['I', 'II', 'bIII', 'IV', 'V', 'VI', 'bVII'],
    'Phrygian': ['I', 'bII', 'bIII', 'IV', 'V', 'bVI', 'bVII'],
    'Lydian': ['I', 'II', 'III', '#IV', 'V', 'VI', 'VII'],
    'Mixolydian': ['I', 'II', 'III', 'IV', 'V', 'VI', 'bVII'],
    'Locrian': ['I', 'bII', 'bIII', 'IV', 'bV', 'bVI', 'bVII']
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
  const fretLabelsEl = document.getElementById('fret-labels');
  const fretboardEl = document.getElementById('fretboard');
  const scaleLegendEl = document.getElementById('scale-legend');
  const stringsRadios = document.querySelectorAll('input[name="strings"]');
  const progressionPanelEl = document.getElementById('progression-panel');
  const progressionDegreesEl = document.getElementById('progression-degrees');
  const progressionSequenceEl = document.getElementById('progression-sequence');
  const progressionClearBtn = document.getElementById('progression-clear');

  let numStrings = 6;
  let tuning = TUNING_6.slice();
  let progressionSequence = [];
  let progressionStepIndex = null;

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

  // Сдвиг строя всех струн на полтона вверх или вниз
  function shiftTuningUp() {
    for (let i = 0; i < numStrings; i++) {
      const idx = noteIndexFromName(tuning[i]);
      tuning[i] = NOTES[(idx + 1) % 12];
    }
    buildTuningControls();
    renderFretboard();
    updateScaleLegend();
    saveState();
  }

  function shiftTuningDown() {
    for (let i = 0; i < numStrings; i++) {
      const idx = noteIndexFromName(tuning[i]);
      tuning[i] = NOTES[(idx - 1 + 12) % 12];
    }
    buildTuningControls();
    renderFretboard();
    updateScaleLegend();
    saveState();
  }

  // Построение блока строя (6 или 7 select)
  function buildTuningControls() {
    tuningContainer.innerHTML = '';
    for (let i = 0; i < numStrings; i++) {
      const label = document.createElement('label');
      label.className = 'tuning-label';
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

  // Упорядоченный массив нот тональности (индексы 0–11) по ступеням
  function getScaleOrderedNoteIndices() {
    const rootName = rootSelect.value;
    const scaleName = scaleTypeSelect.value;
    const rootIdx = noteIndexFromName(rootName);
    const intervals = SCALES[scaleName] || SCALES['Major'];
    return intervals.map(function (step) { return (rootIdx + step) % 12; });
  }

  // Индексы нот (0–11) для трезвучия по ступени: degreeIndex 0..scaleLength-1
  function getChordNoteIndices(degreeIndex) {
    const ordered = getScaleOrderedNoteIndices();
    const len = ordered.length;
    if (len === 0) return new Set();
    const set = new Set();
    [0, 2, 4].forEach(function (offset) {
      set.add(ordered[(degreeIndex + offset) % len]);
    });
    return set;
  }

  // Отрисовка грифа: номера ладов — в отдельном ряду сверху, гриф — только ноты по струнам
  function renderFretboard() {
    clearHoverMatch();
    fretboardEl.querySelectorAll('.chord-highlight').forEach(function (el) { el.classList.remove('chord-highlight'); });
    const scaleIndices = getScaleNoteIndices();
    let chordHighlightIndices = null;
    if (progressionStepIndex !== null && progressionSequence[progressionStepIndex] !== undefined) {
      chordHighlightIndices = getChordNoteIndices(progressionSequence[progressionStepIndex]);
    }

    if (fretLabelsEl) {
      fretLabelsEl.innerHTML = '';
      fretLabelsEl.style.gridTemplateColumns = 'repeat(' + NUM_FRETS + ', minmax(0, 1fr))';
      for (let f = 0; f < NUM_FRETS; f++) {
        const cell = document.createElement('div');
        cell.className = 'fret-label-cell';
        cell.textContent = f;
        fretLabelsEl.appendChild(cell);
      }
    }

    fretboardEl.innerHTML = '';
    fretboardEl.style.gridTemplateColumns = 'repeat(' + NUM_FRETS + ', minmax(0, 1fr))';
    fretboardEl.style.gridTemplateRows = 'repeat(' + numStrings + ', var(--cell-height))';
    for (let s = numStrings - 1; s >= 0; s--) {
      for (let f = 0; f < NUM_FRETS; f++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (f === 0) cell.classList.add('fret-0');
        const note = getNoteAt(tuning, s, f);
        cell.textContent = note.name;
        cell.setAttribute('data-note-index', note.index);
        if (scaleIndices.has(note.index)) cell.classList.add('in-scale');
        if (chordHighlightIndices && chordHighlightIndices.has(note.index)) cell.classList.add('chord-highlight');
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
    const rootIdx = noteIndexFromName(rootName);
    const intervals = SCALES[scaleName] || SCALES['Major'];
    const degreeLabels = DEGREE_LABELS[scaleName] || DEGREE_LABELS['Major'];
    scaleLegendEl.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = 'Ноты в тональности ' + rootName + ' ' + scaleName + ':';
    scaleLegendEl.appendChild(title);
    const block = document.createElement('div');
    block.className = 'scale-legend-block';
    for (let i = 0; i < intervals.length; i++) {
      const noteIndex = (rootIdx + intervals[i]) % 12;
      const col = document.createElement('div');
      col.className = 'scale-legend-col';
      const noteSpan = document.createElement('span');
      noteSpan.className = 'scale-legend-note';
      noteSpan.textContent = NOTES[noteIndex];
      const degreeSpan = document.createElement('span');
      degreeSpan.className = 'scale-legend-degree';
      degreeSpan.textContent = degreeLabels[i] || '';
      col.appendChild(noteSpan);
      col.appendChild(degreeSpan);
      block.appendChild(col);
    }
    scaleLegendEl.appendChild(block);
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
    renderProgressionDegrees();
    renderProgressionSequence();
    renderFretboard();
    updateScaleLegend();
    saveState();
  });
  scaleTypeSelect.addEventListener('change', function () {
    renderProgressionDegrees();
    renderProgressionSequence();
    renderFretboard();
    updateScaleLegend();
    saveState();
  });

  // --- Chord Progressions ---
  function renderProgressionDegrees() {
    if (!progressionDegreesEl) return;
    const scaleName = scaleTypeSelect.value;
    const degreeLabels = DEGREE_LABELS[scaleName] || DEGREE_LABELS['Major'];
    progressionDegreesEl.innerHTML = '';
    degreeLabels.forEach(function (label, index) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'progression-degree-btn';
      btn.textContent = label;
      btn.setAttribute('data-degree-index', index);
      btn.setAttribute('aria-label', 'Добавить ступень ' + label);
      btn.addEventListener('click', function () {
        progressionSequence.push(index);
        renderProgressionSequence();
        renderFretboard();
      });
      progressionDegreesEl.appendChild(btn);
    });
  }

  function renderProgressionSequence() {
    if (!progressionSequenceEl) return;
    const scaleName = scaleTypeSelect.value;
    const degreeLabels = DEGREE_LABELS[scaleName] || DEGREE_LABELS['Major'];
    progressionSequenceEl.innerHTML = '';
    progressionSequence.forEach(function (degreeIndex, index) {
      const label = degreeLabels[degreeIndex] != null ? degreeLabels[degreeIndex] : '?';
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'progression-sequence-item' + (progressionStepIndex === index ? ' selected' : '');
      btn.textContent = label;
      btn.setAttribute('aria-label', 'Аккорд ' + label + ', выбрать для подсветки на грифе');
      btn.addEventListener('click', function () {
        progressionStepIndex = index;
        renderProgressionSequence();
        renderFretboard();
      });
      li.appendChild(btn);
      progressionSequenceEl.appendChild(li);
      if (index < progressionSequence.length - 1) {
        const sep = document.createElement('li');
        sep.className = 'progression-sequence-sep';
        sep.textContent = '–';
        sep.setAttribute('aria-hidden', 'true');
        progressionSequenceEl.appendChild(sep);
      }
    });
  }

  function clearProgression() {
    progressionSequence = [];
    progressionStepIndex = null;
    renderProgressionSequence();
    renderFretboard();
  }

  if (progressionClearBtn) progressionClearBtn.addEventListener('click', clearProgression);

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

  const tuningShiftUpEl = document.getElementById('tuning-shift-up');
  const tuningShiftDownEl = document.getElementById('tuning-shift-down');
  if (tuningShiftUpEl) tuningShiftUpEl.addEventListener('click', shiftTuningUp);
  if (tuningShiftDownEl) tuningShiftDownEl.addEventListener('click', shiftTuningDown);

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
  renderProgressionDegrees();
  renderProgressionSequence();
})();
