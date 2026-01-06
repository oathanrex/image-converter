/**
 * State Management Store
 * Centralized, immutable state with subscribers
 * @author Oathan Rex
 */

import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} ImageItem
 * @property {string} id - Unique identifier
 * @property {File} file - Original file
 * @property {string} name - Filename
 * @property {number} size - File size in bytes
 * @property {number} width - Image width
 * @property {number} height - Image height
 * @property {string} previewUrl - Blob URL for preview
 * @property {'pending'|'processing'|'completed'|'error'} status
 * @property {Blob} [convertedBlob] - Converted image blob
 * @property {string} [convertedUrl] - Blob URL for converted
 * @property {number} [convertedSize] - Converted size
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} AppState
 * @property {ImageItem[]} images - Image queue
 * @property {Object} settings - Conversion settings
 * @property {boolean} isProcessing - Processing flag
 * @property {number} progress - Progress 0-100
 * @property {string} theme - Current theme
 */

const initialState = {
    images: [],
    settings: {
        format: 'png',
        quality: 0.9,
        width: null,
        height: null,
        maintainAspectRatio: true,
        preserveTransparency: true,
        backgroundColor: '#FFFFFF'
    },
    isProcessing: false,
    progress: 0,
    currentIndex: 0,
    theme: 'light'
};

class Store {
    constructor() {
        this.state = this.deepClone(initialState);
        this.subscribers = new Set();
        this.history = [];  // For undo functionality
        this.maxHistorySize = 20;

        logger.info('Store initialized');
    }

    /**
     * Get current state (immutable copy)
     * @returns {AppState}
     */
    getState() {
        return this.deepClone(this.state);
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Called with new state
     * @returns {Function} - Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Dispatch action to update state
     * @param {string} action - Action type
     * @param {*} payload - Action payload
     */
    dispatch(action, payload = null) {
        logger.debug(`Dispatch: ${action}`, payload);

        // Save current state to history
        this.history.push(this.deepClone(this.state));
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        // Process action
        this.state = this.reducer(this.state, action, payload);

        // Notify subscribers
        this.notifySubscribers();
    }

    /**
     * State reducer
     * @param {AppState} state - Current state
     * @param {string} action - Action type
     * @param {*} payload - Action payload
     * @returns {AppState} - New state
     */
    reducer(state, action, payload) {
        switch (action) {
            case 'ADD_IMAGES':
                return {
                    ...state,
                    images: [...state.images, ...payload]
                };

            case 'REMOVE_IMAGE':
                return {
                    ...state,
                    images: state.images.filter(img => img.id !== payload)
                };

            case 'CLEAR_IMAGES':
                // Revoke all URLs
                state.images.forEach(img => {
                    if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
                    if (img.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
                });
                return {
                    ...state,
                    images: [],
                    progress: 0,
                    currentIndex: 0
                };

            case 'UPDATE_IMAGE':
                return {
                    ...state,
                    images: state.images.map(img =>
                        img.id === payload.id ? { ...img, ...payload.updates } : img
                    )
                };

            case 'UPDATE_SETTINGS':
                return {
                    ...state,
                    settings: { ...state.settings, ...payload }
                };

            case 'SET_PROCESSING':
                return {
                    ...state,
                    isProcessing: payload
                };

            case 'SET_PROGRESS':
                return {
                    ...state,
                    progress: payload.progress,
                    currentIndex: payload.index
                };

            case 'SET_THEME':
                return {
                    ...state,
                    theme: payload
                };

            case 'RESET':
                // Cleanup
                state.images.forEach(img => {
                    if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
                    if (img.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
                });
                return this.deepClone(initialState);

            default:
                logger.warn(`Unknown action: ${action}`);
                return state;
        }
    }

    /**
     * Notify all subscribers of state change
     */
    notifySubscribers() {
        const stateCopy = this.getState();
        this.subscribers.forEach(callback => {
            try {
                callback(stateCopy);
            } catch (error) {
                logger.error('Subscriber error', error);
            }
        });
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.history.length > 0) {
            this.state = this.history.pop();
            this.notifySubscribers();
            logger.debug('Undo performed');
        }
    }

    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} - Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof File || obj instanceof Blob) {
            return obj;  // Don't clone File/Blob
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        const cloned = {};
        for (const key of Object.keys(obj)) {
            cloned[key] = this.deepClone(obj[key]);
        }
        return cloned;
    }

    /**
     * Get specific image by ID
     * @param {string} id - Image ID
     * @returns {ImageItem|null}
     */
    getImageById(id) {
        return this.state.images.find(img => img.id === id) || null;
    }

    /**
     * Get completed images
     * @returns {ImageItem[]}
     */
    getCompletedImages() {
        return this.state.images.filter(img => img.status === 'completed');
    }

    /**
     * Get processing statistics
     * @returns {Object}
     */
    getStats() {
        const images = this.state.images;
        return {
            total: images.length,
            pending: images.filter(i => i.status === 'pending').length,
            processing: images.filter(i => i.status === 'processing').length,
            completed: images.filter(i => i.status === 'completed').length,
            error: images.filter(i => i.status === 'error').length,
            totalOriginalSize: images.reduce((sum, i) => sum + i.size, 0),
            totalConvertedSize: images
                .filter(i => i.convertedSize)
                .reduce((sum, i) => sum + i.convertedSize, 0)
        };
    }
}

// Singleton export
export const store = new Store();

// Action creators
export const actions = {
    addImages: (images) => store.dispatch('ADD_IMAGES', images),
    removeImage: (id) => store.dispatch('REMOVE_IMAGE', id),
    clearImages: () => store.dispatch('CLEAR_IMAGES'),
    updateImage: (id, updates) => store.dispatch('UPDATE_IMAGE', { id, updates }),
    updateSettings: (settings) => store.dispatch('UPDATE_SETTINGS', settings),
    setProcessing: (isProcessing) => store.dispatch('SET_PROCESSING', isProcessing),
    setProgress: (progress, index) => store.dispatch('SET_PROGRESS', { progress, index }),
    setTheme: (theme) => store.dispatch('SET_THEME', theme),
    reset: () => store.dispatch('RESET')
};