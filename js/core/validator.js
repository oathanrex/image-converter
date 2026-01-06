/**
 * Input Validation Module
 * Comprehensive file and input validation
 * @author Oathan Rex
 */

import { FILE_LIMITS, MIME_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if invalid
 * @property {string} [warning] - Warning message
 */

/**
 * Validate single file
 * @param {File} file - File to validate
 * @returns {Promise<ValidationResult>}
 */
export async function validateFile(file) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size === 0) {
        return { valid: false, error: 'File is empty (0 bytes)' };
    }

    if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
        const sizeMB = Math.round(file.size / (1024 * 1024));
        return {
            valid: false,
            error: `File too large (${sizeMB}MB). Maximum is ${FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
    }

    // Check MIME type
    const mimeType = file.type.toLowerCase();
    if (!FILE_LIMITS.SUPPORTED_INPUT.includes(mimeType)) {
        // Try to validate by magic bytes
        const isValid = await validateByMagicBytes(file);
        if (!isValid) {
            return {
                valid: false,
                error: `Unsupported file type: ${mimeType || 'unknown'}`
            };
        }
    }

    // Check if actually valid image
    try {
        const dimensions = await getImageDimensions(file);

        if (dimensions.width > FILE_LIMITS.MAX_DIMENSION ||
            dimensions.height > FILE_LIMITS.MAX_DIMENSION) {
            return {
                valid: false,
                error: `Image dimensions too large (${dimensions.width}×${dimensions.height}). Maximum is ${FILE_LIMITS.MAX_DIMENSION}×${FILE_LIMITS.MAX_DIMENSION}`
            };
        }

        if (dimensions.width < FILE_LIMITS.MIN_DIMENSION ||
            dimensions.height < FILE_LIMITS.MIN_DIMENSION) {
            return {
                valid: false,
                error: 'Image dimensions too small'
            };
        }

    } catch (error) {
        return { valid: false, error: 'Failed to load image. File may be corrupted.' };
    }

    // Warnings
    let warning = null;
    if (mimeType === 'image/gif') {
        warning = 'Animated GIFs will be converted as static images (first frame only)';
    }

    return { valid: true, warning };
}

/**
 * Validate file by checking magic bytes (file signature)
 * @param {File} file - File to check
 * @returns {Promise<boolean>}
 */
async function validateByMagicBytes(file) {
    const signatures = {
        // PNG: 89 50 4E 47
        png: [0x89, 0x50, 0x4E, 0x47],
        // JPEG: FF D8 FF
        jpeg: [0xFF, 0xD8, 0xFF],
        // GIF: 47 49 46 38
        gif: [0x47, 0x49, 0x46, 0x38],
        // BMP: 42 4D
        bmp: [0x42, 0x4D],
        // WebP: 52 49 46 46 ... 57 45 42 50
        webp: [0x52, 0x49, 0x46, 0x46]
    };

    try {
        const buffer = await file.slice(0, 12).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        for (const [format, signature] of Object.entries(signatures)) {
            let match = true;
            for (let i = 0; i < signature.length; i++) {
                if (bytes[i] !== signature[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                // Additional WebP check
                if (format === 'webp') {
                    // Check for WEBP at offset 8
                    if (bytes[8] !== 0x57 || bytes[9] !== 0x45 ||
                        bytes[10] !== 0x42 || bytes[11] !== 0x50) {
                        continue;
                    }
                }
                logger.debug(`File validated by magic bytes: ${format}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        logger.warn('Magic bytes validation failed', error);
        return false;
    }
}

/**
 * Get image dimensions without fully loading
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        const timeout = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load timeout'));
        }, 10000);  // 10 second timeout

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
 * Validate batch of files
 * @param {File[]} files - Array of files
 * @returns {Promise<{valid: File[], invalid: Array<{file: File, error: string}>}>}
 */
export async function validateBatch(files) {
    const valid = [];
    const invalid = [];

    // Check total count
    if (files.length > FILE_LIMITS.MAX_FILE_COUNT) {
        logger.warn(`Too many files: ${files.length}. Truncating to ${FILE_LIMITS.MAX_FILE_COUNT}`);
        files = files.slice(0, FILE_LIMITS.MAX_FILE_COUNT);
    }

    for (const file of files) {
        const result = await validateFile(file);

        if (result.valid) {
            valid.push(file);
            if (result.warning) {
                logger.warn(`Warning for ${file.name}: ${result.warning}`);
            }
        } else {
            invalid.push({ file, error: result.error });
            logger.warn(`Invalid file ${file.name}: ${result.error}`);
        }
    }

    return { valid, invalid };
}

/**
 * Validate resize dimensions
 * @param {number|null} width - Target width
 * @param {number|null} height - Target height
 * @returns {ValidationResult}
 */
export function validateDimensions(width, height) {
    if (width !== null) {
        if (!Number.isInteger(width) || width < FILE_LIMITS.MIN_DIMENSION) {
            return { valid: false, error: 'Invalid width value' };
        }
        if (width > FILE_LIMITS.MAX_DIMENSION) {
            return {
                valid: false,
                error: `Width exceeds maximum (${FILE_LIMITS.MAX_DIMENSION}px)`
            };
        }
    }

    if (height !== null) {
        if (!Number.isInteger(height) || height < FILE_LIMITS.MIN_DIMENSION) {
            return { valid: false, error: 'Invalid height value' };
        }
        if (height > FILE_LIMITS.MAX_DIMENSION) {
            return {
                valid: false,
                error: `Height exceeds maximum (${FILE_LIMITS.MAX_DIMENSION}px)`
            };
        }
    }

    return { valid: true };
}

/**
 * Validate quality value
 * @param {number} quality - Quality 0-1
 * @returns {ValidationResult}
 */
export function validateQuality(quality) {
    if (typeof quality !== 'number' || isNaN(quality)) {
        return { valid: false, error: 'Quality must be a number' };
    }

    if (quality < 0 || quality > 1) {
        return { valid: false, error: 'Quality must be between 0 and 1' };
    }

    return { valid: true };
}

/**
 * Validate output format
 * @param {string} format - Output format
 * @returns {ValidationResult}
 */
export function validateFormat(format) {
    if (typeof format !== 'string') {
        return { valid: false, error: 'Format must be a string' };
    }

    const normalizedFormat = format.toLowerCase();
    if (!FILE_LIMITS.SUPPORTED_OUTPUT.includes(normalizedFormat)) {
        return {
            valid: false,
            error: `Unsupported output format: ${format}. Supported: ${FILE_LIMITS.SUPPORTED_OUTPUT.join(', ')}`
        };
    }

    return { valid: true };
}