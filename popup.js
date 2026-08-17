// ClipSnap — Modern Glassmorphic HUD Popup Controller

let currentImagePath = null;
let isPinned = false;
let progressInterval = null;
let progressStartTime = Date.now();
const AUTO_HIDE_MS = 6000;

const hudCard = document.getElementById('hudCard');
const progressBar = document.getElementById('progressBar');
const previewImg = document.getElementById('popupPreview');
const thumbBox = document.getElementById('thumbBox');
const snapNameInput = document.getElementById('snapNameInput');
const pinBtn = document.getElementById('pinBtn');
const closeBtn = document.getElementById('closeBtn');
const editBtn = document.getElementById('editBtn');
const copyBtn = document.getElementById('copyBtn');
const revealBtn = document.getElementById('revealBtn');
const tagsCarousel = document.getElementById('tagsCarousel');
const toastBanner = document.getElementById('toastBanner');
const toastText = document.getElementById('toastText');

// Colors for category pills
const tagColorStyles = {
  study: 'background: rgba(105, 64, 165, 0.3); color: #d1b3ff; border-color: rgba(209, 179, 255, 0.3);',
  code: 'background: rgba(0, 120, 223, 0.3); color: #89c8ff; border-color: rgba(137, 200, 255, 0.3);',
  bills: 'background: rgba(233, 168, 0, 0.3); color: #ffe279; border-color: rgba(255, 226, 121, 0.3);',
  personal: 'background: rgba(0, 135, 107, 0.3); color: #7ce3b6; border-color: rgba(124, 227, 182, 0.3);',
  unsorted: 'background: rgba(227, 226, 224, 0.2); color: #d3d1cb; border-color: rgba(211, 209, 203, 0.3);'
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadPopupCategories();

  if (window.electronAPI.onCategoriesUpdated) {
    window.electronAPI.onCategoriesUpdated(() => {
      loadPopupCategories();
    });
  }
});

async function loadPopupCategories() {
  try {
    const res = await window.electronAPI.getCategories();
    const categories = res && res.categories ? res.categories : [
      { id: 'study', displayName: 'Study', emoji: '📚' },
      { id: 'code', displayName: 'Code', emoji: '💻' },
      { id: 'bills', displayName: 'Bills', emoji: '🧾' },
      { id: 'personal', displayName: 'Personal', emoji: '👤' }
    ];

    renderTagPills(categories);
  } catch (err) {
    console.error('Error loading popup categories:', err);
  }
}

function renderTagPills(categories) {
  tagsCarousel.innerHTML = '';

  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'tag-pill';
    pill.dataset.category = cat.id;

    const customStyle = tagColorStyles[cat.id.toLowerCase()] || 'background: rgba(255, 255, 255, 0.1); color: #fff; border-color: rgba(255, 255, 255, 0.2);';
    pill.style.cssText = customStyle;

    pill.innerHTML = `<span>${cat.emoji || '📁'}</span> <span>${cat.displayName}</span>`;

    pill.addEventListener('click', async () => {
      await handleTagMove(cat.id, cat.displayName);
    });

    tagsCarousel.appendChild(pill);
  });
}

async function handleTagMove(categoryId, displayName) {
  if (!currentImagePath) return;

  pauseProgress();

  // If user edited name, rename before moving
  const newName = snapNameInput.value.trim();
  if (newName) {
    const renameRes = await window.electronAPI.renameScreenshot(currentImagePath, newName);
    if (renameRes && renameRes.success) {
      currentImagePath = renameRes.newPath;
    }
  }

  const result = await window.electronAPI.tagScreenshot(currentImagePath, categoryId);
  if (result && result.success) {
    currentImagePath = result.newPath || currentImagePath;
    await showToast(`✓ Moved to ${displayName}`);
    if (!isPinned) {
      await window.electronAPI.closePopup();
    }
  } else {
    await showToast(`Error: ${result ? result.error : 'Failed to move'}`);
  }
}

function startProgressBar() {
  if (isPinned) {
    if (progressBar) progressBar.style.width = '0%';
    return;
  }

  clearInterval(progressInterval);
  progressStartTime = Date.now();

  progressInterval = setInterval(() => {
    if (isPinned) {
      clearInterval(progressInterval);
      progressBar.style.width = '0%';
      return;
    }
    const elapsed = Date.now() - progressStartTime;
    const remainingRatio = Math.max(0, 1 - (elapsed / AUTO_HIDE_MS));
    progressBar.style.width = `${remainingRatio * 100}%`;
    if (remainingRatio <= 0) {
      clearInterval(progressInterval);
    }
  }, 50);
}

function pauseProgress() {
  clearInterval(progressInterval);
}

function showToast(message, duration = 1200) {
  toastText.textContent = message;
  toastBanner.classList.add('show');
  return new Promise(resolve => setTimeout(() => {
    toastBanner.classList.remove('show');
    resolve();
  }, duration));
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

// Receive new image update
window.electronAPI.onUpdatePopupImage((imagePath) => {
  currentImagePath = imagePath;
  previewImg.src = toFileUrl(imagePath);

  const filename = imagePath.split(/[\\/]/).pop();
  snapNameInput.value = filename || 'snap_captured.png';

  startProgressBar();
});

// Native Drag from Popup
thumbBox.addEventListener('dragstart', (e) => {
  if (currentImagePath) {
    window.electronAPI.startDrag(currentImagePath);
  }
});

// Hover Pause
hudCard.addEventListener('mouseenter', async () => {
  pauseProgress();
  await window.electronAPI.pausePopupTimer();
});

// Focus on Input Pauses
snapNameInput.addEventListener('focus', async () => {
  pauseProgress();
  await window.electronAPI.pausePopupTimer();
});

// Leave Resume
hudCard.addEventListener('mouseleave', async () => {
  if (!isPinned && document.activeElement !== snapNameInput) {
    progressStartTime = Date.now();
    startProgressBar();
    await window.electronAPI.resumePopupTimer(5000);
  }
});

// Pin Button
pinBtn.addEventListener('click', async () => {
  isPinned = !isPinned;
  pinBtn.classList.toggle('active', isPinned);
  pinBtn.title = isPinned ? 'Unpin popup' : 'Pin window (keeps open)';

  if (isPinned) {
    pauseProgress();
    progressBar.style.width = '0%';
    await window.electronAPI.setPopupPin(true);
  } else {
    await window.electronAPI.setPopupPin(false);
    startProgressBar();
  }
});

// Close Button
closeBtn.addEventListener('click', async () => {
  await window.electronAPI.closePopup();
});

// Edit & Annotate
async function triggerEdit() {
  if (currentImagePath) {
    // If user edited name, save rename first
    const newName = snapNameInput.value.trim();
    if (newName) {
      const renameRes = await window.electronAPI.renameScreenshot(currentImagePath, newName);
      if (renameRes && renameRes.success) {
        currentImagePath = renameRes.newPath;
      }
    }
    await window.electronAPI.openEditorForFile(currentImagePath);
  }
}

editBtn.addEventListener('click', triggerEdit);

// Copy Image
copyBtn.addEventListener('click', async () => {
  if (currentImagePath) {
    const res = await window.electronAPI.copyImageToClipboard(currentImagePath);
    if (res && res.success) {
      await showToast('✓ Copied Image to Clipboard!');
      if (!isPinned) {
        await window.electronAPI.closePopup();
      }
    }
  }
});

// Reveal in Folder
revealBtn.addEventListener('click', async () => {
  if (currentImagePath) {
    await window.electronAPI.openInExplorer(currentImagePath);
  }
});
