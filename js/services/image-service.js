/**
 * Image Service
 * Orchestrates image processing operations
 * @author Oathan Rex
 */

import { ImageConverter } from '../core/converter.js';
import { createIco } from '../core/ico-encoder.js';
import { validateFile, validateBatch } from '../core/validator.js';
import { store, actions } from '../state/store.js';
import { logger } from '../utils/logger.js';
import { sanitizeFilename } from '../utils/sanitize.js';
import { TIMING } from '../config/constants.js';

/**
 * Generate unique ID
 * @returns {string}
 */
function generateId() {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add files to processing queue
 * @param {FileList|File[]} files - Files to add
 * @returns {Promise<{added: number, rejected: number, errors: string[]}>}
 */
export async function addFiles(files) {
    const fileArray = Array.from(files);
    logger.info(`Adding ${fileArray.length} files`);

    const { valid, invalid } = await validateBatch(fileArray);

    const images = [];

    for (const file of valid) {
        try {
            const dimensions = await getImageDimensions(file);

            images.push({
                id: generateId(),
                file: file,
                name: sanitizeFilename(file.name),
                size: file.size,
                width: dimensions.width,
                height: dimensions.height,
                previewUrl: URL.createObjectURL(file),
                status: 'pending',
                convertedBlob: null,
                convertedUrl: null,
                convertedSize: null,
                error: null
            });
        } catch (error) {
            logger.error(`Failed to process file: ${file.name}`, error);
            invalid.push({ file, error: error.message });
        }
    }

    if (images.length > 0) {
        actions.addImages(images);
    }

    return {
        added: images.length,
        rejected: invalid.length,
        errors: invalid.map(i => `${i.file.name}: ${i.error}`)
    };
}

/**
 * Get image dimensions
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
async function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        const timeout = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Timeout loading image'));
        }, TIMING.CONVERSION_TIMEOUT);

        img.onload = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Convert all images in queue
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function convertAll() {
    const state = store.getState();

    if (state.isProcessing) {
        logger.warn('Already processing');
        return { success: 0, failed: 0 };
    }

    if (state.images.length === 0) {
        logger.warn('No images to convert');
        return { success: 0, failed: 0 };
    }

    actions.setProcessing(true);

    const total = state.images.length;
    let success = 0;
    let failed = 0;

    logger.group(`Converting ${total} images`);

    for (let i = 0; i < state.images.length; i++) {
        const image = state.images[i];

        // Update progress
        actions.setProgress(Math.round((i / total) * 100), i);
        actions.updateImage(image.id, { status: 'processing' });

        try {
            let blob;

            if (state.settings.format === 'ico') {
                blob = await createIco(image.file, [
                    state.settings.width || 256
                ]);
            } else {
                blob = await ImageConverter.convert(image.file, {
                    format: state.settings.format,
                    quality: state.settings.quality,
                    width: state.settings.width,
                    height: state.settings.height,
                    maintainAspectRatio: state.settings.maintainAspectRatio,
                    preserveTransparency: state.settings.preserveTransparency,
                    backgroundColor: state.settings.backgroundColor
                });
            }

            const convertedUrl = URL.createObjectURL(blob);

            actions.updateImage(image.id, {
                status: 'completed',
                convertedBlob: blob,
                convertedUrl: convertedUrl,
                convertedSize: blob.size
            });

            success++;

        } catch (error) {
            logger.error(`Conversion failed for ${image.name}`, error);

            actions.updateImage(image.id, {
                status: 'error',
                error: error.message
            });

            failed++;
        }
    }

    actions.setProgress(100, total);
    actions.setProcessing(false);

    logger.groupEnd();
    logger.info(`Conversion complete: ${success} success, ${failed} failed`);

    return { success, failed };
}

/**
 * Convert single image
 * @param {string} imageId - Image ID
 * @returns {Promise<boolean>}
 */
export async function convertSingle(imageId) {
    const image = store.getImageById(imageId);

    if (!image) {
        logger.error(`Image not found: ${imageId}`);
        return false;
    }

    const state = store.getState();

    actions.updateImage(imageId, { status: 'processing' });

    try {
        let blob;

        if (state.settings.format === 'ico') {
            blob = await createIco(image.file, [state.settings.width || 256]);
        } else {
            blob = await ImageConverter.convert(image.file, state.settings);
        }

        const convertedUrl = URL.createObjectURL(blob);

        actions.updateImage(imageId, {
            status: 'completed',
            convertedBlob: blob,
            convertedUrl: convertedUrl,
            convertedSize: blob.size
        });

        return true;

    } catch (error) {
        logger.error(`Conversion failed for ${image.name}`, error);

        actions.updateImage(imageId, {
            status: 'error',
            error: error.message
        });

        return false;
    }
}

/**
 * Remove image from queue
 * @param {string} imageId - Image ID
 */
export function removeImage(imageId) {
    const image = store.getImageById(imageId);

    if (image) {
        if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
        if (image.convertedUrl) URL.revokeObjectURL(image.convertedUrl);
        actions.removeImage(imageId);
    }
}

/**
 * Clear all images
 */
export function clearAll() {
    actions.clearImages();
    ImageConverter.clearCache();
}

/**
 * Get processing statistics
 * @returns {Object}
 */
export function getStats() {
    return store.getStats();
}