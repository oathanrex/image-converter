/**
 * Application Constants
 * Centralized configuration for maintainability
 * @author Oathan Rex
 */

export const APP_CONFIG = Object.freeze({
    NAME: 'ImageConverter',
    VERSION: '2.0.0',
    AUTHOR: 'Oathan Rex',
    GITHUB: 'https://github.com/oathanrex'
});

export const FILE_LIMITS = Object.freeze({
    MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB
    MAX_FILE_COUNT: 100,
    MAX_DIMENSION: 16384,  // Max canvas dimension
    MIN_DIMENSION: 1,
    SUPPORTED_INPUT: ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'],
    SUPPORTED_OUTPUT: ['png', 'jpeg', 'webp', 'bmp', 'ico']
});

export const QUALITY_SETTINGS = Object.freeze({
    MIN: 0.1,
    MAX: 1.0,
    DEFAULT: 0.9,
    STEP: 0.01
});

export const TIMING = Object.freeze({
    TOAST_DURATION: 3000,
    URL_REVOKE_DELAY: 1000,
    DEBOUNCE_DELAY: 300,
    CONVERSION_TIMEOUT: 30000  // 30 seconds per image
});

export const UI_MESSAGES = Object.freeze({
    // Errors
    ERROR_NO_FILES: 'Please add images first',
    ERROR_INVALID_FILE: 'Invalid file type. Please use supported image formats.',
    ERROR_FILE_TOO_LARGE: 'File too large. Maximum size is 100MB.',
    ERROR_TOO_MANY_FILES: 'Too many files. Maximum is 100 files.',
    ERROR_CONVERSION_FAILED: 'Conversion failed. Please try again.',
    ERROR_DIMENSION_TOO_LARGE: 'Dimensions too large. Maximum is 16384 pixels.',

    // Success
    SUCCESS_CONVERTED: (count) => `Successfully converted ${count} image${count > 1 ? 's' : ''}!`,
    SUCCESS_CLEARED: 'All cleared!',
    SUCCESS_DOWNLOAD_STARTED: 'Download started!',
    SUCCESS_ZIP_CREATED: (count) => `Downloaded ${count} images as ZIP!`,

    // Info
    INFO_PROCESSING: (current, total) => `Converting ${current} of ${total}...`,
    INFO_COMPLETE: 'Conversion complete!',
    INFO_QUALITY_PNG: 'Note: Quality setting has no effect on PNG (lossless format)'
});

export const PRESETS = Object.freeze({
    // Social Media
    INSTAGRAM_SQUARE: { width: 1080, height: 1080, name: 'Instagram Square' },
    INSTAGRAM_PORTRAIT: { width: 1080, height: 1350, name: 'Instagram Portrait' },
    INSTAGRAM_LANDSCAPE: { width: 1080, height: 566, name: 'Instagram Landscape' },
    FACEBOOK_POST: { width: 1200, height: 630, name: 'Facebook Post' },
    TWITTER_POST: { width: 1600, height: 900, name: 'Twitter Post' },
    LINKEDIN_POST: { width: 1200, height: 627, name: 'LinkedIn Post' },
    YOUTUBE_THUMBNAIL: { width: 1280, height: 720, name: 'YouTube Thumbnail' },

    // Video Resolutions
    UHD_4K: { width: 3840, height: 2160, name: '4K UHD' },
    FULL_HD: { width: 1920, height: 1080, name: 'Full HD (1080p)' },
    HD: { width: 1280, height: 720, name: 'HD (720p)' },
    SD: { width: 640, height: 480, name: 'SD (480p)' },

    // Icons
    FAVICON_16: { width: 16, height: 16, name: 'Favicon 16×16' },
    FAVICON_32: { width: 32, height: 32, name: 'Favicon 32×32' },
    ICON_64: { width: 64, height: 64, name: 'Icon 64×64' },
    ICON_128: { width: 128, height: 128, name: 'Icon 128×128' },
    ICON_256: { width: 256, height: 256, name: 'Icon 256×256' },
    ICON_512: { width: 512, height: 512, name: 'Icon 512×512' },

    // Web
    THUMBNAIL: { width: 150, height: 150, name: 'Thumbnail' },
    SMALL: { width: 320, height: 240, name: 'Small' },
    MEDIUM: { width: 800, height: 600, name: 'Medium' },
    LARGE: { width: 1200, height: 900, name: 'Large' }
});

export const MIME_TYPES = Object.freeze({
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon'
});

export const EXTENSIONS = Object.freeze({
    png: '.png',
    jpeg: '.jpg',
    jpg: '.jpg',
    webp: '.webp',
    bmp: '.bmp',
    gif: '.gif',
    ico: '.ico'
});