/**
 * ICO Encoder Module
 * Creates valid Windows ICO format files
 * @author Oathan Rex
 */

import { logger } from '../utils/logger.js';

/**
 * ICO file format structure:
 * - ICONDIR header (6 bytes)
 * - ICONDIRENTRY array (16 bytes each)
 * - Image data (PNG or BMP format)
 */

/**
 * Create ICO file from image
 * @param {File|Blob} sourceFile - Source image
 * @param {number[]} sizes - Array of icon sizes (e.g., [16, 32, 48, 256])
 * @returns {Promise<Blob>} - ICO file blob
 */
export async function createIco(sourceFile, sizes = [256]) {
    logger.time('ico-creation');

    // Validate sizes
    const validSizes = sizes.filter(size =>
        Number.isInteger(size) && size > 0 && size <= 256
    );

    if (validSizes.length === 0) {
        validSizes.push(256);
    }

    try {
        // Load source image
        const bitmap = await createImageBitmap(sourceFile);

        // Generate PNG data for each size
        const images = [];

        for (const size of validSizes) {
            const pngData = await generatePngIcon(bitmap, size);
            images.push({
                size: size,
                data: pngData
            });
        }

        // Build ICO file
        const icoBlob = buildIcoFile(images);

        bitmap.close();
        logger.timeEnd('ico-creation');

        return icoBlob;

    } catch (error) {
        logger.timeEnd('ico-creation');
        logger.error('ICO creation failed', error);
        throw error;
    }
}

/**
 * Generate PNG data for icon size
 * @param {ImageBitmap} source - Source bitmap
 * @param {number} size - Target size
 * @returns {Promise<Uint8Array>}
 */
async function generatePngIcon(source, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw with aspect ratio preserved, centered
    const scale = Math.min(size / source.width, size / source.height);
    const scaledWidth = source.width * scale;
    const scaledHeight = source.height * scale;
    const x = (size - scaledWidth) / 2;
    const y = (size - scaledHeight) / 2;

    ctx.drawImage(source, x, y, scaledWidth, scaledHeight);

    // Convert to PNG blob
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Failed to create PNG')),
            'image/png',
            1.0
        );
    });

    // Convert blob to Uint8Array
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

/**
 * Build ICO file from image data
 * @param {Array<{size: number, data: Uint8Array}>} images - Array of icon images
 * @returns {Blob}
 */
function buildIcoFile(images) {
    // Calculate total size
    const headerSize = 6;  // ICONDIR
    const entrySize = 16;  // ICONDIRENTRY per image
    const dirSize = headerSize + (entrySize * images.length);

    let totalDataSize = 0;
    for (const img of images) {
        totalDataSize += img.data.length;
    }

    // Create buffer
    const buffer = new ArrayBuffer(dirSize + totalDataSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // ICONDIR header
    view.setUint16(0, 0, true);      // Reserved (0)
    view.setUint16(2, 1, true);      // Type (1 = ICO, 2 = CUR)
    view.setUint16(4, images.length, true);  // Image count

    // Calculate offsets
    let currentOffset = dirSize;

    // Write ICONDIRENTRY for each image
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const entryOffset = headerSize + (i * entrySize);

        // Width (0 = 256)
        bytes[entryOffset + 0] = img.size >= 256 ? 0 : img.size;
        // Height (0 = 256)
        bytes[entryOffset + 1] = img.size >= 256 ? 0 : img.size;
        // Color palette (0 for PNG)
        bytes[entryOffset + 2] = 0;
        // Reserved
        bytes[entryOffset + 3] = 0;
        // Color planes (1 for ICO)
        view.setUint16(entryOffset + 4, 1, true);
        // Bits per pixel (32 for RGBA)
        view.setUint16(entryOffset + 6, 32, true);
        // Data size
        view.setUint32(entryOffset + 8, img.data.length, true);
        // Data offset
        view.setUint32(entryOffset + 12, currentOffset, true);

        currentOffset += img.data.length;
    }

    // Write image data
    currentOffset = dirSize;
    for (const img of images) {
        bytes.set(img.data, currentOffset);
        currentOffset += img.data.length;
    }

    return new Blob([buffer], { type: 'image/x-icon' });
}

/**
 * Create multi-size ICO (favicon pack)
 * @param {File|Blob} sourceFile - Source image
 * @returns {Promise<Blob>} - ICO with multiple sizes
 */
export async function createFaviconPack(sourceFile) {
    // Standard favicon sizes
    const sizes = [16, 32, 48, 64, 128, 256];
    return createIco(sourceFile, sizes);
}