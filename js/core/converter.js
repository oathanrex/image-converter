/**
 * Image Converter Core Module
 * High-performance image conversion using Canvas API
 * @author Oathan Rex
 */

import { MIME_TYPES, EXTENSIONS, FILE_LIMITS, TIMING } from '../config/constants.js';
import { sanitizeOptions } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';
import { validateFormat, validateQuality, validateDimensions } from './validator.js';

/**
 * Conversion options
 * @typedef {Object} ConversionOptions
 * @property {string} format - Output format (png, jpeg, webp, bmp, ico)
 * @property {number} quality - Quality 0-1 (only for lossy formats)
 * @property {number|null} width - Target width (null for original)
 * @property {number|null} height - Target height (null for original)
 * @property {boolean} maintainAspectRatio - Lock aspect ratio
 * @property {boolean} preserveTransparency - Keep alpha channel
 * @property {string} backgroundColor - Background for non-transparent formats
 */

const DEFAULT_OPTIONS = {
    format: 'png',
    quality: 0.9,
    width: null,
    height: null,
    maintainAspectRatio: true,
    preserveTransparency: true,
    backgroundColor: '#FFFFFF'
};

/**
 * ImageConverter Class
 * Singleton pattern for consistent state
 */
class ImageConverterCore {
    constructor() {
        this.cache = new Map();  // ImageBitmap cache
        this.maxCacheSize = 50;

        // Check for OffscreenCanvas support
        this.supportsOffscreen = typeof OffscreenCanvas !== 'undefined';
        logger.info(`OffscreenCanvas support: ${this.supportsOffscreen}`);
    }

    /**
     * Convert image to specified format
     * @param {File|Blob} file - Source image
     * @param {ConversionOptions} options - Conversion options
     * @returns {Promise<Blob>} - Converted image blob
     */
    async convert(file, options = {}) {
        const opts = sanitizeOptions(options, DEFAULT_OPTIONS);

        // Validate inputs
        const formatValidation = validateFormat(opts.format);
        if (!formatValidation.valid) {
            throw new Error(formatValidation.error);
        }

        const qualityValidation = validateQuality(opts.quality);
        if (!qualityValidation.valid) {
            throw new Error(qualityValidation.error);
        }

        const dimensionValidation = validateDimensions(opts.width, opts.height);
        if (!dimensionValidation.valid) {
            throw new Error(dimensionValidation.error);
        }

        logger.time('conversion');

        try {
            // Load image as ImageBitmap (more efficient than Image element)
            const bitmap = await this.loadImageBitmap(file);

            // Calculate target dimensions
            const dimensions = this.calculateDimensions(
                bitmap.width,
                bitmap.height,
                opts.width,
                opts.height,
                opts.maintainAspectRatio
            );

            // Validate calculated dimensions
            if (dimensions.width > FILE_LIMITS.MAX_DIMENSION ||
                dimensions.height > FILE_LIMITS.MAX_DIMENSION) {
                throw new Error(`Resulting dimensions too large: ${dimensions.width}×${dimensions.height}`);
            }

            // Create canvas and draw
            const canvas = this.createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d', {
                alpha: opts.preserveTransparency && this.supportsTransparency(opts.format),
                desynchronized: true  // Performance optimization
            });

            // Set background for non-transparent formats
            if (!opts.preserveTransparency || !this.supportsTransparency(opts.format)) {
                ctx.fillStyle = opts.backgroundColor;
                ctx.fillRect(0, 0, dimensions.width, dimensions.height);
            }

            // Enable high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Use step-down algorithm for large size reductions
            if (bitmap.width > dimensions.width * 2 || bitmap.height > dimensions.height * 2) {
                await this.drawWithStepDown(ctx, bitmap, dimensions);
            } else {
                ctx.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
            }

            // Convert to blob
            const mimeType = this.getMimeType(opts.format);
            const blob = await this.canvasToBlob(canvas, mimeType, opts.quality);

            // Cleanup
            bitmap.close();  // Release ImageBitmap memory

            logger.timeEnd('conversion');
            logger.debug(`Converted: ${file.name || 'blob'} → ${opts.format}, ${this.formatSize(blob.size)}`);

