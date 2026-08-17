// ClipSnap — Notion Edition with Uniform Modern Stroke SVG Icons

let allGalleryData = {};
let currentFolder = 'all';
let currentView = 'gallery';
let searchQuery = '';
let sidebarCategoryFilter = '';
let currentSort = 'newest';
let selectedFilePaths = new Set();
let isBatchMode = false;
let contextMenuTarget = null;
let categoryListCache = [];
let categoryMetaCache = {};
let selectedNewCategoryIcon = 'folder';
let isCreatingCategory = false;
let searchDebounceTimer = null;
let isSidebarCollapsed = false;
let suppressNextGalleryUpdate = false;
let galleryUpdateSuppressionToken = 0;

// Annotation Editor State
let editorCurrentImagePath = null;
let editorCanvas = null;
let editorCtx = null;
let editorImageObj = null;
let currentTool = 'pen';
let currentColor = '#ff4757';
let currentStrokeSize = 4;
let isDrawing = false;
let startX = 0;
let startY = 0;
let undoStack = [];
const MAX_UNDO = 20;

// Central Modern Stroke SVG Registry
const SVG_ICONS = {
  all: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  unsorted: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  folder: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  code: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  study: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  book: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  bills: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  receipt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  personal: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  user: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  brush: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  bulb: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
  'file-text': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  briefcase: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  target: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  rocket: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-2.95 9.95A22.05 22.05 0 0 1 15 12z"/></svg>`,
  camera: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`
};

function getCategorySvg(key) {
  if (!key) return SVG_ICONS.folder;
  const k = key.toLowerCase();
  if (SVG_ICONS[k]) return SVG_ICONS[k];
  if (categoryMetaCache[k] && categoryMetaCache[k].icon && SVG_ICONS[categoryMetaCache[k].icon]) {
    return SVG_ICONS[categoryMetaCache[k].icon];
  }
  return SVG_ICONS.folder;
}

// Safe Windows & POSIX File URL Formatter
function toFileUrl(filePath) {
  if (!filePath) return '';
  let normalized = filePath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return 'file://' + encodeURI(normalized);
}

function getCategoryDisplayName(cat) {
  if (categoryMetaCache[cat.toLowerCase()] && categoryMetaCache[cat.toLowerCase()].displayName) {
    return categoryMetaCache[cat.toLowerCase()].displayName;
  }
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getCategoryTagClass(cat) {
  const c = cat.toLowerCase();
  if (['study', 'code', 'bills', 'personal', 'unsorted'].includes(c)) {
    return `tag-${c}`;
  }
  return 'tag-unsorted';
}

function isInteractiveTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  return !!target.closest('button, input, select, textarea, a, [role="button"], .notion-context-menu');
}

function suppressNextMainGalleryUpdate() {
  const token = ++galleryUpdateSuppressionToken;
  suppressNextGalleryUpdate = true;
  setTimeout(() => {
    if (galleryUpdateSuppressionToken === token) {
      suppressNextGalleryUpdate = false;
    }
  }, 750);
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initSidebarState();
  setupEditorCanvas();
  setupWindowControls();
  setupEventListeners();

  await loadCategories();
  await loadGalleryData();

  // Listen for new screenshot captures
  window.electronAPI.onNewScreenshot((imagePath) => {
    console.log('New screenshot captured:', imagePath);
    loadGalleryData();
  });

  // Listen for gallery updates
  if (window.electronAPI.onGalleryUpdated) {
    window.electronAPI.onGalleryUpdated(() => {
      if (suppressNextGalleryUpdate) {
        suppressNextGalleryUpdate = false;
        return;
      }
      loadGalleryData();
    });
  }

  // Listen for category updates
  if (window.electronAPI.onCategoriesUpdated) {
    window.electronAPI.onCategoriesUpdated(async () => {
      await loadCategories();
      await loadGalleryData();
    });
  }

  // Listen for open editor requests from HUD popup
  if (window.electronAPI.onOpenImageEditor) {
    window.electronAPI.onOpenImageEditor((imagePath) => {
      openImageEditor(imagePath);
    });
  }

  // Listen for maximize/restore state changes from main process
  if (window.electronAPI.onWindowMaximized) {
    window.electronAPI.onWindowMaximized((isMax) => {
      updateMaximizeButton(isMax);
    });
  }
});

// ===== Theme Initialization =====
function initTheme() {
  const savedTheme = localStorage.getItem('clipsnap-theme') || 'dark';
  setAppTheme(savedTheme);
}

function setAppTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('clipsnap-theme', theme);

  const darkBtn = document.getElementById('chooseDarkTheme');
  const lightBtn = document.getElementById('chooseLightTheme');
  if (darkBtn && lightBtn) {
    darkBtn.classList.toggle('active', theme === 'dark');
    lightBtn.classList.toggle('active', theme === 'light');
  }
}

// ===== Custom Window Controls (Frameless Window) =====
function setupWindowControls() {
  const minBtn = document.getElementById('winMinimizeBtn');
  const maxBtn = document.getElementById('winMaximizeBtn');
  const closeBtn = document.getElementById('winCloseBtn');

  if (minBtn) {
    minBtn.addEventListener('click', () => {
      window.electronAPI.windowMinimize();
    });
  }

  if (maxBtn) {
    maxBtn.addEventListener('click', async () => {
      const isNowMax = await window.electronAPI.windowMaximize();
      updateMaximizeButton(isNowMax);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.electronAPI.windowClose();
    });
  }

  // Check initial state
  if (window.electronAPI.windowIsMaximized) {
    window.electronAPI.windowIsMaximized().then(isMax => updateMaximizeButton(isMax));
  }
}

function updateMaximizeButton(isMaximized) {
  const maxBtn = document.getElementById('winMaximizeBtn');
  if (!maxBtn) return;

  if (isMaximized) {
    // Show restore icon (two overlapping squares)
    maxBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1">
      <rect x="2" y="0" width="8" height="8"/>
      <rect x="0" y="2" width="8" height="8" fill="none"/>
    </svg>`;
    maxBtn.title = 'Restore';
    maxBtn.classList.add('is-maximized');
  } else {
    // Show maximize icon (single square)
    maxBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1">
      <rect x="0.5" y="0.5" width="9" height="9"/>
    </svg>`;
    maxBtn.title = 'Maximize';
    maxBtn.classList.remove('is-maximized');
  }
}

// ===== Sidebar Expandable / Collapsible State =====
function initSidebarState() {
  isSidebarCollapsed = localStorage.getItem('clipsnap-sidebar-collapsed') === 'true';
  applySidebarState();
}

function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  localStorage.setItem('clipsnap-sidebar-collapsed', isSidebarCollapsed ? 'true' : 'false');
  applySidebarState();
}

function applySidebarState() {
  const sidebar = document.getElementById('sidebar');
  const expandBtn = document.getElementById('expandSidebarBtn');

  if (isSidebarCollapsed) {
    sidebar.classList.add('collapsed');
    if (expandBtn) expandBtn.style.display = 'flex';
  } else {
    sidebar.classList.remove('collapsed');
    if (expandBtn) expandBtn.style.display = 'none';
  }
}

// ===== Load Gallery Data =====
async function loadGalleryData() {
  try {
    allGalleryData = await window.electronAPI.getGalleryData();
    if (!allGalleryData) allGalleryData = {};
    updateSidebarBadges();
    displayContent();
  } catch (error) {
    console.error('Error loading gallery data:', error);
    allGalleryData = {};
    displayContent();
  }
}

// ===== Load Categories =====
async function loadCategories() {
  try {
    const res = await window.electronAPI.getCategories();
    if (res && res.success) {
      categoryListCache = res.categories;
      categoryMetaCache = res.meta || {};
    } else {
      categoryListCache = [
        { id: 'study', name: 'study', displayName: 'Study', icon: 'study' },
        { id: 'code', name: 'code', displayName: 'Code', icon: 'code' },
        { id: 'bills', name: 'bills', displayName: 'Bills', icon: 'bills' },
        { id: 'personal', name: 'personal', displayName: 'Personal', icon: 'personal' }
      ];
    }
    renderCategoriesList();
    populateBatchMoveDropdown();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Render categories in sidebar with filter support
function renderCategoriesList() {
  const list = document.getElementById('categoriesList');
  list.innerHTML = '';

  const defaultCats = ['study', 'code', 'bills', 'personal', 'unsorted'];
  const filterQuery = sidebarCategoryFilter.trim().toLowerCase();

  const filtered = categoryListCache.filter(cat => {
    if (!filterQuery) return true;
    const name = (cat.displayName || cat.id).toLowerCase();
    return name.includes(filterQuery);
  });

  if (filtered.length === 0 && filterQuery) {
    list.innerHTML = '<div style="padding: 6px 8px; font-size: 11px; color: var(--text-tertiary);">No categories match</div>';
    return;
  }

  filtered.forEach(cat => {
    const row = document.createElement('div');
    row.className = `category-row ${currentFolder === cat.id ? 'active' : ''}`;
    row.dataset.folder = cat.id;
    row.title = cat.displayName;

    const iconSvg = getCategorySvg(cat.icon || cat.id);
    const displayName = cat.displayName || getCategoryDisplayName(cat.id);
    const count = (allGalleryData[cat.id] || []).length;
    const isDeletable = !defaultCats.includes(cat.id.toLowerCase());

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
        <span class="nav-svg-icon">${iconSvg}</span>
        <span class="nav-text">${displayName}</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="nav-badge">${count}</span>
        ${isDeletable ? `<button class="category-delete-icon" title="Delete category" data-cat="${cat.id}">✕</button>` : ''}
      </div>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-delete-icon')) {
        e.stopPropagation();
        deleteCategoryPrompt(cat.id, displayName);
        return;
      }
      selectFolder(cat.id);
    });

    list.appendChild(row);
  });
}

function populateBatchMoveDropdown() {
  const select = document.getElementById('batchMoveSelect');
  select.innerHTML = '<option value="" disabled selected>Move to Category...</option>';

  const optUnsorted = document.createElement('option');
  optUnsorted.value = 'unsorted';
  optUnsorted.textContent = 'Unsorted';
  select.appendChild(optUnsorted);

  categoryListCache.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.displayName;
    select.appendChild(opt);
  });
}

function updateSidebarBadges() {
  let totalCount = 0;
  Object.keys(allGalleryData).forEach(k => {
    totalCount += (allGalleryData[k] || []).length;
  });

  const badgeAll = document.getElementById('badgeAll');
  if (badgeAll) badgeAll.textContent = totalCount;

  const unsortedCount = (allGalleryData['unsorted'] || []).length;
  const badgeUnsorted = document.getElementById('badgeUnsorted');
  if (badgeUnsorted) {
    badgeUnsorted.textContent = unsortedCount;
    badgeUnsorted.style.display = unsortedCount > 0 ? 'inline-block' : 'none';
  }

  renderCategoriesList();
}

// ===== Folder Selection =====
function selectFolder(folder) {
  currentFolder = folder;

  document.querySelectorAll('.nav-link, .category-row').forEach(el => {
    if (el.dataset.folder === folder) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const pageTitle = document.getElementById('pageTitle');
  const pageIconBox = document.getElementById('pageIconBox');
  const currentFolderCrumb = document.getElementById('currentFolderCrumb');
  const pageDesc = document.getElementById('pageDesc');

  if (folder === 'all') {
    pageTitle.textContent = 'All Snaps';
    pageIconBox.innerHTML = SVG_ICONS.all;
    currentFolderCrumb.textContent = 'All Snaps';
    pageDesc.textContent = 'All captured screenshots across your folders.';
  } else if (folder === 'unsorted') {
    pageTitle.textContent = 'Unsorted Inbox';
    pageIconBox.innerHTML = SVG_ICONS.unsorted;
    currentFolderCrumb.textContent = 'Unsorted';
    pageDesc.textContent = 'New captures awaiting categorization.';
  } else {
    const displayName = getCategoryDisplayName(folder);
    pageTitle.textContent = displayName;
    pageIconBox.innerHTML = getCategorySvg(folder);
    currentFolderCrumb.textContent = displayName;
    pageDesc.textContent = `Screenshots categorized under ${displayName}.`;
  }

  clearBatchSelection();
  displayContent();
}

// ===== Filter & Sort (Dashboard Search by Name) =====
function getProcessedImages() {
  let images = [];
  if (currentFolder === 'all') {
    Object.keys(allGalleryData).forEach(cat => {
      images = images.concat(allGalleryData[cat] || []);
    });
  } else {
    images = allGalleryData[currentFolder] || [];
  }

  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    images = images.filter(img => img.name.toLowerCase().includes(q));
  }

  if (currentSort === 'newest') {
    images.sort((a, b) => b.name.localeCompare(a.name));
  } else if (currentSort === 'oldest') {
    images.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'name') {
    images.sort((a, b) => a.name.localeCompare(b.name));
  }

  return images;
}

// ===== Display Content (Gallery or Table) =====
function displayContent() {
  const images = getProcessedImages();
  const pageItemCount = document.getElementById('pageItemCount');
  const emptyState = document.getElementById('emptyState');
  const galleryContainer = document.getElementById('galleryContainer');
  const tableContainer = document.getElementById('tableContainer');

  pageItemCount.textContent = `${images.length} item${images.length !== 1 ? 's' : ''}`;

  if (images.length === 0) {
    emptyState.style.display = 'flex';
    galleryContainer.style.display = 'none';
    tableContainer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';

  if (currentView === 'gallery') {
    galleryContainer.style.display = 'block';
    tableContainer.style.display = 'none';
    renderGalleryGrid(images);
  } else {
    galleryContainer.style.display = 'none';
    tableContainer.style.display = 'block';
    renderTableView(images);
  }
}

// ===== Render Gallery Grid =====
function renderGalleryGrid(images) {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  images.forEach(img => {
    const isSelected = selectedFilePaths.has(img.path);
    const fileUrl = toFileUrl(img.path);

    const card = document.createElement('div');
    card.className = `notion-card ${isSelected ? 'selected' : ''}`;
    card.dataset.path = img.path;
    card.dataset.category = img.category;

    const iconSvg = getCategorySvg(img.category);
    const tagClass = getCategoryTagClass(img.category);
    const catName = getCategoryDisplayName(img.category);

    card.innerHTML = `
      <input type="checkbox" class="card-select-checkbox" ${isSelected ? 'checked' : ''}>
      <div class="card-thumbnail-wrap">
        <img class="card-thumbnail" src="${fileUrl}" alt="${img.name}" loading="lazy">
        <div class="card-quick-actions">
          <button class="card-action-icon-btn" data-action="annotate" title="Annotate & Markup">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="card-action-icon-btn" data-action="copy" title="Copy Image">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="card-action-icon-btn" data-action="reveal" title="Show in Folder">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="card-action-icon-btn danger" data-action="delete" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="card-meta">
        <div class="card-name" title="${img.name}">${img.name}</div>
        <div class="card-footer-row">
          <span class="notion-tag ${tagClass}">
            <span style="display:inline-flex; align-items:center; transform:scale(0.85);">${iconSvg}</span>
            <span>${catName}</span>
          </span>
          <span class="card-date">PNG</span>
        </div>
      </div>
    `;

    card.addEventListener('pointerdown', (e) => {
      card.dataset.interactivePointerDown = isInteractiveTarget(e.target) ? 'true' : 'false';
    }, true);

    card.addEventListener('pointerup', () => {
      card.dataset.interactivePointerDown = 'false';
    }, true);

    card.addEventListener('pointercancel', () => {
      card.dataset.interactivePointerDown = 'false';
    }, true);

    const checkbox = card.querySelector('.card-select-checkbox');
    checkbox.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleItemSelection(img.path);
    });

    card.querySelectorAll('.card-action-icon-btn').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      btn.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardAction(btn.dataset.action, img.path);
      });
    });

    card.addEventListener('click', (e) => {
      if (isInteractiveTarget(e.target)) return;

      if (isBatchMode) {
        toggleItemSelection(img.path);
      } else {
        openImageEditor(img.path);
      }
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, img.path);
    });

    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      if (card.dataset.interactivePointerDown === 'true' || isInteractiveTarget(e.target)) {
        e.preventDefault();
        card.dataset.interactivePointerDown = 'false';
        return;
      }

      card.dataset.interactivePointerDown = 'false';
      window.electronAPI.startDrag(img.path);
    });

    grid.appendChild(card);
  });
}

// ===== Render Table View =====
function renderTableView(images) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  images.forEach(img => {
    const isSelected = selectedFilePaths.has(img.path);
    const fileUrl = toFileUrl(img.path);
    const tr = document.createElement('tr');
    tr.dataset.path = img.path;

    const iconSvg = getCategorySvg(img.category);
    const tagClass = getCategoryTagClass(img.category);
    const catName = getCategoryDisplayName(img.category);

    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}></td>
      <td><img class="table-thumbnail" src="${fileUrl}" alt="${img.name}" loading="lazy"></td>
      <td style="font-weight: 500;">${img.name}</td>
      <td>
        <span class="notion-tag ${tagClass}">
          <span style="display:inline-flex; align-items:center; transform:scale(0.85);">${iconSvg}</span>
          <span>${catName}</span>
        </span>
      </td>
      <td style="color: var(--text-secondary);">Image File</td>
      <td>
        <div class="table-actions">
          <button class="btn-subtle" data-action="annotate" title="Annotate">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-subtle" data-action="copy" title="Copy">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-subtle" data-action="reveal" title="Show in Folder">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="btn-subtle" style="color: #ff6b6b;" data-action="delete" title="Delete">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

    const checkbox = tr.querySelector('.row-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleItemSelection(img.path);
    });

    tr.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardAction(btn.dataset.action, img.path);
      });
    });

    tr.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
        openImageEditor(img.path);
      }
    });

    tbody.appendChild(tr);
  });
}

// ===== Card Actions Handler =====
async function deleteScreenshotWithUiCleanup(filePath) {
  if (!filePath) {
    return { success: false, error: 'Missing file path' };
  }

  hideContextMenu();
  selectedFilePaths.delete(filePath);
  updateBatchUI();

  suppressNextMainGalleryUpdate();
  const result = await window.electronAPI.deleteScreenshot(filePath);

  if (result && result.success) {
    await loadGalleryData();
  } else {
    suppressNextGalleryUpdate = false;
    alert(result ? result.error : 'Failed to delete screenshot.');
  }

  return result;
}

async function handleCardAction(action, filePath) {
  if (action === 'annotate') {
    openImageEditor(filePath);
  } else if (action === 'copy') {
    await window.electronAPI.copyImageToClipboard(filePath);
  } else if (action === 'reveal') {
    await window.electronAPI.openInExplorer(filePath);
  } else if (action === 'delete') {
    if (confirm('Delete this screenshot permanently?')) {
      await deleteScreenshotWithUiCleanup(filePath);
    }
  }
}

// ===== Batch Selection Logic =====
function toggleItemSelection(filePath) {
  if (selectedFilePaths.has(filePath)) {
    selectedFilePaths.delete(filePath);
  } else {
    selectedFilePaths.add(filePath);
  }
  updateBatchUI();
}

function clearBatchSelection() {
  selectedFilePaths.clear();
  updateBatchUI();
}

function updateBatchUI() {
  const count = selectedFilePaths.size;
  const floatingBar = document.getElementById('floatingBatchBar');
  const countBadge = document.getElementById('selectedCountBadge');

  countBadge.textContent = count;

  if (count > 0) {
    floatingBar.classList.add('show');
  } else {
    floatingBar.classList.remove('show');
  }

  document.querySelectorAll('.notion-card').forEach(card => {
    const p = card.dataset.path;
    const isSel = selectedFilePaths.has(p);
    card.classList.toggle('selected', isSel);
    const cb = card.querySelector('.card-select-checkbox');
    if (cb) cb.checked = isSel;
  });

  document.querySelectorAll('#tableBody tr').forEach(row => {
    const p = row.dataset.path;
    const isSel = selectedFilePaths.has(p);
    const cb = row.querySelector('.row-checkbox');
    if (cb) cb.checked = isSel;
  });
}

// ===== Context Menu =====
function showContextMenu(x, y, filePath) {
  contextMenuTarget = filePath;
  const menu = document.getElementById('contextMenu');
  menu.style.display = 'block';
  menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 180)}px`;
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  menu.style.display = 'none';
  contextMenuTarget = null;
}

