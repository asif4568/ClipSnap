const { app, BrowserWindow, ipcMain, clipboard, screen, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

let mainWindow = null;
let popupWindow = null;
let popupImagePath = null;
let lastClipboardImageBuffer = null;
let autoHideTimer = null;
let isPopupPinned = false;

// Config file in userData
const configFilePath = path.join(app.getPath('userData'), 'clipsnap-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return {};
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

// Determine default base ClipSnap directory
function getClipSnapDirectory() {
  const cfg = loadConfig();
  if (cfg.storagePath && fs.existsSync(cfg.storagePath)) {
    return cfg.storagePath;
  }
  const oneDrivePictures = path.join(os.homedir(), 'OneDrive', 'Pictures');
  if (fs.existsSync(oneDrivePictures)) {
    return path.join(oneDrivePictures, 'ClipSnap');
  }
  return path.join(os.homedir(), 'Pictures', 'ClipSnap');
}

let clipsnapDir = getClipSnapDirectory();

function getCategoryMetaFile() {
  return path.join(clipsnapDir, '.categories.json');
}

function setCustomStorageDirectory(newDir) {
  if (!newDir) return;
  clipsnapDir = newDir;
  const cfg = loadConfig();
  cfg.storagePath = newDir;
  saveConfig(cfg);
  syncFoldersFromDisk();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('gallery-updated');
    mainWindow.webContents.send('categories-updated');
  }
}

// In-memory dynamic folder map: lower-case key -> absolute path
let folders = {};

function isSamePath(a, b) {
  if (!a || !b) return false;
  const left = path.resolve(a);
  const right = path.resolve(b);
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function closePopupIfShowingFile(filePath) {
  if (!isSamePath(filePath, popupImagePath)) return;

  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
    popupWindow = null;
  }
  popupImagePath = null;
  isPopupPinned = false;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

// Read/Save category metadata (names, emojis)
function getCategoriesMeta() {
  const defaults = {
    unsorted: { displayName: 'Unsorted', emoji: '📥' },
    study: { displayName: 'Study', emoji: '📚' },
    code: { displayName: 'Code', emoji: '💻' },
    bills: { displayName: 'Bills', emoji: '🧾' },
    personal: { displayName: 'Personal', emoji: '👤' }
  };

  try {
    const metaFile = getCategoryMetaFile();
    if (fs.existsSync(metaFile)) {
      const parsed = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      return { ...defaults, ...parsed };
    }
  } catch (err) {
    console.error('Error reading category metadata:', err);
  }
  return defaults;
}

function saveCategoriesMeta(meta) {
  try {
    const metaFile = getCategoryMetaFile();
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving category metadata:', err);
  }
}

// Dynamically synchronize all subdirectories in clipsnapDir
function syncFoldersFromDisk() {
  if (!fs.existsSync(clipsnapDir)) {
    fs.mkdirSync(clipsnapDir, { recursive: true });
    console.log(`Created ClipSnap root directory at: ${clipsnapDir}`);
  }

  // Ensure default subfolders always exist
  const defaultSubfolders = ['Unsorted', 'Study', 'Code', 'Bills', 'Personal'];
  defaultSubfolders.forEach(sub => {
    const p = path.join(clipsnapDir, sub);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(`Created default subfolder: ${p}`);
    }
  });

  // Scan and register every directory
  folders = {};
  const entries = fs.readdirSync(clipsnapDir, { withFileTypes: true });
  entries.forEach(entry => {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const key = entry.name.toLowerCase();
      folders[key] = path.join(clipsnapDir, entry.name);
    }
  });

  // Always ensure unsorted exists in map
  if (!folders.unsorted) {
    folders.unsorted = path.join(clipsnapDir, 'Unsorted');
  }
}

// Create the main gallery window (True blurred acrylic/vibrancy glass)
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    frame: false,           // Remove OS titlebar — we use a custom one
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'icon.svg'),
    transparent: true,
    backgroundColor: '#00000000',
    backgroundMaterial: 'acrylic', // Windows 11 Acrylic blur
    vibrancy: 'under-window', // macOS glass blur
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Notify renderer when maximize state changes
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', true);
    }
  });
  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create the floating HUD popup notification window
