class Ruler {
    constructor() {
        this.isActive = false;
        this.startPoint = null;
        this.measurementElement = null;
        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        // Слушаем сообщения от popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_RULER') {
                this.toggleRuler(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'GET_RULER_STATE') {
                sendResponse({ isActive: this.isActive });
            }
            return true; // Важно для поддержки асинхронных ответов
        });
    }

    toggleRuler(state) {
        this.isActive = state;
        if (this.isActive) {
            document.body.style.cursor = 'crosshair';
            this.addMeasurementListeners();
        } else {
            document.body.style.cursor = 'default';
            this.removeMeasurementListeners();
            this.clearMeasurement();
        }
    }

    addMeasurementListeners() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    removeMeasurementListeners() {
        document.removeEventListener('click', this.handleClick.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    handleClick(e) {
        if (!this.isActive) return;

        if (!this.startPoint) {
            this.startPoint = {
                x: e.clientX + window.scrollX,
                y: e.clientY + window.scrollY
            };
            this.createMeasurementElement();
        } else {
            this.startPoint = null;
            setTimeout(() => this.clearMeasurement(), 2000);
        }
    }

    handleMouseMove(e) {
        if (!this.isActive || !this.startPoint || !this.measurementElement) return;

        const currentPoint = {
            x: e.clientX + window.scrollX,
            y: e.clientY + window.scrollY
        };

        this.updateMeasurement(currentPoint);
    }

    createMeasurementElement() {
        this.measurementElement = document.createElement('div');
        this.measurementElement.className = 'ruler-measurement';
        document.body.appendChild(this.measurementElement);
    }

    updateMeasurement(currentPoint) {
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        
        // Позиционируем элемент измерения
        const left = Math.min(this.startPoint.x, currentPoint.x);
        const top = Math.min(this.startPoint.y, currentPoint.y);
        
        this.measurementElement.style.cssText = `
            position: absolute;
            left: ${left}px;
            top: ${top}px;
            width: ${width}px;
            height: ${height}px;
            border: 1px dashed #007AFF;
            background: rgba(0, 122, 255, 0.1);
            pointer-events: none;
            z-index: 9999;
        `;

        // Добавляем метки с размерами
        this.measurementElement.innerHTML = `
            <div class="ruler-label horizontal">${Math.round(width)}px</div>
            <div class="ruler-label vertical">${Math.round(height)}px</div>
        `;
    }

    clearMeasurement() {
        if (this.measurementElement) {
            this.measurementElement.remove();
            this.measurementElement = null;
        }
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleRuler(false);
                // Отправляем сообщение в popup для обновления состояния кнопки
                chrome.runtime.sendMessage({
                    type: 'RULER_STATE_CHANGED',
                    isActive: false
                });
            }
        });
    }
}

// Инициализируем линейку
new Ruler();