// ===== Image Annotation Studio =====
function setupEditorCanvas() {
  editorCanvas = document.getElementById('annotationCanvas');
  editorCtx = editorCanvas.getContext('2d');

  editorCanvas.addEventListener('mousedown', onCanvasMouseDown);
  editorCanvas.addEventListener('mousemove', onCanvasMouseMove);
  editorCanvas.addEventListener('mouseup', onCanvasMouseUp);
  editorCanvas.addEventListener('mouseleave', onCanvasMouseUp);
}

function openImageEditor(filePath) {
  editorCurrentImagePath = filePath;
  undoStack = [];

  const filename = filePath.split(/[\\/]/).pop();
  document.getElementById('editorFileName').value = filename;
  document.getElementById('editorFilePath').textContent = filePath;

  editorImageObj = new Image();
  editorImageObj.onload = () => {
    editorCanvas.width = editorImageObj.naturalWidth;
    editorCanvas.height = editorImageObj.naturalHeight;
    editorCtx.drawImage(editorImageObj, 0, 0);
    saveUndoState();

    document.getElementById('editorModal').style.display = 'flex';
  };
  editorImageObj.src = toFileUrl(filePath);
}

function closeImageEditor() {
  document.getElementById('editorModal').style.display = 'none';
  editorCurrentImagePath = null;
}