function createPopupWindow(imagePath) {
  popupImagePath = imagePath;

  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }

  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.show();
    popupWindow.webContents.send('update-popup-image', imagePath);
    resetAutoHideTimer();
    return;
  }

  popupWindow = new BrowserWindow({
    width: 400,
    height: 185,
    frame: false,
    alwaysOnTop: true,
    focusable: true,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    icon: path.join(__dirname, 'icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  popupWindow.loadFile('popup.html');

  // Position at bottom-right of primary screen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  popupWindow.setPosition(width - 420, height - 205);

  popupWindow.webContents.once('did-finish-load', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('update-popup-image', imagePath);
    }
  });

  resetAutoHideTimer();

  popupWindow.on('closed', () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
    popupWindow = null;
    popupImagePath = null;
    isPopupPinned = false;
  });
}

function resetAutoHideTimer(durationMs = 6000) {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }

  if (isPopupPinned) return;

  autoHideTimer = setTimeout(() => {
    if (popupWindow && !popupWindow.isDestroyed() && !isPopupPinned) {
      popupWindow.close();
      popupWindow = null;
    }
  }, durationMs);
}

// Poll clipboard for new screenshots every 1 second
function startClipboardWatcher() {
  setInterval(() => {
    try {
      const image = clipboard.readImage();
      if (image.isEmpty()) return;

      const imageBuffer = image.toPNG();
      const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');

      if (lastClipboardImageBuffer !== imageHash) {
        lastClipboardImageBuffer = imageHash;

        syncFoldersFromDisk();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `snap_${timestamp}.png`;
        const filepath = path.join(folders.unsorted, filename);

        fs.writeFileSync(filepath, imageBuffer);
        console.log(`Screenshot saved to Unsorted: ${filepath}`);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('screenshot-captured', filepath);
        }

        createPopupWindow(filepath);
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  }, 1000);
}

// ==========================================
// IPC HANDLERS
// ==========================================

ipcMain.handle('confirm-action', async (event, options = {}) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const result = await dialog.showMessageBox(ownerWindow, {
    type: options.type || 'warning',
    title: options.title || 'Confirm Action',
    message: options.message || 'Are you sure?',
    detail: options.detail || '',
    buttons: options.buttons || ['Confirm', 'Cancel'],
    defaultId: typeof options.defaultId === 'number' ? options.defaultId : 1,
    cancelId: typeof options.cancelId === 'number' ? options.cancelId : 1,
    noLink: true
  });

  focusMainWindow();
  return { confirmed: result.response === 0 };
});

// Move file to any category (default or custom)
ipcMain.handle('move-file', async (event, sourcePath, targetCategory) => {
  try {
    syncFoldersFromDisk();
    const key = (targetCategory || '').toLowerCase().trim();
    const targetDir = folders[key];

    if (!targetDir || !fs.existsSync(targetDir)) {
      return { success: false, error: `Category folder "${targetCategory}" does not exist` };
    }

    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file does not exist' };
    }

    const filename = path.basename(sourcePath);
    const targetPath = path.join(targetDir, filename);

    fs.renameSync(sourcePath, targetPath);
    if (isSamePath(sourcePath, popupImagePath)) {
      popupImagePath = targetPath;
    }
    console.log(`Moved: ${sourcePath} -> ${targetPath}`);

    // Notify all windows to refresh
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gallery-updated');
    }

    return { success: true, newPath: targetPath, category: key };
  } catch (error) {
    console.error('Error moving file:', error);
    return { success: false, error: error.message };
  }
});

// Get all images organized by category
ipcMain.handle('get-gallery-data', async () => {
  try {
    syncFoldersFromDisk();
    const galleryData = {};

    for (const [categoryKey, folderPath] of Object.entries(folders)) {
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(file => {
          return /\.(png|jpg|jpeg|gif|webp)$/i.test(file);
        });

        galleryData[categoryKey] = files.map(file => ({
          name: file,
          path: path.join(folderPath, file),
          category: categoryKey
        }));
      }
    }

    return galleryData;
  } catch (error) {
    console.error('Error reading gallery data:', error);
    return {};
  }
});

