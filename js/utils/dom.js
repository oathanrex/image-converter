/**
 * DOM Utility Functions
 * Safe DOM manipulation helpers
 * @author Oathan Rex
 */

import { escapeHtml } from './sanitize.js';

/**
 * Safely query DOM element with error handling
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (e) {
        console.error(`Invalid selector: ${selector}`);
        return null;
    }
}

/**
 * Safely query all DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {NodeList}
 */
export function $$(selector, parent = document) {
    try {
        return parent.querySelectorAll(selector);
    } catch (e) {
        console.error(`Invalid selector: ${selector}`);
        return [];
    }
}

/**
 * Create element with attributes and children (safe)
 * @param {string} tag - Tag name
 * @param {Object} [attrs={}] - Attributes
 * @param {Array|string} [children=[]] - Children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class' || key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'data' && typeof value === 'object') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === 'html') {
            // Skip - use children instead for safety
        } else {
            element.setAttribute(key, escapeHtml(String(value)));
        }
    }

    // Add children
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    }

    return element;
}

/**
 * Remove all children from element
 * @param {Element} element 
 */
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Toggle class with optional force parameter
 * @param {Element} element 
 * @param {string} className 
 * @param {boolean} [force] 
 */
export function toggleClass(element, className, force) {
    if (element) {
        element.classList.toggle(className, force);
    }
}

/**
 * Add multiple classes
 * @param {Element} element 
 * @param {...string} classNames 
 */
export function addClass(element, ...classNames) {
    if (element) {
        element.classList.add(...classNames);
    }
}

/**
 * Remove multiple classes
 * @param {Element} element 
 * @param {...string} classNames 
 */
export function removeClass(element, ...classNames) {
    if (element) {
        element.classList.remove(...classNames);
    }
}

/**
 * Check if element has class
 * @param {Element} element 
 * @param {string} className 
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
}

/**
 * Set multiple attributes
 * @param {Element} element 
 * @param {Object} attrs 
 */
export function setAttributes(element, attrs) {
    if (!element) return;

    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) {
            element.removeAttribute(key);
        } else {
            element.setAttribute(key, value);
        }
    }
}

/**
 * Delegate event listener
 * @param {Element} parent 
 * @param {string} eventType 
 * @param {string} selector 
 * @param {Function} handler 
 * @returns {Function} - Cleanup function
 */
export function delegate(parent, eventType, selector, handler) {
    const listener = (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event, target);
        }
    };

    parent.addEventListener(eventType, listener);

    // Return cleanup function
    return () => parent.removeEventListener(eventType, listener);
}

/**
 * Debounce function calls
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func 
 * @param {number} limit 
 * @returns {Function}
 */
export function throttle(func, limit) {
    let inThrottle;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Wait for DOM content loaded
 * @returns {Promise}
 */
export function ready() {
    return new Promise(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    });
}

/**
 * Animate element with CSS classes
 * @param {Element} element 
 * @param {string} animationClass 
 * @returns {Promise}
 */
export function animate(element, animationClass) {
    return new Promise(resolve => {
        element.classList.add(animationClass);

        const handleAnimationEnd = () => {
            element.classList.remove(animationClass);
            element.removeEventListener('animationend', handleAnimationEnd);
            resolve();
        };

        element.addEventListener('animationend', handleAnimationEnd);
    });
}

/**
 * Show element with animation
 * @param {Element} element 
 */
export function show(element) {
    if (element) {
        element.style.display = '';
        element.classList.add('active');
    }
}

/**
 * Hide element with animation
 * @param {Element} element 
 */
export function hide(element) {
    if (element) {
        element.classList.remove('active');
        element.style.display = 'none';
    }
}