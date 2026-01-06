/**
 * Application Entry Point
 * Initializes the Image Converter application
 * @author Oathan Rex
 * @version 2.0.0
 */

import { UIManager } from './ui/ui-manager.js';
import { logger, LOG_LEVELS } from './utils/logger.js';
import { APP_CONFIG } from './config/constants.js';

class ImageConverterApp {
    constructor() {
        this.uiManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize application
     */
    async init() {
        if (this.isInitialized) {
            logger.warn('App already initialized');
            return;
        }

        logger.info(`${APP_CONFIG.NAME} v${APP_CONFIG.VERSION} starting...`);
        logger.time('app-init');

        try {
            // Check browser support
            this.checkBrowserSupport();

            // Initialize UI
            this.uiManager = new UIManager();

            this.isInitialized = true;

            logger.timeEnd('app-init');
            logger.info('Application initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize application', error);
            this.showFatalError(error);
        }
    }

    /**
     * Check browser support for required features
     */
    checkBrowserSupport() {
        const required = {
            'File API': typeof File !== 'undefined',
            'FileReader API': typeof FileReader !== 'undefined',
            'Canvas API': typeof HTMLCanvasElement !== 'undefined',
            'Blob API': typeof Blob !== 'undefined',
            'URL.createObjectURL': typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
            'ES6 Promises': typeof Promise !== 'undefined',
            'ES6 Classes': true  // If we got here, classes work
        };

        const unsupported = Object.entries(required)
            .filter(([, supported]) => !supported)
            .map(([feature]) => feature);

        if (unsupported.length > 0) {
            throw new Error(`Browser missing required features: ${unsupported.join(', ')}`);
        }

        // Check optional features
        const optional = {
            'OffscreenCanvas': typeof OffscreenCanvas !== 'undefined',
            'createImageBitmap': typeof createImageBitmap !== 'undefined',
            'Web Workers': typeof Worker !== 'undefined',
            'Service Worker': 'serviceWorker' in navigator
        };

        logger.debug('Browser feature support:', { required, optional });
    }

    /**
     * Show fatal error to user
     * @param {Error} error 
     */
    showFatalError(error) {
        const container = document.querySelector('.main') || document.body;

        container.innerHTML = `
            <div style="
                max-width: 600px;
                margin: 100px auto;
                padding: 40px;
                text-align: center;
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            ">
                <h1 style="color: #e74c3c; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Application Error
                </h1>
                <p style="color: #666; margin-bottom: 20px;">
                    Sorry, the application failed to load. This may be due to an 
                    unsupported browser or a temporary issue.
                </p>
                <p style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 14px;
                    color: #e74c3c;
                ">
                    ${error.message}
                </p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 12px 30px;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">
                    Reload Page
                </button>
            </div>
        `;
    }

    /**
     * Cleanup and destroy application
     */
    destroy() {
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        this.isInitialized = false;
        logger.info('Application destroyed');
    }
}

// Global instance
const app = new ImageConverterApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for debugging
window.__imageConverter = app;