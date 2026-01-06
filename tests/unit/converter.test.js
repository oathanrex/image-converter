/**
 * Image Converter Unit Tests
 * @author Oathan Rex
 */

import { ImageConverter } from '../../js/core/converter.js';

// Mock File and Blob for Node.js environment
// In browser, use actual File API

describe('ImageConverter', () => {
    describe('getMimeType', () => {
        test('returns correct MIME for PNG', () => {
            expect(ImageConverter.getMimeType('png')).toBe('image/png');
        });

        test('returns correct MIME for JPEG', () => {
            expect(ImageConverter.getMimeType('jpeg')).toBe('image/jpeg');
            expect(ImageConverter.getMimeType('jpg')).toBe('image/jpeg');
        });

        test('returns correct MIME for WebP', () => {
            expect(ImageConverter.getMimeType('webp')).toBe('image/webp');
        });

        test('returns PNG MIME for unknown format', () => {
            expect(ImageConverter.getMimeType('unknown')).toBe('image/png');
        });

        test('handles case insensitivity', () => {
            expect(ImageConverter.getMimeType('PNG')).toBe('image/png');
            expect(ImageConverter.getMimeType('Jpeg')).toBe('image/jpeg');
        });
    });

    describe('getExtension', () => {
        test('returns correct extension for PNG', () => {
            expect(ImageConverter.getExtension('png')).toBe('.png');
        });

        test('returns .jpg for JPEG formats', () => {
            expect(ImageConverter.getExtension('jpeg')).toBe('.jpg');
            expect(ImageConverter.getExtension('jpg')).toBe('.jpg');
        });
    });

    describe('supportsTransparency', () => {
        test('returns true for PNG', () => {
            expect(ImageConverter.supportsTransparency('png')).toBe(true);
        });

        test('returns true for WebP', () => {
            expect(ImageConverter.supportsTransparency('webp')).toBe(true);
        });

        test('returns false for JPEG', () => {
            expect(ImageConverter.supportsTransparency('jpeg')).toBe(false);
            expect(ImageConverter.supportsTransparency('jpg')).toBe(false);
        });

        test('returns false for BMP', () => {
            expect(ImageConverter.supportsTransparency('bmp')).toBe(false);
        });
    });

    describe('formatSize', () => {
        test('formats bytes correctly', () => {
            expect(ImageConverter.formatSize(0)).toBe('0 Bytes');
            expect(ImageConverter.formatSize(500)).toBe('500 Bytes');
        });

        test('formats KB correctly', () => {
            expect(ImageConverter.formatSize(1024)).toBe('1 KB');
            expect(ImageConverter.formatSize(1536)).toBe('1.5 KB');
        });

        test('formats MB correctly', () => {
            expect(ImageConverter.formatSize(1048576)).toBe('1 MB');
            expect(ImageConverter.formatSize(5242880)).toBe('5 MB');
        });
    });

    describe('calculateDimensions', () => {
        test('returns original dimensions when no resize specified', () => {
            const result = ImageConverter.calculateDimensions(800, 600, null, null, true);
            expect(result).toEqual({ width: 800, height: 600 });
        });

        test('calculates height when only width specified', () => {
            const result = ImageConverter.calculateDimensions(800, 600, 400, null, true);
            expect(result).toEqual({ width: 400, height: 300 });
        });

        test('calculates width when only height specified', () => {
            const result = ImageConverter.calculateDimensions(800, 600, null, 300, true);
            expect(result).toEqual({ width: 400, height: 300 });
        });

        test('fits within box when both dimensions specified', () => {
            const result = ImageConverter.calculateDimensions(800, 600, 200, 200, true);
            expect(result.width).toBeLessThanOrEqual(200);
            expect(result.height).toBeLessThanOrEqual(200);
        });

        test('ignores aspect ratio when disabled', () => {
            const result = ImageConverter.calculateDimensions(800, 600, 400, 400, false);
            expect(result).toEqual({ width: 400, height: 400 });
        });
    });
});