// Delete screenshot file
ipcMain.handle('delete-screenshot', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      closePopupIfShowingFile(filePath);
      console.log(`Deleted: ${filePath}`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('gallery-updated');
      }

      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});

// Native Drag-Out
ipcMain.handle('start-drag', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    event.sender.startDrag({
      files: [filePath],
      icon: path.join(__dirname, 'icon.svg')
    });
    return { success: true };
  } catch (error) {
    console.error('Error starting drag:', error);
    return { success: false, error: error.message };
  }
});

// Open file or storage directory in Explorer / Finder
ipcMain.handle('open-in-explorer', async (event, filePath) => {
  try {
    const target = filePath && fs.existsSync(filePath) ? filePath : clipsnapDir;
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      shell.showItemInFolder(filePath);
    } else {
      const normalizedPath = path.normalize(target);
      const res = await shell.openPath(normalizedPath);
      if (res && process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`explorer.exe "${normalizedPath}"`);
      }
    }
    return { success: true, path: target };
  } catch (error) {
    console.error('Error opening in explorer:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler: Get app info & storage path for settings
ipcMain.handle('get-app-settings', async () => {
  return {
    storagePath: clipsnapDir,
    version: '1.0.0',
    platform: process.platform
  };
});

// Add new category with emoji and persistent metadata
ipcMain.handle('add-category', async (event, { name, emoji }) => {
  try {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    const key = cleanName.toLowerCase();
    const folderName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const categoryPath = path.join(clipsnapDir, folderName);

    if (fs.existsSync(categoryPath)) {
      // If folder already exists on disk, ensure it's in folders
      syncFoldersFromDisk();
      return { success: true, categoryName: key, displayName: folderName, emoji: emoji || '📁' };
    }

    fs.mkdirSync(categoryPath, { recursive: true });
    syncFoldersFromDisk();

    // Persist emoji metadata
    const meta = getCategoriesMeta();
    meta[key] = {
      displayName: folderName,
      emoji: emoji || '📁'
    };
    saveCategoriesMeta(meta);

    console.log(`Created new category: ${folderName} (${key}) with emoji ${emoji || '📁'}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('categories-updated');
    }
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('categories-updated');
    }

    return { success: true, categoryName: key, displayName: folderName, emoji: emoji || '📁' };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, error: error.message };
  }
});

// Delete category (must be empty)
ipcMain.handle('delete-category', async (event, categoryName) => {
  try {
    syncFoldersFromDisk();
    const key = (categoryName || '').toLowerCase().trim();

    if (key === 'unsorted') {
      return { success: false, error: 'Cannot delete default Unsorted category' };
    }

    if (!folders[key]) {
      return { success: false, error: 'Category not found' };
    }

    const categoryPath = folders[key];
    const files = fs.readdirSync(categoryPath);

    if (files.length > 0) {
      return { success: false, error: `Category must be empty before deleting (${files.length} images remaining)` };
    }

    fs.rmdirSync(categoryPath);
    delete folders[key];

    // Remove from metadata
    const meta = getCategoriesMeta();
    delete meta[key];
    saveCategoriesMeta(meta);

    console.log(`Deleted category: ${categoryPath}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('categories-updated');
    }
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('categories-updated');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }
});

// Get all categories with metadata
ipcMain.handle('get-categories', async () => {
  try {
    syncFoldersFromDisk();
    const meta = getCategoriesMeta();

    const categoryList = Object.keys(folders)
      .filter(k => k !== 'unsorted')
      .map(k => {
        const folderName = path.basename(folders[k]);
        return {
          id: k,
          name: k,
          displayName: (meta[k] && meta[k].displayName) || folderName,
          emoji: (meta[k] && meta[k].emoji) || '📁',
          path: folders[k]
        };
      });

    return { success: true, categories: categoryList, meta };
  } catch (error) {
    console.error('Error getting categories:', error);
    return { success: false, error: error.message };
  }
});

// Popup controls
ipcMain.handle('pause-popup-timer', async () => {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
  return { success: true };
});

ipcMain.handle('resume-popup-timer', async (event, durationMs = 5000) => {
  resetAutoHideTimer(durationMs);
  return { success: true };
});

ipcMain.handle('set-popup-pin', async (event, pinned) => {
  isPopupPinned = !!pinned;
  if (isPopupPinned && autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  } else if (!isPopupPinned) {
    resetAutoHideTimer(4000);
  }
  return { success: true, isPinned: isPopupPinned };
});

ipcMain.handle('close-popup', async () => {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
    popupWindow = null;
  }
  return { success: true };
});

// Open main window and edit image
ipcMain.handle('open-editor-for-file', async (event, filePath) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }

    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
      popupWindow = null;
    }

    mainWindow.webContents.send('open-image-editor', filePath);
    return { success: true };
  } catch (error) {
    console.error('Error opening editor:', error);
    return { success: false, error: error.message };
  }
});

