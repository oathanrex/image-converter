/**
 * UI Manager
 * Coordinates all UI components and state synchronization
 * @author Oathan Rex
 */

import { store, actions } from '../state/store.js';
import { logger } from '../utils/logger.js';
import { escapeHtml } from '../utils/sanitize.js';
import { UploadArea } from './components/upload-area.js';
import { PreviewGrid } from './components/preview-grid.js';
import { toast } from './components/toast.js';
import { UI_MESSAGES, FILE_LIMITS, QUALITY_SETTINGS } from '../config/constants.js';

// Import services
import { addFiles, convertAll, removeImage, clearAll } from '../services/image-service.js';
import { downloadById, downloadAllAsZip, getDownloadStats } from '../services/download-service.js';
import { ImageConverter } from '../core/converter.js';

export class UIManager {
    constructor() {
        this.components = {};
        this.elements = {};
        this.unsubscribe = null;

        this.init();
    }

    /**
     * Initialize UI
     */
    async init() {
        logger.time('ui-init');

        // Cache DOM elements
        this.cacheElements();

        // Initialize components
        this.initComponents();

        // Bind events
        this.bindEvents();

        // Subscribe to state changes
        this.unsubscribe = store.subscribe((state) => this.onStateChange(state));

        // Load saved theme
        this.loadTheme();

        // Initial render
        this.render(store.getState());

        logger.timeEnd('ui-init');
        logger.info('UI Manager initialized');
    }