function saveUndoState() {
  if (undoStack.length >= MAX_UNDO) undoStack.shift();
  undoStack.push(editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height));
}

function undoLastAction() {
  if (undoStack.length > 1) {
    undoStack.pop();
    const previous = undoStack[undoStack.length - 1];
    editorCtx.putImageData(previous, 0, 0);
  }
}

function clearAllAnnotations() {
  if (editorImageObj) {
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(editorImageObj, 0, 0);
    saveUndoState();
  }
}

function getCanvasCoordinates(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / rect.width;
  const scaleY = editorCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function onCanvasMouseDown(e) {
  isDrawing = true;
  const coords = getCanvasCoordinates(e);
  startX = coords.x;
  startY = coords.y;

  if (currentTool === 'text') {
    const userText = prompt('Enter annotation text:');
    if (userText && userText.trim()) {
      editorCtx.font = `bold ${currentStrokeSize * 6}px ${getComputedStyle(document.body).fontFamily}`;
      editorCtx.fillStyle = currentColor;
      editorCtx.fillText(userText, startX, startY);
      saveUndoState();
    }
    isDrawing = false;
  }
}

function onCanvasMouseMove(e) {
  if (!isDrawing) return;
  const coords = getCanvasCoordinates(e);

  if (currentTool === 'pen' || currentTool === 'highlighter') {
    editorCtx.beginPath();
    editorCtx.moveTo(startX, startY);
    editorCtx.lineTo(coords.x, coords.y);
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';

    if (currentTool === 'highlighter') {
      editorCtx.strokeStyle = currentColor + '66';
      editorCtx.lineWidth = currentStrokeSize * 3;
    } else {
      editorCtx.strokeStyle = currentColor;
      editorCtx.lineWidth = currentStrokeSize;
    }

    editorCtx.stroke();
    startX = coords.x;
    startY = coords.y;
  }
}

function onCanvasMouseUp(e) {
  if (!isDrawing) return;
  isDrawing = false;
  const coords = getCanvasCoordinates(e);

  if (currentTool === 'rect') {
    editorCtx.beginPath();
    editorCtx.strokeStyle = currentColor;
    editorCtx.lineWidth = currentStrokeSize;
    editorCtx.strokeRect(startX, startY, coords.x - startX, coords.y - startY);
    saveUndoState();
  } else if (currentTool === 'arrow') {
    drawArrow(startX, startY, coords.x, coords.y, currentColor, currentStrokeSize);
    saveUndoState();
  } else if (currentTool === 'blur') {
    drawBlurBox(startX, startY, coords.x - startX, coords.y - startY);
    saveUndoState();
  } else if (currentTool === 'pen' || currentTool === 'highlighter') {
    saveUndoState();
  }
}

function drawArrow(fromX, fromY, toX, toY, color, size) {
  const headLen = Math.max(12, size * 3);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  editorCtx.beginPath();
  editorCtx.strokeStyle = color;
  editorCtx.fillStyle = color;
  editorCtx.lineWidth = size;
  editorCtx.moveTo(fromX, fromY);
  editorCtx.lineTo(toX, toY);
  editorCtx.stroke();

  editorCtx.beginPath();
  editorCtx.moveTo(toX, toY);
  editorCtx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  editorCtx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  editorCtx.closePath();
  editorCtx.fill();
}

function drawBlurBox(x, y, w, h) {
  editorCtx.fillStyle = 'rgba(18, 18, 18, 0.95)';
  editorCtx.fillRect(x, y, w, h);
}

// ===== Save Annotation =====
async function saveAnnotation(saveAsCopy = false) {
  if (!editorCurrentImagePath) return;

  const dataUrl = editorCanvas.toDataURL('image/png');
  const res = await window.electronAPI.saveAnnotatedImage(editorCurrentImagePath, dataUrl, saveAsCopy);

  if (res && res.success) {
    const newNameInput = document.getElementById('editorFileName').value.trim();
    if (newNameInput && !saveAsCopy) {
      await window.electronAPI.renameScreenshot(editorCurrentImagePath, newNameInput);
    }

    closeImageEditor();
    await loadGalleryData();
  } else {
    alert('Failed to save image annotation: ' + (res ? res.error : 'Unknown error'));
  }
}

// ===== Settings Modal Logic =====
async function openSettingsModal() {
  try {
    const settings = await window.electronAPI.getAppSettings();
    const pathEl = document.getElementById('settingsStoragePath');
    if (pathEl) {
      pathEl.textContent = settings.storagePath || 'ClipSnap';
      pathEl.title = settings.storagePath || '';
    }
  } catch (e) {
    console.error('Error fetching settings:', e);
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  setAppTheme(currentTheme);
  document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

// ===== Category Creation Dialog =====
function openCategoryModal() {
  const input = document.getElementById('categoryInput');
  input.value = '';
  selectedNewCategoryIcon = 'folder';
  document.querySelectorAll('.icon-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.icon === 'folder');
  });
  document.getElementById('categoryModal').style.display = 'flex';
  setTimeout(() => input.focus(), 60);
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

async function confirmCreateCategory() {
  if (isCreatingCategory) return;
  const input = document.getElementById('categoryInput');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }

  isCreatingCategory = true;
  const btn = document.getElementById('confirmModalBtn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const res = await window.electronAPI.addCategory({
      name: name,
      emoji: selectedNewCategoryIcon // pass modern icon key
    });

    if (res && res.success) {
      closeCategoryModal();
      await loadCategories();
      await loadGalleryData();
      selectFolder(res.categoryName);
    } else {
      alert(res ? res.error : 'Failed to create category');
    }
  } catch (err) {
    console.error('Error creating category:', err);
  } finally {
    isCreatingCategory = false;
    btn.textContent = 'Create Category';
    btn.disabled = false;
  }
}

