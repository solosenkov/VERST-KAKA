// accessibility-check.js - проверка размера интерактивных элементов

(() => {
    let isActive = false;
    let minTargetSize = 44; // По умолчанию 44px по стандарту WCAG
    let highlightedElements = [];
    let styleSheet = null;
    
    // Инжектирование стилей
    function injectStyles() {
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'accessibility-check-styles';
            document.head.appendChild(styleSheet);
        }
        
        styleSheet.textContent = `
            .accessibility-target-highlight {
                position: relative;
                outline: 2px dashed red !important;
                outline-offset: 2px !important;
            }
            
            .accessibility-target-highlight::after {
                content: "← Размер меньше ${minTargetSize}px";
                position: absolute;
                background-color: red;
                color: white;
                padding: 2px 6px;
                font-size: 12px;
                font-family: Arial, sans-serif;
                border-radius: 3px;
                z-index: 9999;
                pointer-events: none;
                top: -20px;
                left: 0;
                white-space: nowrap;
            }
        `;
    }
    
    // Удаление стилей
    function removeStyles() {
        const styleElement = document.getElementById('accessibility-check-styles');
        if (styleElement) {
            styleElement.remove();
            styleSheet = null;
        }
    }
    
    // Проверка размеров интерактивных элементов
    function checkAccessibilityTargets() {
        // Очистка предыдущих выделений
        clearHighlights();
        
        // Получение всех интерактивных элементов
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]');
        
        interactiveElements.forEach(element => {
            // Получить размеры элемента
            const rect = element.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            // Проверить, имеет ли элемент меньший размер, чем минимальный
            if (width < minTargetSize || height < minTargetSize) {
                // Подсветить элемент
                element.classList.add('accessibility-target-highlight');
                highlightedElements.push(element);
            }
        });
    }
    
    // Очистка подсветок
    function clearHighlights() {
        highlightedElements.forEach(element => {
            if (element) {
                element.classList.remove('accessibility-target-highlight');
            }
        });
        highlightedElements = [];
    }
    
    // Активация проверки
    function enable() {
        isActive = true;
        injectStyles();
        checkAccessibilityTargets();
        
        // Наблюдение за изменениями DOM
        if (!window.accessibilityObserver) {
            window.accessibilityObserver = new MutationObserver(() => {
                if (isActive) {
                    checkAccessibilityTargets();
                }
            });
            
            window.accessibilityObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });
        }
    }
    
    // Деактивация проверки
    function disable() {
        isActive = false;
        clearHighlights();
        removeStyles();
        
        // Отключение наблюдателя
        if (window.accessibilityObserver) {
            window.accessibilityObserver.disconnect();
            window.accessibilityObserver = null;
        }
    }
    
    // Обновление минимального размера цели
    function updateMinTargetSize(newSize) {
        minTargetSize = newSize;
        if (isActive) {
            injectStyles(); // Обновляем стили с новым значением
            checkAccessibilityTargets(); // Перепроверяем все элементы
        }
    }
    
    // Обработчик сообщений
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'TOGGLE_ACCESSIBILITY_CHECK') {
            if (message.isActive) {
                minTargetSize = message.minTargetSize || minTargetSize;
                enable();
            } else {
                disable();
            }
            sendResponse({ success: true });
            
            // Отправляем сообщение об изменении состояния
            chrome.runtime.sendMessage({
                type: 'ACCESSIBILITY_CHECK_STATE_CHANGED',
                isActive: isActive,
                minTargetSize: minTargetSize
            });
        } else if (message.type === 'GET_ACCESSIBILITY_CHECK_STATE') {
            sendResponse({
                isActive: isActive,
                minTargetSize: minTargetSize
            });
        } else if (message.type === 'UPDATE_MIN_TARGET_SIZE') {
            updateMinTargetSize(message.minTargetSize);
            sendResponse({ success: true });
        }
        return true;
    });
})();