/**
 * Preview Grid Component
 * Displays image thumbnails with actions
 * @author Oathan Rex
 */

import { escapeHtml, createElement } from '../../utils/sanitize.js';
import { logger } from '../../utils/logger.js';

export class PreviewGrid {
    /**
     * @param {HTMLElement} element - Container element
     * @param {Object} options - Configuration options
     */
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            onRemove: options.onRemove || (() => { }),
            onItemClick: options.onItemClick || (() => { }),
            emptyMessage: options.emptyMessage || 'No images added yet',
            showStatus: options.showStatus !== false
        };

        this.items = new Map();  // id -> element
        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.element.classList.add('preview-grid');
        this.element.setAttribute('role', 'list');
        this.element.setAttribute('aria-label', 'Image preview list');
        this.renderEmpty();
        logger.debug('PreviewGrid initialized');
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        if (this.items.size === 0) {
            this.element.innerHTML = `
                <div class="preview-empty">
                    <i class="fas fa-images"></i>
                    <p>${escapeHtml(this.options.emptyMessage)}</p>
                </div>
            `;
        }
    }

    /**
     * Add item to grid
     * @param {Object} imageData - Image data object
     */
    addItem(imageData) {
        // Remove empty state if present
        const emptyEl = this.element.querySelector('.preview-empty');
        if (emptyEl) {
            emptyEl.remove();
        }

        const item = this.createItemElement(imageData);
        this.element.appendChild(item);
        this.items.set(imageData.id, item);

        // Animate in
        requestAnimationFrame(() => {
            item.classList.add('show');
        });
    }

    /**
     * Create preview item element
     * @param {Object} data - Image data
     * @returns {HTMLElement}
     */
    createItemElement(data) {
        const item = createElement('div', {
            class: 'preview-item',
            data: { id: data.id }
        });
        item.setAttribute('role', 'listitem');

        // Image container
        const imageContainer = createElement('div', { class: 'preview-image-container' });

        // Image
        const img = createElement('img');
        img.src = data.previewUrl;
        img.alt = escapeHtml(data.name);
        img.loading = 'lazy';
        img.addEventListener('error', () => {
            img.src = 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                    <rect fill="#f0f0f0" width="100" height="100"/>
                    <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Error</text>
                </svg>
            `);
        });
        imageContainer.appendChild(img);

        // Status overlay
        if (this.options.showStatus) {
            const statusOverlay = createElement('div', { class: 'preview-status' });
            statusOverlay.innerHTML = this.getStatusHtml(data.status);
            imageContainer.appendChild(statusOverlay);
        }

        // Remove button
        const removeBtn = createElement('button', {
            class: 'remove-btn',
            'aria-label': `Remove ${escapeHtml(data.name)}`
        });
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeItem(data.id);
            this.options.onRemove(data.id);
        });
        imageContainer.appendChild(removeBtn);

        item.appendChild(imageContainer);

        // Info section
        const info = createElement('div', { class: 'preview-info' });

        const title = createElement('h5');
        title.textContent = data.name;
        title.title = data.name;
        info.appendChild(title);

        const meta = createElement('p');
        meta.textContent = `${data.width}×${data.height} • ${this.formatSize(data.size)}`;
        info.appendChild(meta);

        item.appendChild(info);

        // Click handler
        item.addEventListener('click', () => {
            this.options.onItemClick(data.id);
        });

        return item;
    }

    /**
     * Get status indicator HTML
     * @param {string} status 
     * @returns {string}
     */
    getStatusHtml(status) {
        const statusMap = {
            pending: '<i class="fas fa-clock"></i>',
            processing: '<div class="spinner"></div>',
            completed: '<i class="fas fa-check" style="color: var(--success);"></i>',
            error: '<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>'
        };
        return statusMap[status] || '';
    }

    /**
     * Update item status
     * @param {string} id - Item ID
     * @param {string} status - New status
     */
    updateStatus(id, status) {
        const item = this.items.get(id);
        if (!item) return;

        // Update class
        item.classList.remove('pending', 'processing', 'completed', 'error');
        item.classList.add(status);

        // Update status overlay
        const statusEl = item.querySelector('.preview-status');
        if (statusEl) {
            statusEl.innerHTML = this.getStatusHtml(status);
        }
    }

    /**
     * Remove item from grid
     * @param {string} id - Item ID
     */
    removeItem(id) {
        const item = this.items.get(id);
        if (!item) return;

        item.classList.add('removing');

        item.addEventListener('animationend', () => {
            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
            this.items.delete(id);

            // Show empty state if no items
            if (this.items.size === 0) {
                this.renderEmpty();
            }
        }, { once: true });
    }

    /**
     * Clear all items
     */
    clear() {
        this.items.forEach((item, id) => {
            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
        });
        this.items.clear();
        this.renderEmpty();
    }

    /**
     * Get item count
     * @returns {number}
     */
    getCount() {
        return this.items.size;
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
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Cleanup
     */
    destroy() {
        this.clear();
    }
}