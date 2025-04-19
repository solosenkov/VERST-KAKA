class StyleInspector {
    constructor() {
        this.isActive = false;
        this.popup = null;
        this.bindEvents();
        this.bindEscapeKey();
    }

    bindEvents() {
        // Слушаем сообщения от popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_STYLE_INSPECTOR') {
                this.toggleInspector(message.isActive);
                sendResponse({ success: true });
            } else if (message.type === 'GET_STYLE_INSPECTOR_STATE') {
                sendResponse({ isActive: this.isActive });
            }
            return true; // Важно для поддержки асинхронных ответов
        });
    }

    bindEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.toggleInspector(false);
                // Отправляем сообщение в popup для обновления состояния кнопки
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
            document.body.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.body.addEventListener('mouseout', this.handleMouseOut.bind(this));
        } else {
            document.body.removeEventListener('mousemove', this.handleMouseMove.bind(this));
            document.body.removeEventListener('mouseout', this.handleMouseOut.bind(this));
            this.removePopup();
        }
    }

    handleMouseMove(e) {
        if (!this.isActive) return;

        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === this.popup) return;

        this.showStyleInfo(element, e.clientX, e.clientY);
    }

    handleMouseOut(e) {
        if (!this.isActive) return;
        
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !document.body.contains(relatedTarget)) {
            this.removePopup();
        }
    }

    showStyleInfo(element, x, y) {
        const styles = window.getComputedStyle(element);
        
        if (!this.popup) {
            this.popup = document.createElement('div');
            this.popup.className = 'style-inspector-popup';
            document.body.appendChild(this.popup);
        }

        // Собираем информацию о стилях
        const styleInfo = {
            font: {
                title: 'Шрифт',
                items: {
                    'Семейство': styles.fontFamily,
                    'Размер': styles.fontSize,
                    'Вес': styles.fontWeight,
                    'Стиль': styles.fontStyle
                }
            },
            color: {
                title: 'Цвета',
                items: {
                    'Текст': styles.color,
                    'Фон': styles.backgroundColor
                }
            },
            spacing: {
                title: 'Отступы',
                items: {
                    'Внешние': `${styles.marginTop} ${styles.marginRight} ${styles.marginBottom} ${styles.marginLeft}`,
                    'Внутренние': `${styles.paddingTop} ${styles.paddingRight} ${styles.paddingBottom} ${styles.paddingLeft}`
                }
            },
            border: {
                title: 'Границы',
                items: {
                    'Стиль': styles.borderStyle,
                    'Цвет': styles.borderColor,
                    'Ширина': styles.borderWidth,
                    'Радиус': styles.borderRadius
                }
            }
        };

        // Формируем HTML для popup
        let html = '';
        for (const [group, data] of Object.entries(styleInfo)) {
            html += `
                <div class="style-info-group">
                    <div class="style-info-group-title">${data.title}</div>
                    ${Object.entries(data.items).map(([label, value]) => `
                        <div class="style-info-item">
                            <span class="style-info-label">${label}:</span>
                            <span class="style-info-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Улучшенное позиционирование popup
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Устанавливаем popup сначала в невидимое состояние для измерения размеров
        this.popup.style.visibility = 'hidden';
        this.popup.innerHTML = html;
        
        // Получаем размеры popup после добавления контента
        const popupRect = this.popup.getBoundingClientRect();
        const popupWidth = popupRect.width;
        const popupHeight = popupRect.height;

        // Рассчитываем оптимальную позицию
        let posX = x + 10;
        let posY = y + 10;

        // Проверяем и корректируем позицию по горизонтали
        if (posX + popupWidth > viewportWidth + scrollX) {
            posX = x - popupWidth - 10;
        }

        // Проверяем и корректируем позицию по вертикали
        if (posY + popupHeight > viewportHeight + scrollY) {
            posY = y - popupHeight - 10;
        }

        // Убеждаемся, что popup не выходит за левую и верхнюю границы
        posX = Math.max(scrollX, posX);
        posY = Math.max(scrollY, posY);

        // Применяем позицию и делаем popup видимым
        this.popup.style.left = `${posX}px`;
        this.popup.style.top = `${posY}px`;
        this.popup.style.visibility = 'visible';
    }

    removePopup() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }
}

// Инициализируем инспектор стилей
new StyleInspector();