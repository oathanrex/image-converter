/**
 * Logging Utility
 * Structured logging with levels
 * @author Oathan Rex
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor(options = {}) {
        this.level = options.level ?? LOG_LEVELS.INFO;
        this.prefix = options.prefix ?? '🖼️ ImageConverter';
        this.enableTimestamp = options.timestamp ?? true;
    }

    #formatMessage(level, message, data) {
        const timestamp = this.enableTimestamp
            ? `[${new Date().toISOString()}]`
            : '';
        return `${timestamp} ${this.prefix} [${level}]: ${message}`;
    }

    debug(message, data = null) {
        if (this.level <= LOG_LEVELS.DEBUG) {
            console.debug(this.#formatMessage('DEBUG', message), data ?? '');
        }
    }

    info(message, data = null) {
        if (this.level <= LOG_LEVELS.INFO) {
            console.info(this.#formatMessage('INFO', message), data ?? '');
        }
    }

    warn(message, data = null) {
        if (this.level <= LOG_LEVELS.WARN) {
            console.warn(this.#formatMessage('WARN', message), data ?? '');
        }
    }

    error(message, error = null) {
        if (this.level <= LOG_LEVELS.ERROR) {
            console.error(this.#formatMessage('ERROR', message), error ?? '');

            // In production, could send to error tracking service
            if (error instanceof Error) {
                console.error('Stack trace:', error.stack);
            }
        }
    }

    group(label) {
        console.group(this.#formatMessage('GROUP', label));
    }

    groupEnd() {
        console.groupEnd();
    }

    time(label) {
        console.time(`${this.prefix} ${label}`);
    }

    timeEnd(label) {
        console.timeEnd(`${this.prefix} ${label}`);
    }

    setLevel(level) {
        if (typeof level === 'string') {
            this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
        } else {
            this.level = level;
        }
    }
}

// Singleton instance
export const logger = new Logger({
    level: LOG_LEVELS.DEBUG,  // Set to INFO or WARN in production
    prefix: '🖼️ ImageConverter',
    timestamp: true
});

export { LOG_LEVELS };