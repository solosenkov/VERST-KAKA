class DesignCompare {
    constructor() {
        this.isActive = false;
        this.container = null;
        this.imageWrapper = null;
        this.image = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.settings = {
            opacity: 0.5,
            scale: 100,
            posX: 0,
            posY: 0
        };

        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_DESIGN_COMPARE') {
                this.toggleCompare(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'UPDATE_DESIGN_COMPARE_SETTINGS') {
                this.updateSettings(message.settings);
                sendResponse({ success: true });
            } else if (message.type === 'GET_DESIGN_COMPARE_STATE') {
                sendResponse({ 
                    isActive: this.isActive,
                    settings: this.settings
                });
            } else if (message.type === 'DESIGN_COMPARE_UPLOAD') {
                this.handleImageUpload(message.imageData);
                sendResponse({ success: true });
            }
            return true;
        });
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleCompare(false);
                chrome.runtime.sendMessage({
                    type: 'DESIGN_COMPARE_STATE_CHANGED',
                    isActive: false
                });
            }
        });
    }

    createElements() {
        // Создаем основной контейнер
        this.container = document.createElement('div');
        this.container.className = 'design-compare';
        
        // Создаем обертку для изображения
        this.imageWrapper = document.createElement('div');
        this.imageWrapper.className = 'design-compare-wrapper';
        
        // Создаем элемент изображения
        this.image = document.createElement('img');
        this.image.className = 'design-compare-image';
        
        // Добавляем хендлеры для ресайза
        const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `design-compare-handle ${pos}`;
            this.imageWrapper.appendChild(handle);
        });
        
        this.imageWrapper.appendChild(this.image);
        this.container.appendChild(this.imageWrapper);
        document.body.appendChild(this.container);
        
        this.setupDragAndResize();
    }

    setupDragAndResize() {
        // Перетаскивание изображения
        this.imageWrapper.addEventListener('mousedown', (e) => {
            if (e.target === this.imageWrapper || e.target === this.image) {
                this.startDragging(e);
            }
        });

        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Ресайз через хендлеры
        const handles = this.imageWrapper.querySelectorAll('.design-compare-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResizing(e, handle.className);
            });
        });
    }

    startDragging(e) {
        if (!this.isActive) return;
        
        this.isDragging = true;
        this.startX = e.clientX - this.settings.posX;
        this.startY = e.clientY - this.settings.posY;
        this.imageWrapper.classList.add('dragging');
    }

    handleDrag(e) {
        if (!this.isDragging) return;

        this.settings.posX = e.clientX - this.startX;
        this.settings.posY = e.clientY - this.startY;
        this.updateImagePosition();

        // Отправляем обновленные настройки в popup
        chrome.runtime.sendMessage({
            type: 'DESIGN_COMPARE_POSITION_CHANGED',
            settings: this.settings
        });
    }

    stopDragging() {
        this.isDragging = false;
        if (this.imageWrapper) {
            this.imageWrapper.classList.remove('dragging');
        }
    }

    handleImageUpload(imageData) {
        if (!this.container) {
            this.createElements();
        }

        this.image.src = imageData;
        this.updateImagePosition();
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.updateImagePosition();
    }

    updateImagePosition() {
        if (!this.image || !this.imageWrapper) return;

        const transform = `translate(${this.settings.posX}px, ${this.settings.posY}px) scale(${this.settings.scale / 100})`;
        this.imageWrapper.style.transform = transform;
        this.image.style.opacity = this.settings.opacity;
    }

    toggleCompare(state) {
        this.isActive = state;
        
        if (!this.container && state) {
            this.createElements();
        }
        
        if (this.container) {
            this.container.classList.toggle('active', state);
        }
    }
}

// Инициализируем функционал сравнения макетов
new DesignCompare();