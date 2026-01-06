/**
 * Download Service
 * Handles file downloads and ZIP creation
 * @author Oathan Rex
 */

import { store } from '../state/store.js';
import { logger } from '../utils/logger.js';
import { sanitizeFilename } from '../utils/sanitize.js';
import { ImageConverter } from '../core/converter.js';
import { TIMING } from '../config/constants.js';

/**
 * Download single file
 * @param {Blob} blob - File blob
 * @param {string} filename - Download filename
 */
export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFilename(filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL after delay to ensure download starts
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, TIMING.URL_REVOKE_DELAY);

    logger.debug(`Download initiated: ${filename}`);
}

/**
 * Download single image by ID
 * @param {string} imageId - Image ID
 * @returns {boolean} - Success status
 */
export function downloadById(imageId) {
    const image = store.getImageById(imageId);

    if (!image) {
        logger.error(`Image not found: ${imageId}`);
        return false;
    }

    if (!image.convertedBlob) {
        logger.error(`Image not converted: ${imageId}`);
        return false;
    }

    const state = store.getState();
    const extension = ImageConverter.getExtension(state.settings.format);
    const filename = generateOutputFilename(image.name, extension);

    downloadFile(image.convertedBlob, filename);
    return true;
}

/**
 * Download all completed images as ZIP
 * @param {string} zipName - Name for ZIP file
 * @returns {Promise<{success: boolean, fileCount?: number, size?: number, error?: string}>}
 */
export async function downloadAllAsZip(zipName = 'converted-images') {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        logger.error('JSZip library not loaded');
        return {
            success: false,
            error: 'ZIP functionality not available. Please reload the page.'
        };
    }

    const completedImages = store.getCompletedImages();

    if (completedImages.length === 0) {
        logger.warn('No completed images to download');
        return {
            success: false,
            error: 'No converted images available for download.'
        };
    }

    logger.time('zip-creation');

    try {
        const zip = new JSZip();
        const folder = zip.folder('images');
        const state = store.getState();
        const extension = ImageConverter.getExtension(state.settings.format);

        // Track filenames to avoid duplicates
        const usedFilenames = new Set();

        for (const image of completedImages) {
            if (!image.convertedBlob) continue;

            let filename = generateOutputFilename(image.name, extension);

            // Handle duplicate filenames
            if (usedFilenames.has(filename)) {
                const baseName = filename.replace(/\.[^.]+$/, '');
                const ext = filename.match(/\.[^.]+$/)?.[0] || extension;
                let counter = 1;

                while (usedFilenames.has(`${baseName}_${counter}${ext}`)) {
                    counter++;
                }

                filename = `${baseName}_${counter}${ext}`;
            }

            usedFilenames.add(filename);
            folder.file(filename, image.convertedBlob);
        }

        // Generate ZIP with compression
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
            streamFiles: true  // Better memory usage for large files
        }, (metadata) => {
            // Progress callback
            logger.debug(`ZIP progress: ${Math.round(metadata.percent)}%`);
        });

        // Download ZIP
        const safeZipName = sanitizeFilename(zipName);
        downloadFile(zipBlob, `${safeZipName}.zip`);

        logger.timeEnd('zip-creation');
        logger.info(`ZIP created: ${completedImages.length} files, ${formatSize(zipBlob.size)}`);

        return {
            success: true,
            fileCount: completedImages.length,
            size: zipBlob.size
        };

    } catch (error) {
        logger.timeEnd('zip-creation');
        logger.error('ZIP creation failed', error);

        return {
            success: false,
            error: 'Failed to create ZIP file: ' + error.message
        };
    }
}

/**
 * Generate output filename with new extension
 * @param {string} originalName - Original filename
 * @param {string} newExtension - New extension (with dot)
 * @returns {string}
 */
function generateOutputFilename(originalName, newExtension) {
    // Remove existing extension
    const baseName = originalName.replace(/\.[^/.]+$/, '');

    // Add new extension
    return sanitizeFilename(baseName + newExtension);
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate compression savings
 * @param {number} originalSize - Original size in bytes
 * @param {number} newSize - New size in bytes
 * @returns {{saved: number, percentage: number}}
 */
export function calculateSavings(originalSize, newSize) {
    if (originalSize === 0) {
        return { saved: 0, percentage: 0 };
    }

    const saved = originalSize - newSize;
    const percentage = Math.round((saved / originalSize) * 100 * 10) / 10;

    return { saved, percentage };
}

/**
 * Get download statistics
 * @returns {Object}
 */
export function getDownloadStats() {
    const stats = store.getStats();
    const savings = calculateSavings(stats.totalOriginalSize, stats.totalConvertedSize);

    return {
        completedCount: stats.completed,
        totalOriginalSize: stats.totalOriginalSize,
        totalConvertedSize: stats.totalConvertedSize,
        savedBytes: savings.saved,
        savedPercentage: savings.percentage,
        formattedOriginalSize: formatSize(stats.totalOriginalSize),
        formattedConvertedSize: formatSize(stats.totalConvertedSize),
        formattedSaved: formatSize(Math.abs(savings.saved))
    };
}