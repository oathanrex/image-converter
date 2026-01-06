/**
 * Sanitization Utility Tests
 * @author Oathan Rex
 */

import { escapeHtml, sanitizeFilename, sanitizeNumber, sanitizeOptions } from '../../js/utils/sanitize.js';

describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>'))
            .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('escapes ampersand', () => {
        expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    test('returns empty string for non-string input', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(123)).toBe('');
    });

    test('handles normal text unchanged', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });
});

describe('sanitizeFilename', () => {
    test('removes path traversal attempts', () => {
        expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });

    test('removes dangerous characters', () => {
        expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file.txt');
    });

    test('truncates long filenames', () => {
        const longName = 'a'.repeat(300) + '.png';
        const result = sanitizeFilename(longName);
        expect(result.length).toBeLessThanOrEqual(200);
        expect(result.endsWith('.png')).toBe(true);
    });

    test('returns default for empty input', () => {
        expect(sanitizeFilename('')).toBe('image');
        expect(sanitizeFilename('.')).toBe('image');
    });

    test('handles null/undefined', () => {
        expect(sanitizeFilename(null)).toBe('image');
        expect(sanitizeFilename(undefined)).toBe('image');
    });
});

describe('sanitizeNumber', () => {
    test('returns valid number within range', () => {
        expect(sanitizeNumber(50, 0, 100, 0)).toBe(50);
    });

    test('returns default for value below min', () => {
        expect(sanitizeNumber(-5, 0, 100, 50)).toBe(50);
    });

    test('returns default for value above max', () => {
        expect(sanitizeNumber(150, 0, 100, 50)).toBe(50);
    });

    test('returns default for NaN', () => {
        expect(sanitizeNumber(NaN, 0, 100, 50)).toBe(50);
        expect(sanitizeNumber('not a number', 0, 100, 50)).toBe(50);
    });

    test('parses string numbers', () => {
        expect(sanitizeNumber('75', 0, 100, 50)).toBe(75);
    });
});

describe('sanitizeOptions', () => {
    const defaults = {
        format: 'png',
        quality: 0.9,
        width: null
    };

    test('returns defaults for null input', () => {
        expect(sanitizeOptions(null, defaults)).toEqual(defaults);
    });

    test('returns defaults for array input', () => {
        expect(sanitizeOptions([1, 2, 3], defaults)).toEqual(defaults);
    });

    test('merges valid options with defaults', () => {
        const result = sanitizeOptions({ format: 'jpeg', quality: 0.8 }, defaults);
        expect(result).toEqual({ format: 'jpeg', quality: 0.8, width: null });
    });

    test('ignores options with wrong type', () => {
        const result = sanitizeOptions({ quality: 'high' }, defaults);
        expect(result.quality).toBe(0.9);  // Uses default
    });

    test('ignores unknown options', () => {
        const result = sanitizeOptions({ format: 'webp', unknown: 'value' }, defaults);
        expect(result.unknown).toBeUndefined();
    });
});