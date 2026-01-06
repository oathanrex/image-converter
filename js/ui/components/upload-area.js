/**
 * Upload Area Component
 * Drag & drop and file selection
 * @author Oathan Rex
 */

import { logger } from '../../utils/logger.js';
import { FILE_LIMITS } from '../../config/constants.js';

export class UploadArea {
    /**
     * @param {HTMLElement} element - Container element
     * @param {Object} options - Configuration options
     */
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            onFilesSelected: options.onFilesSelected || (() => { }),
            multiple: options.multiple !== false,
            accept: options.accept || FILE_LIMITS.SUPPORTED_INPUT.join(','),
            maxFiles: options.maxFiles || FILE_LIMITS.MAX_FILE_COUNT
        };

        this.fileInput = null;
        this.isDragging = false;
        this.dragCounter = 0;  // Handle nested drag events

        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.createFileInput();
        this.bindEvents();
        this.render();
        logger.debug('UploadArea initialized');
    }

    /**
     * Create hidden file input
     */
    createFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = this.options.multiple;
        this.fileInput.accept = this.options.accept;
        this.fileInput.style.display = 'none';
        this.fileInput.id = 'upload-file-input';
        this.element.appendChild(this.fileInput);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Click to upload
        this.element.addEventListener('click', (e) => {
            if (e.target === this.fileInput) return;
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.fileInput.value = '';  // Reset for same file selection
        });

        // Drag events
        this.element.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.element.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.element.addEventListener('drop', (e) => this.handleDrop(e));

        // Keyboard accessibility
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.fileInput.click();
            }
        });
    }

    /**
     * Render upload area content
     */
    render() {
        // Add accessibility attributes
        this.element.setAttribute('role', 'button');
        this.element.setAttribute('tabindex', '0');
        this.element.setAttribute('aria-label', 'Upload images. Click or drag and drop files here.');

        // Add upload class
        this.element.classList.add('upload-area');
    }

    /**
     * Handle drag enter
     * @param {DragEvent} e 
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter++;

        if (this.hasImageFiles(e.dataTransfer)) {
            this.element.classList.add('dragover');
            this.isDragging = true;
        }
    }

    /**
     * Handle drag over
     * @param {DragEvent} e 
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.hasImageFiles(e.dataTransfer)) {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    /**
     * Handle drag leave
     * @param {DragEvent} e 
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter--;

        if (this.dragCounter === 0) {
            this.element.classList.remove('dragover');
            this.isDragging = false;
        }
    }

    /**
     * Handle drop
     * @param {DragEvent} e 
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter = 0;
        this.element.classList.remove('dragover');
        this.isDragging = false;

        const files = this.extractFiles(e.dataTransfer);

        if (files.length > 0) {
            this.handleFiles(files);
        } else {
            logger.warn('No valid image files in drop');
        }
    }

    /**
     * Check if data transfer contains image files
     * @param {DataTransfer} dataTransfer 
     * @returns {boolean}
     */
    hasImageFiles(dataTransfer) {
        if (!dataTransfer || !dataTransfer.types) {
            return false;
        }

        // Check for files
        if (dataTransfer.types.includes('Files')) {
            // Can't check actual file types until drop
            return true;
        }

        return false;
    }

    /**
     * Extract image files from data transfer
     * @param {DataTransfer} dataTransfer 
     * @returns {File[]}
     */
    extractFiles(dataTransfer) {
        const files = [];

        if (dataTransfer.items) {
            // Use DataTransferItemList interface
            for (const item of dataTransfer.items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file && this.isValidFile(file)) {
                        files.push(file);
                    }
                }
            }
        } else if (dataTransfer.files) {
            // Fallback to FileList
            for (const file of dataTransfer.files) {
                if (this.isValidFile(file)) {
                    files.push(file);
                }
            }
        }

        return files.slice(0, this.options.maxFiles);
    }

    /**
     * Check if file is valid image
     * @param {File} file 
     * @returns {boolean}
     */
    isValidFile(file) {
        if (!file || !file.type) {
            return false;
        }

        return file.type.startsWith('image/') ||
            FILE_LIMITS.SUPPORTED_INPUT.includes(file.type);
    }

    /**
     * Handle selected files
     * @param {FileList|File[]} files 
     */
    handleFiles(files) {
        const fileArray = Array.from(files).filter(f => this.isValidFile(f));

        if (fileArray.length > 0) {
            logger.info(`Files selected: ${fileArray.length}`);
            this.options.onFilesSelected(fileArray);
        }
    }

    /**
     * Programmatically trigger file selection
     */
    openFileDialog() {
        this.fileInput.click();
    }

    /**
     * Enable/disable upload area
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.element.classList.toggle('disabled', !enabled);
        this.fileInput.disabled = !enabled;
        this.element.setAttribute('aria-disabled', !enabled);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
    }
}