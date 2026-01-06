/**
 * Toast Notification Component
 * Non-blocking user feedback
 * @author Oathan Rex
 */

import { TIMING } from '../../config/constants.js';
import { escapeHtml } from '../../utils/sanitize.js';

class ToastManager {
    constructor() {
        this.container = null;
        this.queue = [];
        this.isShowing = false;
        this.init();
    }

    /**
     * Initialize toast container
     */
    init() {
        // Create container if not exists
        this.container = document.getElementById('toast-container');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {Object} options - Toast options
     */
    show(message, options = {}) {
        const {
            type = 'success',  // success, error, warning, info
            duration = TIMING.TOAST_DURATION,
            icon = null,
            action = null,
            actionText = 'Undo'
        } = options;

        const toast = this.createToast(message, type, icon, action, actionText);

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Create toast element
     * @param {string} message 
     * @param {string} type 
     * @param {string|null} customIcon 
     * @param {Function|null} action 
     * @param {string} actionText 
     * @returns {HTMLElement}
     */
    createToast(message, type, customIcon, action, actionText) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        // Icon
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const iconClass = customIcon || iconMap[type] || iconMap.info;

        // Build HTML safely
        const iconEl = document.createElement('i');
        iconEl.className = `toast-icon ${iconClass}`;

        const messageEl = document.createElement('span');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;  // Safe - textContent

        const contentEl = document.createElement('div');
        contentEl.className = 'toast-content';
        contentEl.appendChild(iconEl);
        contentEl.appendChild(messageEl);

        toast.appendChild(contentEl);

        // Action button
        if (action && typeof action === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'toast-action';
            actionBtn.textContent = actionText;
            actionBtn.addEventListener('click', () => {
                action();
                this.dismiss(toast);
            });
            toast.appendChild(actionBtn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => {
            this.dismiss(toast);
        });
        toast.appendChild(closeBtn);

        return toast;
    }

    /**
     * Dismiss toast
     * @param {HTMLElement} toast 
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, { once: true });
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.dismiss(toast));
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
}

// Singleton export
export const toast = new ToastManager();