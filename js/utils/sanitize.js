/**
 * Security Utilities
 * Input sanitization and validation
 * @author Oathan Rex
 */

/**
 * Sanitize string for HTML insertion (prevent XSS)
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }

    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=\/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Safe filename
 */
export function sanitizeFilename(filename) {
    if (typeof filename !== 'string') {
        return 'image';
    }

    // Remove path traversal attempts
    let safe = filename.replace(/\.\./g, '');

    // Remove dangerous characters
    safe = safe.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

    // Limit length
    if (safe.length > 200) {
        const ext = safe.match(/\.[^.]+$/)?.[0] || '';
        safe = safe.substring(0, 200 - ext.length) + ext;
    }

    // Ensure not empty
    if (!safe || safe === '.') {
        safe = 'image';
    }

    return safe;
}

/**
 * Validate number input
 * @param {*} value - Input value
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @param {number} defaultValue - Default if invalid
 * @returns {number} - Valid number
 */
export function sanitizeNumber(value, min, max, defaultValue) {
    const num = parseInt(value, 10);

    if (isNaN(num) || num < min || num > max) {
        return defaultValue;
    }

    return num;
}

/**
 * Validate options object (prevent prototype pollution)
 * @param {Object} options - Input options
 * @param {Object} defaults - Default values
 * @returns {Object} - Safe options object
 */
export function sanitizeOptions(options, defaults) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
        return { ...defaults };
    }

    const result = {};

    for (const key of Object.keys(defaults)) {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
            const value = options[key];
            const defaultValue = defaults[key];

            // Type check
            if (typeof value === typeof defaultValue) {
                result[key] = value;
            } else {
                result[key] = defaultValue;
            }
        } else {
            result[key] = defaults[key];
        }
    }

    return result;
}

/**
 * Create safe DOM element with text content
 * @param {string} tag - Element tag name
 * @param {Object} attributes - Element attributes
 * @param {string} textContent - Text content (not HTML)
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class') {
            element.className = escapeHtml(String(value));
        } else if (key === 'data') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = escapeHtml(String(dataValue));
            }
        } else if (key.startsWith('on')) {
            // Skip event handlers in attributes for security
            console.warn('Event handlers should not be set via attributes');
        } else {
            element.setAttribute(key, escapeHtml(String(value)));
        }
    }

    if (textContent) {
        element.textContent = textContent;  // Safe - uses textContent, not innerHTML
    }

    return element;
}