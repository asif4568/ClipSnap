const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to renderer processes (Main Window & HUD Popup)
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for new screenshot captured event
  onNewScreenshot: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, imagePath) => {
      callback(imagePath);
    });
  },

  // Listen for gallery data changes (e.g. moves, deletes, annotations)
  onGalleryUpdated: (callback) => {
    ipcRenderer.on('gallery-updated', () => {
      callback();
    });
  },

  // Listen for category updates
  onCategoriesUpdated: (callback) => {
    ipcRenderer.on('categories-updated', () => {
      callback();
    });
  },

  // Listen for popup image update (Popup window)
  onUpdatePopupImage: (callback) => {
    ipcRenderer.on('update-popup-image', (event, imagePath) => {
      callback(imagePath);
    });
  },

  // Listen for open image editor event (Main window)
  onOpenImageEditor: (callback) => {
    ipcRenderer.on('open-image-editor', (event, imagePath) => {
      callback(imagePath);
    });
  },

  // Move screenshot to category
  tagScreenshot: async (filePath, category) => {
    try {
      return await ipcRenderer.invoke('move-file', filePath, category);
    } catch (error) {
      console.error('Error tagging screenshot:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all gallery data
  getGalleryData: async () => {
    try {
      return await ipcRenderer.invoke('get-gallery-data');
    } catch (error) {
      console.error('Error fetching gallery data:', error);
      return {};
    }
  },

  // Delete a screenshot
  deleteScreenshot: async (filePath) => {
    try {
      return await ipcRenderer.invoke('delete-screenshot', filePath);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      return { success: false, error: error.message };
    }
  },

  // Start native drag operation
  startDrag: async (filePath) => {
    try {
      return await ipcRenderer.invoke('start-drag', filePath);
    } catch (error) {
      console.error('Error starting drag:', error);
      return { success: false, error: error.message };
    }
  },

  // Add category (supports { name, emoji } or string name)
  addCategory: async (categoryData) => {
    try {
      const payload = typeof categoryData === 'string' 
        ? { name: categoryData, emoji: '📁' } 
        : categoryData;
      return await ipcRenderer.invoke('add-category', payload);
    } catch (error) {
      console.error('Error adding category:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete category
  deleteCategory: async (categoryName) => {
    try {
      return await ipcRenderer.invoke('delete-category', categoryName);
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all categories with metadata
  getCategories: async () => {
    try {
      return await ipcRenderer.invoke('get-categories');
    } catch (error) {
      console.error('Error getting categories:', error);
      return { success: false, error: error.message };
    }
  },

  // Open in Explorer
  openInExplorer: async (filePath) => {
    try {
      return await ipcRenderer.invoke('open-in-explorer', filePath);
    } catch (error) {
      console.error('Error opening in explorer:', error);
      return { success: false, error: error.message };
    }
  },

  // Get App Settings
  getAppSettings: async () => {
    try {
      return await ipcRenderer.invoke('get-app-settings');
    } catch (error) {
      console.error('Error getting app settings:', error);
      return {};
    }
  },

  // Popup Window Controls: Pause auto-hide timer
  pausePopupTimer: async () => {
    try {
      return await ipcRenderer.invoke('pause-popup-timer');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Popup Window Controls: Resume auto-hide timer
  resumePopupTimer: async (durationMs) => {
    try {
      return await ipcRenderer.invoke('resume-popup-timer', durationMs);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Popup Window Controls: Set pinned state
  setPopupPin: async (isPinned) => {
    try {
      return await ipcRenderer.invoke('set-popup-pin', isPinned);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Popup Window Controls: Close popup
  closePopup: async () => {
    try {
      return await ipcRenderer.invoke('close-popup');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Open main window and edit image
  openEditorForFile: async (filePath) => {
    try {
      return await ipcRenderer.invoke('open-editor-for-file', filePath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Copy image to clipboard
  copyImageToClipboard: async (filePath) => {
    try {
      return await ipcRenderer.invoke('copy-image-to-clipboard', filePath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Save annotated image
  saveAnnotatedImage: async (filePath, dataUrl, saveAsCopy) => {
    try {
      return await ipcRenderer.invoke('save-annotated-image', { filePath, dataUrl, saveAsCopy });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Rename screenshot
  renameScreenshot: async (filePath, newName) => {
    try {
      return await ipcRenderer.invoke('rename-screenshot', { filePath, newName });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Batch operations
  batchMoveFiles: async (filePaths, targetCategory) => {
    try {
      return await ipcRenderer.invoke('batch-move-files', { filePaths, targetCategory });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  batchDeleteFiles: async (filePaths) => {
    try {
      return await ipcRenderer.invoke('batch-delete-files', { filePaths });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ---- Window Controls ----
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (event, isMax) => callback(isMax));
  },

  // ---- Storage Directory ----
  selectStorageDirectory: () => ipcRenderer.invoke('select-storage-directory'),
});