// Copy image to clipboard
ipcMain.handle('copy-image-to-clipboard', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const img = nativeImage.createFromPath(filePath);
    clipboard.writeImage(img);
    return { success: true };
  } catch (error) {
    console.error('Error copying image to clipboard:', error);
    return { success: false, error: error.message };
  }
});

// Save annotated image
ipcMain.handle('save-annotated-image', async (event, { filePath, dataUrl, saveAsCopy }) => {
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    let targetPath = filePath;
    if (saveAsCopy) {
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const dir = path.dirname(filePath);
      targetPath = path.join(dir, `${base}_edited_${Date.now().toString().slice(-4)}${ext}`);
    }

    fs.writeFileSync(targetPath, buffer);
    console.log(`Saved annotated image: ${targetPath}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gallery-updated');
    }

    return { success: true, targetPath };
  } catch (error) {
    console.error('Error saving annotated image:', error);
    return { success: false, error: error.message };
  }
});

// Rename screenshot
ipcMain.handle('rename-screenshot', async (event, { filePath, newName }) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    let sanitized = newName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!sanitized.endsWith(ext)) {
      sanitized += ext;
    }

    const newPath = path.join(dir, sanitized);
    if (fs.existsSync(newPath) && newPath.toLowerCase() !== filePath.toLowerCase()) {
      return { success: false, error: 'A file with this name already exists' };
    }

    fs.renameSync(filePath, newPath);
    if (isSamePath(filePath, popupImagePath)) {
      popupImagePath = newPath;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gallery-updated');
    }

    return { success: true, newPath, newName: sanitized };
  } catch (error) {
    console.error('Error renaming screenshot:', error);
    return { success: false, error: error.message };
  }
});

// Batch move files
ipcMain.handle('batch-move-files', async (event, { filePaths, targetCategory }) => {
  try {
    syncFoldersFromDisk();
    const key = (targetCategory || '').toLowerCase().trim();
    const targetDir = folders[key];

    if (!targetDir || !fs.existsSync(targetDir)) {
      return { success: false, error: `Target category "${targetCategory}" not found` };
    }

    const moved = [];
    for (const src of filePaths) {
      if (fs.existsSync(src)) {
        const fname = path.basename(src);
        const dest = path.join(targetDir, fname);
        fs.renameSync(src, dest);
        if (isSamePath(src, popupImagePath)) {
          popupImagePath = dest;
        }
        moved.push({ from: src, to: dest });
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gallery-updated');
    }

    return { success: true, count: moved.length, moved };
  } catch (error) {
    console.error('Error batch moving files:', error);
    return { success: false, error: error.message };
  }
});

// Batch delete files
ipcMain.handle('batch-delete-files', async (event, { filePaths }) => {
  try {
    let count = 0;
    for (const src of filePaths) {
      if (fs.existsSync(src)) {
        fs.unlinkSync(src);
        closePopupIfShowingFile(src);
        count++;
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gallery-updated');
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error batch deleting files:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// WINDOW CONTROL IPC HANDLERS
// ==========================================

ipcMain.handle('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Select custom storage directory via native folder picker
ipcMain.handle('select-storage-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Screenshot Storage Folder',
      defaultPath: clipsnapDir,
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    const selectedPath = result.filePaths[0];
    setCustomStorageDirectory(selectedPath);
    return { success: true, path: selectedPath };
  } catch (err) {
    console.error('Error selecting storage directory:', err);
    return { success: false, error: err.message };
  }
});

// App lifecycle
app.on('ready', () => {
  syncFoldersFromDisk();
  createMainWindow();
  startClipboardWatcher();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
