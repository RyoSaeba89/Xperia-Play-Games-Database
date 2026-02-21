/* ============================================================
   XPERIA PLAY — ARCHIVED GAMES RELEASE 10
   Application Logic (app.js)
   ============================================================ */

(function () {
  'use strict';

  // ── State ──
  const state = {
    filteredGames: [...GAMES_DATA],
    currentPage: 1,
    perPage: 50,
    sortCol: 'name',
    sortDir: 'asc',
    search: '',
    filterType: '',
    filterStatus: '',
    filterGenre: '',
    filterStars: '',
  };

  // ── Column definitions ──
  const COLUMNS = [
    { key: 'stars',    label: 'Rating',    width: '80px'  },
    { key: 'type',     label: 'Type',      width: '90px'  },
    { key: 'name',     label: 'Name',      width: 'auto'  },
    { key: 'filename', label: 'Filename',  width: '200px' },
    { key: 'status',   label: 'Status',    width: '140px' },
    { key: 'publisher',label: 'Publisher',  width: '120px' },
    { key: 'genre',    label: 'Genre',     width: '110px' },
    { key: 'version',  label: 'Ver.',      width: '60px'  },
    { key: 'size_kb',  label: 'Size',      width: '70px'  },
    { key: 'apk',      label: 'APK',       width: '50px'  },
    { key: 'data',     label: 'Data',      width: '50px'  },
    { key: 'dpad',     label: 'D-Pad',     width: '55px'  },
    { key: 'touchpad', label: 'Touch',     width: '55px'  },
    { key: 'game_buttons_mapped', label: 'Buttons', width: '60px' },
    { key: 'virus_total', label: 'Virus',  width: '55px'  },
  ];

  // ── DOM refs ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ── Init ──
  function init() {
    buildFilters();
    buildTableHead();
    buildInstructions();
    applyFilters();
    bindEvents();
  }

  // ── Build filter dropdowns ──
  function buildFilters() {
    populateSelect($('#filterType'), FILTER_TYPES);
    populateSelect($('#filterStatus'), FILTER_STATUSES);
    populateSelect($('#filterGenre'), FILTER_GENRES);
    populateSelect($('#filterStars'), FILTER_STARS);
  }

  function populateSelect(el, items) {
    const defaultOpt = el.options[0].textContent;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
  }

  // ── Table head ──
  function buildTableHead() {
    const tr = $('#tableHead');
    tr.innerHTML = '';
    COLUMNS.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.dataset.col = col.key;
      if (col.width !== 'auto') th.style.width = col.width;
      if (col.key === state.sortCol) {
        th.classList.add(state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
      tr.appendChild(th);
    });
  }

  // ── Filtering ──
  function applyFilters() {
    const s = state.search.toLowerCase();
    state.filteredGames = GAMES_DATA.filter(g => {
      if (s && !(
        g.name.toLowerCase().includes(s) ||
        g.publisher.toLowerCase().includes(s) ||
        g.genre.toLowerCase().includes(s) ||
        g.filename.toLowerCase().includes(s) ||
        g.notes.toLowerCase().includes(s)
      )) return false;
      if (state.filterType && g.type !== state.filterType) return false;
      if (state.filterStatus && g.status !== state.filterStatus) return false;
      if (state.filterGenre && g.genre !== state.filterGenre) return false;
      if (state.filterStars && g.stars !== state.filterStars) return false;
      return true;
    });
    sortGames();
    state.currentPage = 1;
    renderTable();
    renderStats();
    renderPagination();
  }

  // ── Sorting ──
  function sortGames() {
    const col = state.sortCol;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    state.filteredGames.sort((a, b) => {
      let va = a[col] || '';
      let vb = b[col] || '';
      // Numeric sort for certain cols
      if (col === 'size_kb' || col === 'game_buttons_mapped' || col === 'virus_total') {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
        return (va - vb) * dir;
      }
      if (col === 'stars') {
        const numA = parseInt(va);
        const numB = parseInt(vb);
        if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * dir;
        if (!isNaN(numA)) return -1 * dir;
        if (!isNaN(numB)) return 1 * dir;
      }
      return va.localeCompare(vb) * dir;
    });
  }

  // ── Render table ──
  function renderTable() {
    const tbody = $('#tableBody');
    const start = (state.currentPage - 1) * state.perPage;
    const page = state.filteredGames.slice(start, start + state.perPage);

    if (page.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${COLUMNS.length}" style="text-align:center;padding:40px;color:var(--text-dim);">No games found matching your criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = page.map(g => `
      <tr data-id="${g.id}">
        <td class="stars-cell">${renderStars(g.stars)}</td>
        <td>${renderType(g.type)}</td>
        <td class="game-name">${esc(g.name)}</td>
        <td style="color:var(--text-dim);font-family:'Share Tech Mono',monospace;font-size:0.75rem;">${esc(g.filename)}</td>
        <td>${renderStatus(g.status)}</td>
        <td style="color:var(--text-secondary);">${esc(g.publisher)}</td>
        <td style="color:var(--text-secondary);">${esc(g.genre)}</td>
        <td style="font-family:'Share Tech Mono',monospace;color:var(--text-dim);">${esc(g.version)}</td>
        <td style="font-family:'Share Tech Mono',monospace;color:var(--text-dim);">${formatSize(g.size_kb)}</td>
        <td>${renderYesNo(g.apk)}</td>
        <td>${renderYesNo(g.data)}</td>
        <td>${renderYesNo(g.dpad)}</td>
        <td>${renderYesNo(g.touchpad)}</td>
        <td style="text-align:center;font-family:'Share Tech Mono',monospace;">${esc(g.game_buttons_mapped)}</td>
        <td>${renderVirus(g.virus_total)}</td>
      </tr>
    `).join('');
  }

  // ── Render helpers ──
  function renderStars(val) {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      let html = '';
      for (let i = 1; i <= 5; i++) {
        html += i <= num ? '<span class="star-filled">★</span>' : '<span class="star-empty">★</span>';
      }
      return html;
    }
    if (!val) return '<span class="ctrl-na">—</span>';
    const cls = val.toLowerCase().replace(/[^a-z]/g, '');
    const classMap = { wifi:'wifi', fix:'fix', findfx:'fix', malware:'malware', remap:'remap', app:'app', emu:'emu', chinese:'chinese', visualnovel:'novel' };
    return `<span class="star-badge ${classMap[cls] || 'app'}">${esc(val)}</span>`;
  }

  function renderType(val) {
    if (!val) return '';
    const cls = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    const classMap = { psm:'psm', psmps1:'psm-ps1', psmpsp:'psm-psp', apk:'apk', set:'set', ouya:'ouya', gamestick:'gamestick', ots:'ots', novel:'novel' };
    return `<span class="type-badge type-${classMap[cls] || 'apk'}">${esc(val)}</span>`;
  }

  function renderStatus(val) {
    if (!val) return '';
    let cls = 'status-working';
    if (val.includes('FINAL')) cls = 'status-final';
    else if (val.includes('WIP') || val.includes('WIFI') || val.includes('REMAP')) cls = 'status-wip';
    else if (val.includes('MALWARE')) cls = 'status-malware';
    // Shorten for display
    const short = val.replace(/^\d+\s*-\s*/, '');
    return `<span class="status-badge ${cls}">${esc(short)}</span>`;
  }

  function renderYesNo(val) {
    if (!val) return '<span class="ctrl-na">—</span>';
    const v = val.toUpperCase();
    if (v === 'YES') return '<span class="ctrl-yes">✓</span>';
    if (v === 'NO') return '<span class="ctrl-no">✗</span>';
    if (v === 'N/A') return '<span class="ctrl-na">n/a</span>';
    return `<span style="color:var(--text-dim);">${esc(val)}</span>`;
  }

  function renderVirus(val) {
    if (!val && val !== '0') return '<span class="virus-na">—</span>';
    const num = parseInt(val);
    if (num === 0) return '<span class="virus-ok">Clean</span>';
    if (!isNaN(num) && num > 0) return `<span class="virus-warn">⚠ ${num}</span>`;
    return '<span class="virus-na">—</span>';
  }

  function formatSize(val) {
    if (!val || val === '#N/A') return '—';
    const num = parseInt(val);
    if (isNaN(num)) return esc(val);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + ' GB';
    if (num >= 1000) return (num / 1000).toFixed(1) + ' MB';
    return num + ' KB';
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Stats bar ──
  function renderStats() {
    const total = GAMES_DATA.length;
    const filtered = state.filteredGames.length;
    const finals = state.filteredGames.filter(g => g.status.includes('FINAL')).length;
    const wip = state.filteredGames.filter(g => g.status.includes('WIP') || g.status.includes('WIFI') || g.status.includes('REMAP')).length;
    const malware = state.filteredGames.filter(g => g.status.includes('MALWARE')).length;

    $('#statsBar').innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Showing</span>
        <span class="stat-value">${filtered}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Final</span>
        <span class="stat-value green">${finals}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">WIP</span>
        <span class="stat-value orange">${wip}</span>
      </div>
      ${malware > 0 ? `<div class="stat-item">
        <span class="stat-label">Malware</span>
        <span class="stat-value red">${malware}</span>
      </div>` : ''}
    `;
  }

  // ── Pagination ──
  function renderPagination() {
    const totalPages = Math.ceil(state.filteredGames.length / state.perPage) || 1;
    const pg = $('#pagination');
    let html = '';
    html += `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="prev">◀ Prev</button>`;

    const range = getPageRange(state.currentPage, totalPages, 5);
    if (range[0] > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (range[0] > 2) html += `<span class="page-info">…</span>`;
    }
    range.forEach(p => {
      html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) html += `<span class="page-info">…</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="next">Next ▶</button>`;
    html += `<span class="page-info">Page ${state.currentPage} of ${totalPages}</span>`;

    pg.innerHTML = html;
  }

  function getPageRange(current, total, windowSize) {
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // ── Detail modal ──
  function showDetail(id) {
    const game = GAMES_DATA.find(g => g.id === id);
    if (!game) return;

    $('#modalTitle').textContent = game.name;
    const body = $('#modalBody');

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-field">
          <span class="detail-label">Rating</span>
          <span class="detail-value">${renderStars(game.stars)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Type</span>
          <span class="detail-value">${renderType(game.type)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Status</span>
          <span class="detail-value">${renderStatus(game.status)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Genre</span>
          <span class="detail-value">${esc(game.genre) || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Publisher</span>
          <span class="detail-value">${esc(game.publisher) || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Version</span>
          <span class="detail-value" style="font-family:'Share Tech Mono',monospace;">${esc(game.version) || '—'}</span>
        </div>
        <div class="detail-field full">
          <span class="detail-label">Filename</span>
          <span class="detail-value" style="font-family:'Share Tech Mono',monospace;font-size:0.85rem;color:var(--text-secondary);">${esc(game.filename)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Size</span>
          <span class="detail-value" style="font-family:'Share Tech Mono',monospace;">${formatSize(game.size_kb)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">VirusTotal</span>
          <span class="detail-value">${renderVirus(game.virus_total)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">APK</span>
          <span class="detail-value">${renderYesNo(game.apk)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Data</span>
          <span class="detail-value">${renderYesNo(game.data)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">D-Pad</span>
          <span class="detail-value">${renderYesNo(game.dpad)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Touchpad</span>
          <span class="detail-value">${renderYesNo(game.touchpad)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Game Buttons Mapped</span>
          <span class="detail-value" style="font-family:'Share Tech Mono',monospace;">${esc(game.game_buttons_mapped) || '—'}</span>
        </div>
      </div>
      ${game.notes ? `<div class="detail-notes">
        <span class="detail-label">Notes</span>
        <div class="detail-value" style="margin-top:4px;color:var(--text-secondary);line-height:1.6;">${esc(game.notes)}</div>
      </div>` : ''}
    `;

    $('#modal').classList.add('visible');
  }

  function hideModal() {
    $('#modal').classList.remove('visible');
  }

  // ── Bind events ──
  function bindEvents() {
    // Tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        $(`#panel-${btn.dataset.tab}`).classList.add('active');
      });
    });

    // Search
    let searchTimer;
    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value;
        applyFilters();
      }, 200);
    });

    // Filters
    $('#filterType').addEventListener('change', (e) => { state.filterType = e.target.value; applyFilters(); });
    $('#filterStatus').addEventListener('change', (e) => { state.filterStatus = e.target.value; applyFilters(); });
    $('#filterGenre').addEventListener('change', (e) => { state.filterGenre = e.target.value; applyFilters(); });
    $('#filterStars').addEventListener('change', (e) => { state.filterStars = e.target.value; applyFilters(); });

    // Reset
    $('#btnReset').addEventListener('click', () => {
      state.search = '';
      state.filterType = '';
      state.filterStatus = '';
      state.filterGenre = '';
      state.filterStars = '';
      $('#searchInput').value = '';
      $('#filterType').value = '';
      $('#filterStatus').value = '';
      $('#filterGenre').value = '';
      $('#filterStars').value = '';
      applyFilters();
    });

    // Column sort
    $('#tableHead').addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      const col = th.dataset.col;
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        state.sortDir = 'asc';
      }
      buildTableHead();
      sortGames();
      renderTable();
    });

    // Table row click -> detail
    $('#tableBody').addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;
      const id = parseInt(row.dataset.id);
      if (!isNaN(id)) showDetail(id);
    });

    // Modal close
    $('#modalClose').addEventListener('click', hideModal);
    $('#modal').addEventListener('click', (e) => {
      if (e.target === $('#modal')) hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

    // Pagination
    $('#pagination').addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      const page = btn.dataset.page;
      const totalPages = Math.ceil(state.filteredGames.length / state.perPage) || 1;
      if (page === 'prev') state.currentPage = Math.max(1, state.currentPage - 1);
      else if (page === 'next') state.currentPage = Math.min(totalPages, state.currentPage + 1);
      else state.currentPage = parseInt(page);
      renderTable();
      renderPagination();
      $('.games-table-wrap').scrollTop = 0;
    });
  }

  // ── Build instructions content ──
  function buildInstructions() {
    // General Instructions (Release 10)
    $('#instructionsContent').innerHTML = `
      <h2>General Installation Instructions — Release 10</h2>

      <h3>FINAL / APK <span class="highlight">.apk files</span></h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Copy <span class="highlight">.apk</span> file to SDCARD <span class="highlight">/APK/</span> directory.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install the apk file.</span></div>

      <h3>FINAL / SET <span class="highlight">.7z files</span></h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Unzip the <span class="highlight">.7z</span> file direct to SDCARD ROOT. APK files will be copied to <span class="highlight">/APK/</span> directory. All data files will be copied to correct location.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install the apk file.</span></div>

      <h3>FINAL / GKP <span class="highlight">.7z files</span></h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Unzip the <span class="highlight">.7z</span> file direct to SDCARD ROOT. APK files will be copied to <span class="highlight">/APK/</span> directory. <span class="highlight">.gkp</span> files will be copied to <span class="highlight">/GKP/</span> directory. All data files will be copied to correct location.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install the apk file.</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Install GameKeyboard+ [6.1.1] by reading the instructions document provided.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Import <span class="highlight">.gkp</span> file to GameKeyboard+ before starting game. You can save the template within the game to enable auto profile load on game start.</span></div>

      <h3>FINAL / PS</h3>
      <div class="info-box">Read further instructions in the <strong>PS Instructions</strong> tab.</div>

      <h3>WIP — WIFI <span class="highlight">.7z files</span></h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Unzip the <span class="highlight">.7z</span> file direct to SDCARD ROOT. APK files will be copied to <span class="highlight">/APK/</span> directory. All data files will be copied to correct location.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install the apk file.</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Turn WIFI on for first run to verify data cache files.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">WIFI can be turned off after first run.</span></div>

      <h3>WIP — REMAP</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Same as FINAL/APK &amp; FINAL/SET instructions. No WIFI requirements.</span></div>
      <div class="warning">These games do not play well due to poor button mapping.</div>

      <h3>WIP — OTS (One Thumb Shooters)</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Same as FINAL/SET instructions. No WIFI requirements.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">This is a collection of First Person Shooters without touchpad support. They are configured to use as many Xperia Play buttons as possible, however you will need one thumb on screen to look left, right, up and down.</span></div>
      <div class="info-box">We hope one day to have the touchpad mapped on these games, however they are still highly playable and very enjoyable in this state.</div>

      <h3>WIP — MALWARE</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Same as FINAL/APK &amp; FINAL/SET instructions. No WIFI requirements.</span></div>
      <div class="warning">Install and use these games at your own risk. We will attempt to clean these for future releases.</div>

      <h3>WIP — APPS (Untested)</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Copy <span class="highlight">.apk</span> file to SDCARD <span class="highlight">/APK/</span> directory.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install the apk file.</span></div>

      <h3>WIP — HELP</h3>
      <p>These games have issues. Any assistance on booting these would be appreciated.</p>

      <h3>RetroArch XPLAY KIT</h3>
      <div class="info-box">Read the <strong>RetroArch</strong> tab for full instructions.</div>

      <h2>Community</h2>
      <p>Discord server: <a href="https://discord.gg/YZM3rEpE2e" target="_blank">https://discord.gg/YZM3rEpE2e</a></p>
      <p>Report feedback in <span class="highlight">#game-testing</span></p>
      <p style="margin-top:16px;color:var(--text-dim);">Current state: <strong style="color:var(--se-green);">1062</strong> [Including WIP] of <strong>1134</strong> (+ 95 Untested APPS)</p>
      <p style="color:var(--text-dim);margin-top:8px;">— RoadkillMike &amp; Ryo</p>
    `;

    // PS Instructions
    $('#psContent').innerHTML = `
      <h2>PlayStation Instructions</h2>

      <h3>PSP Games</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Install game APK</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Run your game directly (All games are already modified to bypass DRM)</span></div>

      <h3>PSM &amp; PS1 — Initial Setup</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">Install: <span class="highlight">PSM [1.7.0].apk</span></span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Install: <span class="highlight">NoPssDrm [2.0].apk</span><br>Run NoPssDrm [2.0] → Click on <strong>Grant Super User access</strong> → Click on <strong>Install NoPssDrm</strong><br>You should get a notice saying that PSM has been updated.</span></div>

      <h3>PS1 Games</h3>
      <div class="step"><span class="step-num">3</span><span class="step-text">Unzip any Game <span class="highlight">.7z</span> file direct to SD Card Root Directory and all files will be placed correctly.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Install game APK</span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text">WIFI and internet connections can be on or off</span></div>
      <div class="step"><span class="step-num">6</span><span class="step-text">Run your game directly (No need to start PSM)</span></div>
      <div class="step"><span class="step-num">7</span><span class="step-text">You will get an alert asking if you want to use NoPssDrm or PSM. Click cross box for every time then select NoPssDrm (Note: this may happen twice)</span></div>
      <div class="step"><span class="step-num">8</span><span class="step-text">Game should now boot</span></div>

      <h3>PS1 &amp; PSP — Optional</h3>
      <div class="step"><span class="step-num">9</span><span class="step-text">Install: <span class="highlight">PS Pocket [1.1.3.0.0].apk</span><br>PS Pocket is a launcher just for the PS1 &amp; PSP Games. You can view game manuals without starting each game by pressing the menu button.<br><em style="color:var(--text-dim);">Note: the default PS Pocket app that comes with the phone may not display PS1 &amp; PSP games until updated to 1.1.3.0.0</em></span></div>

      <h3>PSM Games</h3>
      <div class="step"><span class="step-num">3</span><span class="step-text">Unzip any Game <span class="highlight">.7z</span> file direct to SD Card Root Directory and all files will be placed correctly.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Ensure WIFI and internet connections are <strong>turned off</strong></span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text">Run PSM to select your game to play and Enjoy</span></div>

      <h3>PSM Compatibility Levels</h3>
      <div style="margin:12px 0;">
        <div class="step"><span class="step-num" style="color:var(--se-green);">1</span><span class="step-text"><strong>XPLAY</strong> — Full Xperia Play Compatibility</span></div>
        <div class="step"><span class="step-num" style="color:var(--se-orange);">2</span><span class="step-text"><strong>PARTIAL</strong> — Not fully supported, may need partial touchscreen controls</span></div>
        <div class="step"><span class="step-num" style="color:var(--se-red);">3</span><span class="step-text"><strong>TOUCH</strong> — No Xperia Play gamepad controls. Touchscreen only</span></div>
        <div class="step"><span class="step-num" style="color:var(--text-dim);">4</span><span class="step-text"><strong>APPS</strong> — Various PSM apps. Some no longer function or require internet</span></div>
      </div>

      <h3>PSM — Optional</h3>
      <div class="step"><span class="step-num">6</span><span class="step-text">Install: <span class="highlight">PKGa [1.0].apk</span><br>Turn WIFI on → Run PKGa [1.0].apk<br>This app allows you to download PSM games directly from NoPayStation.<br>Remember to turn off WIFI before restarting PSM.</span></div>
    `;

    // RetroArch
    $('#retroarchContent').innerHTML = `
      <h2>RetroArch 32-bit [1.17.0_GIT] Offline Kit</h2>
      <p>Includes Assets, Databases, Core Info and basic config to suit Xperia Play. Cores, custom Xperia Play wallpapers, thumbnails and overlays for the following systems:</p>

      <h3>Supported Systems</h3>
      <div class="console-list">
        ${[
          'Atari 1977 - 2600','Atari 1982 - 5200','Atari 1986 - 7800','Atari 1989 - Lynx',
          'Nintendo 1983 - NES','Nintendo 1986 - FDS','Nintendo 1989 - Game Boy','Nintendo 1990 - SNES',
          'Nintendo 1995 - Satellaview','Nintendo 1995 - Virtual Boy','Nintendo 1996 - Sufami Turbo',
          'Nintendo 1998 - Game Boy Color','Nintendo 2001 - Game Boy Advance',
          'Sega 1983 - SG-1000','Sega 1985 - Master System','Sega 1988 - Mega Drive / Genesis',
          'Sega 1990 - Game Gear','Sega 1993 - PICO','Sega 1994 - 32X'
        ].map(s => `<div class="console-item">${s}</div>`).join('')}
      </div>

      <h3>Coming Soon</h3>
      <div class="console-list">
        ${[
          'Coleco - ColecoVision','Fairchild - Channel F','Microsoft - MSX','Microsoft - MSX2',
          'NEC - PCE TurboGrafx','NEC - PCE SuperGrafx','Sega - Sega CD','SNK - Neo Geo CD',
          'SNK - Neo Geo Pocket','SNK - Neo Geo Pocket Color','Sony - PS1'
        ].map(s => `<div class="console-item coming-soon">${s}</div>`).join('')}
      </div>

      <h2>Setup</h2>
      <div class="step"><span class="step-num">1</span><span class="step-text">Unzip <span class="highlight">RetroArch 32-bit [1.17.0_GIT].7z</span> to SD card Root Directory to have all files placed correctly.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Unzip selected systems that you want to use to SD card Root Directory.</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Install <span class="highlight">RetroArch 32-bit [1.17.0_GIT].apk</span> from SD Card <span class="highlight">APK/</span> directory.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Run RetroArch. Everything should look ready, however no games will run as the cores still need to be installed and your ROMs need to be loaded.</span></div>

      <h3>Restore Cores Offline</h3>
      <div class="step"><span class="step-num">1</span><span class="step-text">From starting menu position press <strong>right</strong> once to move to <strong>SETTINGS</strong></span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Press down until you find <strong>CORE</strong> and press <strong>X</strong></span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Press X again on <strong>MANAGE CORES</strong></span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Press down until you find <strong>INSTALL OR RESTORE A CORE</strong> and press <strong>X</strong></span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text">You should now see a list of the prepackaged cores stored on the SDCARD <span class="highlight">/Retroarch/Downloads</span> directory.</span></div>
      <div class="step"><span class="step-num">6</span><span class="step-text">Press X on each core to have them installed to the internal memory. It may dump you out to the settings menu between each core restore.</span></div>
      <div class="info-box">After each core is restored the games playlists to the far right should now work once you have loaded your game ROMs.</div>

      <h3>ROM Sets</h3>
      <p>A 1 game 1 ROM NoIntro DAT file has been included under <span class="highlight">/ROMS/</span> to help build your ROM set.</p>
      <p>Recommended tool: <a href="https://www.romvault.com/" target="_blank">ROMVAULT</a></p>
      <div class="step"><span class="step-num">1</span><span class="step-text">Place the downloaded full set in the ROMVAULT sorting folder</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Load the DAT file in ROMVAULT</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Scan the ROMS with ROMVAULT</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Press the fix button and ROMVAULT will build a ROM SET that will match the thumbnails on the Xperia Play (omitting all duplicates and saving you space)</span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text">Copy the finished ROM SET to the SD card under the corresponding subfolder under <span class="highlight">/ROMS/</span></span></div>
      <p>Full ROM sets can be found on <a href="https://archive.org/details/ni-romsets" target="_blank">archive.org</a>.</p>

      <h3>Thumbnails &amp; Overlays</h3>
      <p>Each system kit comes preloaded with a complete thumbnail set for all originally released games, reduced in size to suit the Xperia Play resolution for optimized load times. Matching system wallpapers and in-game overlays are included with each system and should work automatically when unzipped.</p>
    `;

    // Root Pack
    $('#rootContent').innerHTML = `
      <h2>Xperia Play Root Pack Instructions</h2>
      <p>Follow these steps carefully to root your Xperia Play device.</p>

      <div class="step"><span class="step-num">1</span><span class="step-text">Install <span class="highlight">Baidu Root</span></span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text">Launch Baidu Root</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text">Tap <strong>"A key to get root privileges"</strong></span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text">Install <span class="highlight">Link2sd</span> and <span class="highlight">Es Explorer</span> and give them both root access (Check the root explorer option in Es Explorer)</span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text">Install <span class="highlight">Supersu</span></span></div>
      <div class="step"><span class="step-num">6</span><span class="step-text">Launch Supersu within Link2sd</span></div>
      <div class="step"><span class="step-num">7</span><span class="step-text">Update the binary</span></div>
      <div class="step"><span class="step-num">8</span><span class="step-text">Uninstall Baidu root within Link2sd</span></div>
      <div class="step"><span class="step-num">9</span><span class="step-text">Delete the Baidu app in <span class="highlight">system/app</span> with Es Explorer</span></div>
      <div class="step"><span class="step-num">10</span><span class="step-text">Reboot</span></div>

      <div class="info-box" style="margin-top:24px;">After completing these steps, your Xperia Play will be rooted with SuperSU managing root permissions. Baidu Root is only used as the initial exploit and is removed for security.</div>
    `;

    // Latest Updates
    $('#updatesContent').innerHTML = `
      <h2>Latest Updates — Release 10</h2>
      <p>The archiving torrent has now been updated to Release 10!</p>

      <div class="update-card">
        <h3>Android Games</h3>
        <p style="color:var(--text-dim);margin-bottom:12px;">Some updates, some new, most WIP - HELP</p>
        <div>
          <div class="update-stat"><span class="num">20</span><span class="label">SETS (5 NEW + 15 updated)</span></div>
          <div class="update-stat"><span class="num">97</span><span class="label">APKS (50 NEW + 47 updated)</span></div>
        </div>
      </div>

      <div class="update-card">
        <h3>Visual Novels</h3>
        <div>
          <div class="update-stat"><span class="num">13</span><span class="label">Visual Novels added</span></div>
        </div>
      </div>

      <div class="update-card">
        <h3>RetroArch Kit Update</h3>
        <div>
          <div class="update-stat"><span class="num">23</span><span class="label">Console Kits now complete</span></div>
        </div>
        <p style="margin-top:12px;">2 new kits added:</p>
        <div class="console-list" style="margin-top:8px;">
          <div class="console-item">NEC 1987 - PC Engine - TurboGrafx 16</div>
          <div class="console-item">NEC 1989 - PC Engine - SuperGrafx</div>
        </div>
      </div>

      <p style="margin-top:24px;color:var(--text-dim);">— RoadkillMike &amp; Ryo</p>
    `;
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);
})();