async function deleteCategoryPrompt(categoryId, displayName) {
  if (confirm(`Are you sure you want to delete category "${displayName}"? (Must be empty)`)) {
    const res = await window.electronAPI.deleteCategory(categoryId);
    if (res && res.success) {
      await loadCategories();
      await loadGalleryData();
      selectFolder('all');
    } else {
      alert(res ? res.error : 'Could not delete category. Make sure all screenshots are moved out first.');
    }
  }
}

// ===== Setup Event Listeners =====
function setupEventListeners() {
  // Sidebar Collapse / Expand toggles
  document.getElementById('sidebarToggleBtn').addEventListener('click', toggleSidebar);
  document.getElementById('expandSidebarBtn').addEventListener('click', toggleSidebar);

  // Settings triggers
  document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);
  document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);
  document.getElementById('closeSettingsBackdrop').addEventListener('click', closeSettingsModal);
  document.getElementById('saveSettingsBtn').addEventListener('click', closeSettingsModal);

  document.getElementById('chooseDarkTheme').addEventListener('click', () => setAppTheme('dark'));
  document.getElementById('chooseLightTheme').addEventListener('click', () => setAppTheme('light'));

  document.getElementById('settingsOpenExplorerBtn').addEventListener('click', async () => {
    await window.electronAPI.openInExplorer();
  });

  // Browse Folder button in Settings
  const browseFolderBtn = document.getElementById('settingsBrowseBtn');
  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', async () => {
      const statusEl = document.getElementById('settingsStatusMsg');
      browseFolderBtn.disabled = true;
      browseFolderBtn.textContent = 'Selecting...';

      try {
        const result = await window.electronAPI.selectStorageDirectory();
        if (result && result.success) {
          const pathEl = document.getElementById('settingsStoragePath');
          if (pathEl) {
            pathEl.textContent = result.path;
            pathEl.title = result.path;
          }
          if (statusEl) {
            statusEl.textContent = '✓ Folder updated! Gallery reloaded.';
            statusEl.style.color = '#2ed573';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
          }
          await loadCategories();
          await loadGalleryData();
        } else if (result && !result.canceled) {
          if (statusEl) {
            statusEl.textContent = '✗ ' + (result.error || 'Failed to change folder.');
            statusEl.style.color = '#ff4757';
          }
        }
      } catch (err) {
        console.error('Error selecting folder:', err);
      } finally {
        browseFolderBtn.disabled = false;
        browseFolderBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Change Folder';
      }
    });
  }

  // Storage Button: Opens Storage Folder in Explorer
  document.getElementById('openPicturesFolderBtn').addEventListener('click', async () => {
    await window.electronAPI.openInExplorer();
  });

  document.getElementById('navAllSnaps').addEventListener('click', () => selectFolder('all'));
  document.getElementById('navUnsorted').addEventListener('click', () => selectFolder('unsorted'));

  // Sidebar Category Filter Input
  const categorySearchInput = document.getElementById('sidebarCategorySearch');
  categorySearchInput.addEventListener('input', (e) => {
    sidebarCategoryFilter = e.target.value;
    renderCategoriesList();
  });

  // Dashboard Search by Name Input
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      displayContent();
    }, 60);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    displayContent();
    searchInput.focus();
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (e.key === 'Escape') {
      hideContextMenu();
      closeImageEditor();
      closeCategoryModal();
      closeSettingsModal();
    }
  });

  // View Switcher
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      displayContent();
    });
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    displayContent();
  });

  // Batch Select Toggle
  const batchBtn = document.getElementById('batchSelectToggleBtn');
  batchBtn.addEventListener('click', () => {
    isBatchMode = !isBatchMode;
    batchBtn.classList.toggle('active', isBatchMode);
    document.body.classList.toggle('batch-mode-active', isBatchMode);
    if (!isBatchMode) {
      clearBatchSelection();
    }
  });

  // Batch Actions
  document.getElementById('batchCancelBtn').addEventListener('click', clearBatchSelection);

  document.getElementById('batchMoveSelect').addEventListener('change', async (e) => {
    const targetCat = e.target.value;
    if (!targetCat || selectedFilePaths.size === 0) return;

    const paths = Array.from(selectedFilePaths);
    const res = await window.electronAPI.batchMoveFiles(paths, targetCat);
    if (res && res.success) {
      clearBatchSelection();
      await loadGalleryData();
    } else {
      alert('Batch move failed: ' + (res ? res.error : 'Unknown'));
    }
    e.target.value = '';
  });

  document.getElementById('batchCopyBtn').addEventListener('click', async () => {
    const first = Array.from(selectedFilePaths)[0];
    if (first) {
      await window.electronAPI.copyImageToClipboard(first);
      alert('Copied screenshot to clipboard!');
    }
  });

  document.getElementById('batchDeleteBtn').addEventListener('click', async () => {
    const count = selectedFilePaths.size;
    if (count === 0) return;

    if (confirm(`Delete all ${count} selected screenshots?`)) {
      const paths = Array.from(selectedFilePaths);
      hideContextMenu();
      suppressNextMainGalleryUpdate();

      const result = await window.electronAPI.batchDeleteFiles(paths);
      if (result && result.success) {
        clearBatchSelection();
        await loadGalleryData();
      } else {
        suppressNextGalleryUpdate = false;
        alert(result ? result.error : 'Failed to delete selected screenshots.');
      }
    }
  });

  // Table select all
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const images = getProcessedImages();
      if (e.target.checked) {
        images.forEach(img => selectedFilePaths.add(img.path));
      } else {
        clearBatchSelection();
      }
      updateBatchUI();
    });
  }

  // Modern Icon Picker in Category Modal
  document.querySelectorAll('.icon-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedNewCategoryIcon = btn.dataset.icon;
    });
  });

  // Category Modal triggers
  document.getElementById('addCategoryBtn').addEventListener('click', openCategoryModal);
  document.getElementById('quickAddCategoryBtn').addEventListener('click', openCategoryModal);
  document.getElementById('closeModal').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('closeCategoryBackdrop').addEventListener('click', closeCategoryModal);
  document.getElementById('confirmModalBtn').addEventListener('click', confirmCreateCategory);
  
  const categoryInput = document.getElementById('categoryInput');
  categoryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmCreateCategory();
    }
  });

  // Editor Modal triggers
  document.getElementById('editorCloseBtn').addEventListener('click', closeImageEditor);
  document.getElementById('closeEditorBackdrop').addEventListener('click', closeImageEditor);
  document.getElementById('editorUndoBtn').addEventListener('click', undoLastAction);
  document.getElementById('editorClearBtn').addEventListener('click', clearAllAnnotations);
  document.getElementById('editorSaveBtn').addEventListener('click', () => saveAnnotation(false));
  document.getElementById('editorSaveCopyBtn').addEventListener('click', () => saveAnnotation(true));
  document.getElementById('editorCopyClipboardBtn').addEventListener('click', async () => {
    if (editorCurrentImagePath) {
      const dataUrl = editorCanvas.toDataURL('image/png');
      await window.electronAPI.saveAnnotatedImage(editorCurrentImagePath, dataUrl, false);
      await window.electronAPI.copyImageToClipboard(editorCurrentImagePath);
      alert('Annotated image copied to clipboard!');
    }
  });

  // Editor Tools
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentColor = swatch.dataset.color;
    });
  });

  document.getElementById('strokeSizeInput').addEventListener('input', (e) => {
    currentStrokeSize = parseInt(e.target.value, 10);
  });

  // Context Menu
  const contextMenu = document.getElementById('contextMenu');
  document.addEventListener('click', hideContextMenu);
  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  document.getElementById('contextAnnotate').addEventListener('click', () => {
    const target = contextMenuTarget;
    hideContextMenu();
    if (target) openImageEditor(target);
  });
  document.getElementById('contextCopyImage').addEventListener('click', async () => {
    const target = contextMenuTarget;
    hideContextMenu();
    if (target) await window.electronAPI.copyImageToClipboard(target);
  });
  document.getElementById('contextOpenExplorer').addEventListener('click', async () => {
    const target = contextMenuTarget;
    hideContextMenu();
    if (target) await window.electronAPI.openInExplorer(target);
  });
  document.getElementById('contextDelete').addEventListener('click', async () => {
    const target = contextMenuTarget;
    hideContextMenu();
    if (target && confirm('Delete this screenshot permanently?')) {
      await deleteScreenshotWithUiCleanup(target);
    }
  });
}
