class GridOverlay {
    constructor() {
        this.isActive = false;
        this.settings = {
            columns: 12,
            rows: 0, // 0 означает автоматическое определение на основе высоты страницы
            color: '#007AFF',
            opacity: 0.3,
            gutter: 20 // отступ между колонками в пикселях
        };
        this.overlay = null;
        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_GRID') {
                this.toggleGrid(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'UPDATE_GRID_SETTINGS') {
                this.updateSettings(message.settings);
                if (this.isActive) {
                    this.updateGrid();
                }
                sendResponse({ success: true });
            } else if (message.type === 'GET_GRID_STATE') {
                sendResponse({ 
                    isActive: this.isActive,
                    settings: this.settings
                });
            }
            return true;
        });

        // Обновляем сетку при изменении размера окна
        window.addEventListener('resize', () => {
            if (this.isActive) {
                this.updateGrid();
            }
        });
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleGrid(false);
                chrome.runtime.sendMessage({
                    type: 'GRID_STATE_CHANGED',
                    isActive: false
                });
            }
        });
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'grid-overlay';
        
        const columns = document.createElement('div');
        columns.className = 'grid-columns';
        
        const rows = document.createElement('div');
        rows.className = 'grid-rows';
        
        this.overlay.appendChild(columns);
        this.overlay.appendChild(rows);
        document.body.appendChild(this.overlay);
    }

    updateGrid() {
        if (!this.overlay) {
            this.createOverlay();
        }

        const columnsContainer = this.overlay.querySelector('.grid-columns');
        const rowsContainer = this.overlay.querySelector('.grid-rows');

        // Очищаем текущую сетку
        columnsContainer.innerHTML = '';
        rowsContainer.innerHTML = '';

        // Создаем колонки
        for (let i = 0; i < this.settings.columns; i++) {
            const column = document.createElement('div');
            column.className = 'grid-column';
            column.style.borderColor = `${this.settings.color}${Math.round(this.settings.opacity * 255).toString(16).padStart(2, '0')}`;
            columnsContainer.appendChild(column);
        }

        // Создаем строки
        const rowCount = this.settings.rows || Math.floor(window.innerHeight / 100);
        for (let i = 0; i < rowCount; i++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            row.style.borderColor = `${this.settings.color}${Math.round(this.settings.opacity * 255).toString(16, '0')}`;
            rowsContainer.appendChild(row);
        }
    }

    toggleGrid(state) {
        this.isActive = state;
        
        if (this.isActive) {
            this.updateGrid();
        } else if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}

// Инициализируем сетку
new GridOverlay();