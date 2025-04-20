class StyleInspector {
    constructor() {
        this.isActive = false;
        this.tooltip = null;
        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_STYLE_INSPECTOR') {
                this.toggleInspector(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'GET_STYLE_INSPECTOR_STATE') {
                sendResponse({ isActive: this.isActive });
            }
            return true;
        });
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleInspector(false);
                chrome.runtime.sendMessage({
                    type: 'STYLE_INSPECTOR_STATE_CHANGED',
                    isActive: false
                });
            }
        });
    }

    toggleInspector(state) {
        this.isActive = state;
        if (this.isActive) {
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.addEventListener('mouseout', this.handleMouseOut.bind(this));
        } else {
            document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
            document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
            this.removeTooltip();
        }
    }

    handleMouseMove(e) {
        if (!this.isActive) return;

        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === this.tooltip) return;

        this.showStyleInfo(element, e.clientX, e.clientY);
    }

    handleMouseOut(e) {
        if (!this.isActive) return;
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !document.body.contains(relatedTarget)) {
            this.removeTooltip();
        }
    }

    getColorPreview(color) {
        return `<span class="color-preview" style="background-color: ${color}"></span>${color}`;
    }

    formatSpacing(top, right, bottom, left) {
        return `${top} ${right} ${bottom} ${left}`;
    }

    showStyleInfo(element, x, y) {
        const styles = window.getComputedStyle(element);
        
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'style-inspector-tooltip';
            document.body.appendChild(this.tooltip);
        }

        const styleInfo = [
            {
                title: 'Шрифт',
                items: [
                    { label: 'Семейство', value: styles.fontFamily },
                    { label: 'Размер', value: styles.fontSize },
                    { label: 'Вес', value: styles.fontWeight },
                    { label: 'Стиль', value: styles.fontStyle },
                    { label: 'Высота строки', value: styles.lineHeight }
                ]
            },
            {
                title: 'Цвета',
                items: [
                    { label: 'Текст', value: this.getColorPreview(styles.color) },
                    { label: 'Фон', value: this.getColorPreview(styles.backgroundColor) }
                ]
            },
            {
                title: 'Отступы',
                items: [
                    { 
                        label: 'Внешние', 
                        value: this.formatSpacing(
                            styles.marginTop, 
                            styles.marginRight, 
                            styles.marginBottom, 
                            styles.marginLeft
                        )
                    },
                    { 
                        label: 'Внутренние', 
                        value: this.formatSpacing(
                            styles.paddingTop, 
                            styles.paddingRight, 
                            styles.paddingBottom, 
                            styles.paddingLeft
                        )
                    }
                ]
            },
            {
                title: 'Границы',
                items: [
                    { label: 'Стиль', value: styles.borderStyle },
                    { label: 'Цвет', value: this.getColorPreview(styles.borderColor) },
                    { label: 'Ширина', value: styles.borderWidth },
                    { label: 'Радиус', value: styles.borderRadius }
                ]
            },
            {
                title: 'Позиционирование',
                items: [
                    { label: 'Display', value: styles.display },
                    { label: 'Position', value: styles.position },
                    { label: 'Z-Index', value: styles.zIndex }
                ]
            }
        ];

        const html = styleInfo.map(section => `
            <div class="style-info-section">
                <div class="style-info-title">${section.title}</div>
                ${section.items.map(item => `
                    <div class="style-info-row">
                        <span class="style-info-label">${item.label}:</span>
                        <span class="style-info-value">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        `).join('');

        this.tooltip.innerHTML = html;

        // Позиционирование тултипа
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let posX = x + 15;
        let posY = y + 15;

        if (posX + tooltipRect.width > viewportWidth) {
            posX = x - tooltipRect.width - 15;
        }

        if (posY + tooltipRect.height > viewportHeight) {
            posY = y - tooltipRect.height - 15;
        }

        this.tooltip.style.left = `${posX}px`;
        this.tooltip.style.top = `${posY}px`;
    }

    removeTooltip() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}

// Инициализируем инспектор стилей
new StyleInspector();