            return blob;

        } catch (error) {
            logger.timeEnd('conversion');
            logger.error('Conversion failed', error);
            throw error;
        }
    }

    /**
     * Load image as ImageBitmap with caching
     * @param {File|Blob} file - Image file
     * @returns {Promise<ImageBitmap>}
     */
    async loadImageBitmap(file) {
        // Check cache
        const cacheKey = file.name + file.size + file.lastModified;
        if (this.cache.has(cacheKey)) {
            logger.debug('Using cached ImageBitmap');
            // Clone the cached bitmap
            const cached = this.cache.get(cacheKey);
            return createImageBitmap(cached);
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
            }, TIMING.CONVERSION_TIMEOUT);

            createImageBitmap(file)
                .then(bitmap => {
                    clearTimeout(timeout);

                    // Cache if space available
                    if (this.cache.size < this.maxCacheSize) {
                        this.cache.set(cacheKey, bitmap);
                    }

                    resolve(bitmap);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load image: ' + error.message));
                });
        });
    }

    /**
     * Create canvas (OffscreenCanvas if available)
     * @param {number} width 
     * @param {number} height 
     * @returns {HTMLCanvasElement|OffscreenCanvas}
     */
    createCanvas(width, height) {
        if (this.supportsOffscreen) {
            return new OffscreenCanvas(width, height);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    /**
     * Draw image with step-down algorithm for better quality
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {ImageBitmap} source - Source image
     * @param {{width: number, height: number}} target - Target dimensions
     */
    async drawWithStepDown(ctx, source, target) {
        let currentSource = source;
        let currentWidth = source.width;
        let currentHeight = source.height;

        // Step down by 50% until close to target
        while (currentWidth / 2 > target.width && currentHeight / 2 > target.height) {
            const stepCanvas = this.createCanvas(
                Math.floor(currentWidth / 2),
                Math.floor(currentHeight / 2)
            );
            const stepCtx = stepCanvas.getContext('2d');
            stepCtx.imageSmoothingEnabled = true;
            stepCtx.imageSmoothingQuality = 'high';
            stepCtx.drawImage(currentSource, 0, 0, stepCanvas.width, stepCanvas.height);

            currentWidth = stepCanvas.width;
            currentHeight = stepCanvas.height;

            // Create ImageBitmap from step canvas
            if (this.supportsOffscreen) {
                currentSource = await createImageBitmap(stepCanvas);
            } else {
                currentSource = await createImageBitmap(stepCanvas);
            }
        }

        // Final draw
        ctx.drawImage(currentSource, 0, 0, target.width, target.height);
    }

    /**
     * Convert canvas to blob with timeout
     * @param {HTMLCanvasElement|OffscreenCanvas} canvas 
     * @param {string} mimeType 
     * @param {number} quality 
     * @returns {Promise<Blob>}
     */
    canvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Blob conversion timeout'));
            }, TIMING.CONVERSION_TIMEOUT);

            if (canvas instanceof OffscreenCanvas) {
                canvas.convertToBlob({ type: mimeType, quality })
                    .then(blob => {
                        clearTimeout(timeout);
                        resolve(blob);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        reject(error);
                    });
            } else {
                canvas.toBlob(
                    (blob) => {
                        clearTimeout(timeout);
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    },
                    mimeType,
                    quality
                );
            }
        });
    }

    /**
     * Calculate dimensions maintaining aspect ratio
     * @param {number} origWidth - Original width
     * @param {number} origHeight - Original height
     * @param {number|null} targetWidth - Desired width
     * @param {number|null} targetHeight - Desired height
     * @param {boolean} maintainAspect - Lock aspect ratio
     * @returns {{width: number, height: number}}
     */
    calculateDimensions(origWidth, origHeight, targetWidth, targetHeight, maintainAspect = true) {
        // No resize needed
        if (targetWidth === null && targetHeight === null) {
            return { width: origWidth, height: origHeight };
        }

        // No aspect ratio lock
        if (!maintainAspect) {
            return {
                width: targetWidth || origWidth,
                height: targetHeight || origHeight
            };
        }

        const aspectRatio = origWidth / origHeight;

        // Only width specified
        if (targetWidth && !targetHeight) {
            return {
                width: targetWidth,
                height: Math.round(targetWidth / aspectRatio)
            };
        }

        // Only height specified
        if (targetHeight && !targetWidth) {
            return {
                width: Math.round(targetHeight * aspectRatio),
                height: targetHeight
            };
        }

        // Both specified - fit within box
        const scaleX = targetWidth / origWidth;
        const scaleY = targetHeight / origHeight;
        const scale = Math.min(scaleX, scaleY);

        return {
            width: Math.round(origWidth * scale),
            height: Math.round(origHeight * scale)
        };
    }

    /**
     * Get MIME type for format
     * @param {string} format 
     * @returns {string}
     */
    getMimeType(format) {
        return MIME_TYPES[format.toLowerCase()] || MIME_TYPES.png;
    }

    /**
     * Get file extension for format
     * @param {string} format 
     * @returns {string}
     */
    getExtension(format) {
        return EXTENSIONS[format.toLowerCase()] || EXTENSIONS.png;
    }

    /**
     * Check if format supports transparency
     * @param {string} format 
     * @returns {boolean}
     */
    supportsTransparency(format) {
        return ['png', 'webp', 'gif'].includes(format.toLowerCase());
    }

    /**
     * Format file size for display
     * @param {number} bytes 
     * @returns {string}
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clear image cache
     */
    clearCache() {
        this.cache.forEach(bitmap => bitmap.close());
        this.cache.clear();
        logger.debug('Image cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {{size: number, maxSize: number}}
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize
        };
    }
}

// Singleton instance
export const ImageConverter = new ImageConverterCore();