    /**
     * Cache frequently accessed DOM elements
     */
    cacheElements() {
        this.elements = {
            // Sections
            settingsPanel: document.getElementById('settingsPanel'),
            previewSection: document.getElementById('previewSection'),
            progressSection: document.getElementById('progressSection'),
            downloadSection: document.getElementById('downloadSection'),

            // Upload
            uploadArea: document.getElementById('uploadArea'),

            // Preview
            previewGrid: document.getElementById('previewGrid'),
            imageCount: document.getElementById('imageCount'),

            // Progress
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),

            // Download
            downloadGrid: document.getElementById('downloadGrid'),

            // Settings
            qualitySlider: document.getElementById('qualitySlider'),
            qualityValue: document.getElementById('qualityValue'),
            widthInput: document.getElementById('widthInput'),
            heightInput: document.getElementById('heightInput'),
            linkDimensions: document.getElementById('linkDimensions'),
            removeExif: document.getElementById('removeExif'),
            preserveTransparency: document.getElementById('preserveTransparency'),

            // Buttons
            convertAll: document.getElementById('convertAll'),
            clearAll: document.getElementById('clearAll'),
            downloadAllZip: document.getElementById('downloadAllZip'),
            themeToggle: document.getElementById('themeToggle'),

            // Format buttons
            formatButtons: document.querySelectorAll('.format-btn'),

            // Preset buttons
            presetButtons: document.querySelectorAll('.preset-btn')
        };
    }

    /**
     * Initialize UI components
     */
    initComponents() {
        // Upload area
        this.components.uploadArea = new UploadArea(this.elements.uploadArea, {
            onFilesSelected: async (files) => {
                const result = await addFiles(files);

                if (result.added > 0) {
                    toast.success(`Added ${result.added} image${result.added > 1 ? 's' : ''}`);
                }

                if (result.rejected > 0) {
                    toast.warning(`${result.rejected} file${result.rejected > 1 ? 's' : ''} rejected`);
                    result.errors.forEach(err => logger.warn(err));
                }
            }
        });

        // Preview grid
        this.components.previewGrid = new PreviewGrid(this.elements.previewGrid, {
            onRemove: (id) => {
                removeImage(id);
                toast.info('Image removed');
            }
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Format selection
        this.elements.formatButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFormatSelect(e.currentTarget.dataset.format);
            });
        });

        // Quality slider
        this.elements.qualitySlider.addEventListener('input', (e) => {
            const quality = parseInt(e.target.value, 10) / 100;
            this.elements.qualityValue.textContent = `${e.target.value}%`;
            actions.updateSettings({ quality });

            // Show warning for PNG
            const state = store.getState();
            if (state.settings.format === 'png') {
                toast.info(UI_MESSAGES.INFO_QUALITY_PNG, { duration: 2000 });
            }
        });

        // Dimension inputs with debouncing
        let dimensionTimeout;
        const handleDimensionChange = () => {
            clearTimeout(dimensionTimeout);
            dimensionTimeout = setTimeout(() => {
                const width = this.elements.widthInput.value
                    ? parseInt(this.elements.widthInput.value, 10)
                    : null;
                const height = this.elements.heightInput.value
                    ? parseInt(this.elements.heightInput.value, 10)
                    : null;

                // Validate
                if (width !== null && (isNaN(width) || width < 1 || width > FILE_LIMITS.MAX_DIMENSION)) {
                    toast.error(UI_MESSAGES.ERROR_DIMENSION_TOO_LARGE);
                    return;
                }
                if (height !== null && (isNaN(height) || height < 1 || height > FILE_LIMITS.MAX_DIMENSION)) {
                    toast.error(UI_MESSAGES.ERROR_DIMENSION_TOO_LARGE);
                    return;
                }

                actions.updateSettings({ width, height });
            }, 300);
        };

        this.elements.widthInput.addEventListener('input', handleDimensionChange);
        this.elements.heightInput.addEventListener('input', handleDimensionChange);

        // Aspect ratio lock
        this.elements.linkDimensions.addEventListener('click', () => {
            const state = store.getState();
            const newValue = !state.settings.maintainAspectRatio;
            actions.updateSettings({ maintainAspectRatio: newValue });

            this.elements.linkDimensions.classList.toggle('active', newValue);
            const icon = this.elements.linkDimensions.querySelector('i');
            icon.className = newValue ? 'fas fa-link' : 'fas fa-unlink';
        });

        // Preset sizes
        this.elements.presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const width = parseInt(e.currentTarget.dataset.width, 10);
                const height = parseInt(e.currentTarget.dataset.height, 10);

                this.elements.widthInput.value = width;
                this.elements.heightInput.value = height;
                actions.updateSettings({ width, height });
            });
        });

        // Options checkboxes
        this.elements.removeExif?.addEventListener('change', (e) => {
            actions.updateSettings({ removeExif: e.target.checked });
        });

        this.elements.preserveTransparency?.addEventListener('change', (e) => {
            actions.updateSettings({ preserveTransparency: e.target.checked });
        });

        // Convert all button
        this.elements.convertAll.addEventListener('click', async () => {
            const state = store.getState();

            if (state.images.length === 0) {
                toast.error(UI_MESSAGES.ERROR_NO_FILES);
                return;
            }

            if (state.isProcessing) {
                toast.warning('Already processing');
                return;
            }

            const result = await convertAll();

            if (result.success > 0) {
                toast.success(UI_MESSAGES.SUCCESS_CONVERTED(result.success));
            }

            if (result.failed > 0) {
                toast.error(`${result.failed} conversion${result.failed > 1 ? 's' : ''} failed`);
            }
        });

        // Clear all button
        this.elements.clearAll.addEventListener('click', () => {
            clearAll();
            this.components.previewGrid.clear();
            toast.info(UI_MESSAGES.SUCCESS_CLEARED);
        });

        // Download all as ZIP
        this.elements.downloadAllZip.addEventListener('click', async () => {
            const result = await downloadAllAsZip();

            if (result.success) {
                toast.success(UI_MESSAGES.SUCCESS_ZIP_CREATED(result.fileCount));
            } else {
                toast.error(result.error);
            }
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    /**
     * Handle format selection
     * @param {string} format 
     */
    handleFormatSelect(format) {
        // Update UI
        this.elements.formatButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });

        // Update state
        actions.updateSettings({ format });

        // Update transparency option visibility
        const supportsTransparency = ImageConverter.supportsTransparency(format);
        if (this.elements.preserveTransparency) {
            this.elements.preserveTransparency.closest('.checkbox-label').style.opacity =
                supportsTransparency ? '1' : '0.5';
        }

        // Show info for PNG quality
        if (format === 'png') {
            toast.info(UI_MESSAGES.INFO_QUALITY_PNG, { duration: 3000 });
        }
    }

    /**
     * Handle state changes
     * @param {Object} state - New state
     */
    onStateChange(state) {
        this.render(state);
    }

    /**
     * Render UI based on state
     * @param {Object} state 
     */
    render(state) {
        // Update section visibility
        const hasImages = state.images.length > 0;
        const hasCompleted = state.images.some(img => img.status === 'completed');

        this.elements.settingsPanel.classList.toggle('active', hasImages);
        this.elements.previewSection.classList.toggle('active', hasImages);
        this.elements.progressSection.classList.toggle('active', state.isProcessing);
        this.elements.downloadSection.classList.toggle('active', hasCompleted && !state.isProcessing);

        // Update image count
        this.elements.imageCount.textContent = state.images.length;

        // Update progress
        if (state.isProcessing) {
            this.elements.progressFill.style.width = `${state.progress}%`;
            this.elements.progressText.textContent =
                UI_MESSAGES.INFO_PROCESSING(state.currentIndex + 1, state.images.length);
        }

        // Sync preview grid
        this.syncPreviewGrid(state.images);

        // Sync download grid
        if (hasCompleted) {
            this.renderDownloadGrid(state.images.filter(img => img.status === 'completed'));
        }

        // Disable buttons during processing
        this.elements.convertAll.disabled = state.isProcessing;
        this.elements.clearAll.disabled = state.isProcessing;
    }

    /**
     * Sync preview grid with state
     * @param {Array} images 
     */
    syncPreviewGrid(images) {
        const grid = this.components.previewGrid;
        const existingIds = new Set(grid.items.keys());
        const stateIds = new Set(images.map(img => img.id));

        // Add new images
        for (const image of images) {
            if (!existingIds.has(image.id)) {
                grid.addItem(image);
            } else {
                // Update status
                grid.updateStatus(image.id, image.status);
            }
        }

        // Remove deleted images
        for (const id of existingIds) {
            if (!stateIds.has(id)) {
                grid.removeItem(id);
            }
        }
    }

    /**
     * Render download grid
     * @param {Array} completedImages 
     */
    renderDownloadGrid(completedImages) {
        const state = store.getState();

        this.elements.downloadGrid.innerHTML = completedImages.map(img => {
            const savings = this.calculateSavings(img.size, img.convertedSize);
            const extension = ImageConverter.getExtension(state.settings.format);
            const newName = img.name.replace(/\.[^/.]+$/, '') + extension;

            return `
                <div class="download-item" data-id="${escapeHtml(img.id)}">
                    <div class="download-image-container">
                        <img src="${escapeHtml(img.convertedUrl)}" alt="${escapeHtml(newName)}" loading="lazy">
                    </div>
                    <div class="download-info">
                        <h5 title="${escapeHtml(newName)}">${escapeHtml(newName)}</h5>
                        <div class="size-info">
                            <span>${this.formatSize(img.convertedSize)}</span>
                            ${savings > 0
                    ? `<span class="size-saved">-${savings}%</span>`
                    : savings < 0
                        ? `<span class="size-increased">+${Math.abs(savings)}%</span>`
                        : ''
                }
                        </div>
                        <button class="btn btn-primary download-single-btn" data-id="${escapeHtml(img.id)}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind download buttons
        this.elements.downloadGrid.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (downloadById(id)) {
                    toast.success(UI_MESSAGES.SUCCESS_DOWNLOAD_STARTED);
                }
            });
        });
    }

    /**
     * Calculate size savings percentage
     * @param {number} original 
     * @param {number} converted 
     * @returns {number}
     */
    calculateSavings(original, converted) {
        if (original === 0) return 0;
        return Math.round(((original - converted) / original) * 100);
    }

    /**
     * Format file size
     * @param {number} bytes 
     * @returns {string}
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        actions.setTheme(newTheme);

        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        logger.debug(`Theme changed to: ${newTheme}`);
    }

    /**
     * Load saved theme
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        actions.setTheme(savedTheme);

        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
    }
}