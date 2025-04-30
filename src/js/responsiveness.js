class ResponsivenessChecker {
    constructor() {
        this.isActive = false;
        this.isCheckingAccessibility = false;
        this.minTargetSize = 44;
        this.iframe = null;
        this.container = null;
        this.originalUrl = window.location.href;
        this.deviceBar = null; // Панель с информацией о размере устройства

        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_RESPONSIVENESS') {
                this.toggleResponsiveness(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'SET_RESPONSIVENESS_SIZE') {
                this.setViewportSize(message.width, message.height);
                sendResponse({ success: true });
            } else if (message.type === 'TOGGLE_ACCESSIBILITY_CHECK') {
                this.toggleAccessibilityCheck(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'GET_RESPONSIVENESS_STATE') {
                sendResponse({ 
                    isActive: this.isActive, 
                    isCheckingAccessibility: this.isCheckingAccessibility 
                });
            }
            return true;
        });
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleResponsiveness(false);
                chrome.runtime.sendMessage({
                    type: 'RESPONSIVENESS_STATE_CHANGED',
                    isActive: false
                });
            }
        });
    }

    createViewport() {
        // Сохраняем текущую прокрутку страницы
        const scrollTop = window.scrollY;
        const scrollLeft = window.scrollX;

        // Создаем контейнер для iframe
        this.container = document.createElement('div');
        this.container.className = 'responsiveness-container';
        document.body.appendChild(this.container);

        // Создаем iframe
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'responsiveness-iframe';
        this.iframe.src = this.originalUrl;
        this.container.appendChild(this.iframe);

        // Создаем панель с информацией о размере
        this.deviceBar = document.createElement('div');
        this.deviceBar.className = 'responsiveness-device-bar';
        this.container.appendChild(this.deviceBar);

        // Восстанавливаем прокрутку в iframe после загрузки
        this.iframe.onload = () => {
            try {
                this.iframe.contentWindow.scrollTo(scrollLeft, scrollTop);
                
                // Добавляем слушатель для проверки доступности в iframe
                if (this.isCheckingAccessibility) {
                    this.checkAccessibilityTargetsInIframe();
                }
            } catch (e) {
                console.error('Ошибка доступа к iframe:', e);
            }
        };
    }

    removeViewport() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.iframe = null;
            this.deviceBar = null;
        }
    }

    setViewportSize(width, height) {
        if (!this.isActive || !this.container) return;

        // Устанавливаем размеры контейнера и iframe
        if (width) {
            this.container.style.width = `${width}px`;
            this.iframe.style.width = `${width}px`;
        }
        
        if (height) {
            this.iframe.style.height = `${height}px`;
        } else {
            // Если высота не задана, используем высоту окна минус отступы
            this.iframe.style.height = `calc(100vh - 60px)`;
        }

        // Обновляем информацию в панели размеров
        if (this.deviceBar) {
            const actualWidth = width || this.container.offsetWidth;
            const actualHeight = height || this.iframe.offsetHeight;
            this.deviceBar.textContent = `${actualWidth} × ${actualHeight}px`;
        }

        // Если проверка доступности включена, перезапускаем ее
        if (this.isCheckingAccessibility) {
            this.checkAccessibilityTargetsInIframe();
        }
    }

    toggleResponsiveness(state) {
        this.isActive = state;
        
        if (state) {
            this.createViewport();
            // Используем размер окна по умолчанию или последний установленный размер
            const defaultWidth = 375; // iPhone по умолчанию
            this.setViewportSize(defaultWidth, null);
        } else {
            this.removeViewport();
            // Сбрасываем проверку доступности
            this.toggleAccessibilityCheck(false);
        }
    }

    toggleAccessibilityCheck(state) {
        this.isCheckingAccessibility = state;
        
        if (this.isActive && this.iframe) {
            if (this.isCheckingAccessibility) {
                this.checkAccessibilityTargetsInIframe();
            } else {
                this.clearAccessibilityHighlights();
            }
        }
    }

    checkAccessibilityTargetsInIframe() {
        if (!this.iframe || !this.isCheckingAccessibility) return;
        
        try {
            // Сначала очищаем предыдущие подсветки
            this.clearAccessibilityHighlights();
            
            // Добавляем стили в iframe
            const iframeDocument = this.iframe.contentDocument;
            if (!iframeDocument) return;

            // Вставляем стили для подсветки элементов
            let styleTag = iframeDocument.getElementById('accessibility-styles');
            if (!styleTag) {
                styleTag = iframeDocument.createElement('style');
                styleTag.id = 'accessibility-styles';
                styleTag.textContent = `
                    .accessibility-target-too-small {
                        outline: 2px dashed red !important;
                        position: relative;
                    }
                    .accessibility-target-too-small::after {
                        content: 'Too small!';
                        position: absolute;
                        top: -18px;
                        left: 0;
                        background: red;
                        color: white;
                        font-size: 10px;
                        padding: 1px 3px;
                        border-radius: 2px;
                        white-space: nowrap;
                        z-index: 10001;
                    }
                `;
                iframeDocument.head.appendChild(styleTag);
            }

            // Находим все интерактивные элементы внутри iframe
            const interactiveElements = iframeDocument.querySelectorAll(
                'a, button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [tabindex]:not([tabindex="-1"])'
            );

            interactiveElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && (rect.width < this.minTargetSize || rect.height < this.minTargetSize)) {
                    el.classList.add('accessibility-target-too-small');
                }
            });
        } catch (e) {
            console.error('Ошибка проверки доступности в iframe:', e);
        }
    }

    clearAccessibilityHighlights() {
        if (!this.iframe) return;
        
        try {
            const iframeDocument = this.iframe.contentDocument;
            if (!iframeDocument) return;
            
            const elements = iframeDocument.querySelectorAll('.accessibility-target-too-small');
            elements.forEach(el => {
                el.classList.remove('accessibility-target-too-small');
            });
        } catch (e) {
            console.error('Ошибка очистки подсветки доступности:', e);
        }
    }

    // Вспомогательный метод для задержки выполнения функций
    debounce(func, wait) {
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
}

// Инициализируем проверку адаптивности
new ResponsivenessChecker();