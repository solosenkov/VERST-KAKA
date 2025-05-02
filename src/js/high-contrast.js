class HighContrastMode {
    constructor() {
        this.isEnabled = false;
        this.contrastThreshold = 4.5; // Стандартный порог контрастности WCAG
        this.largeTextThreshold = 3.0; // Порог для крупного текста
        this.tooltips = new Map();
        this.init();
    }

    init() {
        // Добавляем стили
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('src/css/high-contrast.css');
        document.head.appendChild(link);
    }

    // Вычисление контраста между двумя цветами
    calculateContrast(color1, color2) {
        const getLuminance = (r, g, b) => {
            const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const [r1, g1, b1] = this.parseColor(color1);
        const [r2, g2, b2] = this.parseColor(color2);

        const l1 = getLuminance(r1, g1, b1);
        const l2 = getLuminance(r2, g2, b2);

        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    // Парсинг цвета из различных форматов
    parseColor(color) {
        if (!color || color === 'transparent' || color === 'inherit' || color === 'initial') {
            return [255, 255, 255]; // Возвращаем белый цвет по умолчанию
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        
        // Получаем RGB значения
        const matches = ctx.fillStyle.match(/\d+/g);
        if (!matches) {
            return [255, 255, 255]; // Возвращаем белый цвет если не удалось распарсить
        }
        
        return matches.map(Number).slice(0, 3);
    }

    // Проверка элемента на достаточный контраст
    checkElementContrast(element) {
        const style = window.getComputedStyle(element);
        const backgroundColor = style.backgroundColor;
        const color = style.color;
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;

        // Определяем, является ли текст "крупным" по стандартам WCAG
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const requiredContrast = isLargeText ? this.largeTextThreshold : this.contrastThreshold;

        const contrast = this.calculateContrast(color, backgroundColor);
        
        if (contrast < requiredContrast) {
            return {
                isValid: false,
                contrast: contrast,
                required: requiredContrast,
                recommendation: this.getContrastRecommendation(contrast, requiredContrast)
            };
        }

        return { isValid: true, contrast: contrast };
    }

    // Получение рекомендаций по улучшению контраста
    getContrastRecommendation(current, required) {
        const diff = required - current;
        if (diff <= 1) {
            return 'Немного увеличьте контраст между текстом и фоном';
        } else if (diff <= 2) {
            return 'Значительно увеличьте контраст между текстом и фоном';
        }
        return 'Полностью пересмотрите цветовую схему для этого элемента';
    }

    // Показ всплывающей подсказки
    showTooltip(element, data) {
        const tooltip = document.createElement('div');
        tooltip.className = 'contrast-tooltip';
        tooltip.innerHTML = `
            <div>Текущий контраст: ${data.contrast.toFixed(2)}</div>
            <div>Требуемый контраст: ${data.required}</div>
            <div>${data.recommendation}</div>
        `;

        element.appendChild(tooltip);
        this.tooltips.set(element, tooltip);

        // Позиционирование подсказки
        const rect = element.getBoundingClientRect();
        tooltip.style.top = rect.top + window.scrollY + 'px';
        tooltip.style.left = rect.left + window.scrollX + 'px';
    }

    // Удаление всплывающей подсказки
    removeTooltip(element) {
        const tooltip = this.tooltips.get(element);
        if (tooltip) {
            tooltip.remove();
            this.tooltips.delete(element);
        }
    }

    // Создание отчета о проблемах контрастности
    generateReport(problems) {
        const report = document.createElement('div');
        report.className = 'contrast-report';
        report.innerHTML = `
            <h3>Отчет о проблемах контрастности</h3>
            <div class="contrast-report-content">
                ${problems.map(p => `
                    <div class="contrast-report-item error">
                        <div>Элемент: ${p.element.tagName.toLowerCase()}</div>
                        <div>Текущий контраст: ${p.data.contrast.toFixed(2)}</div>
                        <div>Требуется: ${p.data.required}</div>
                        <div>${p.data.recommendation}</div>
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(report);
        return report;
    }

    // Включение режима высокой контрастности
    enable() {
        this.isEnabled = true;
        document.documentElement.classList.add('high-contrast');
        
        const problems = [];
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, input[type="text"]');
        
        textElements.forEach(element => {
            const contrastData = this.checkElementContrast(element);
            if (!contrastData.isValid) {
                element.classList.add('low-contrast-warning');
                problems.push({ element, data: contrastData });
                
                element.addEventListener('mouseenter', () => this.showTooltip(element, contrastData));
                element.addEventListener('mouseleave', () => this.removeTooltip(element));
            }
        });

        if (problems.length > 0) {
            this.currentReport = this.generateReport(problems);
        }
    }

    // Выключение режима высокой контрастности
    disable() {
        this.isEnabled = false;
        document.documentElement.classList.remove('high-contrast');
        
        document.querySelectorAll('.low-contrast-warning').forEach(element => {
            element.classList.remove('low-contrast-warning');
            this.removeTooltip(element);
        });

        if (this.currentReport) {
            this.currentReport.remove();
            this.currentReport = null;
        }
    }

    // Переключение режима
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    // Экспорт отчета
    exportReport() {
        const problems = Array.from(document.querySelectorAll('.low-contrast-warning')).map(element => {
            const contrastData = this.checkElementContrast(element);
            return {
                element: {
                    tagName: element.tagName,
                    textContent: element.textContent.slice(0, 50) + '...',
                    classList: Array.from(element.classList)
                },
                contrastData
            };
        });

        const report = {
            date: new Date().toISOString(),
            url: window.location.href,
            problems
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contrast-report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Получение текущих настроек
    getSettings() {
        return {
            contrastThreshold: this.contrastThreshold,
            isEnabled: this.isEnabled
        };
    }
}

// Создаем экземпляр класса при загрузке скрипта
const highContrastMode = new HighContrastMode();

// Слушатель сообщений от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleHighContrast') {
        if (request.enabled) {
            highContrastMode.enable();
        } else {
            highContrastMode.disable();
        }
        sendResponse({ success: true });
    } else if (request.action === 'updateHighContrastSettings') {
        if (request.settings) {
            highContrastMode.contrastThreshold = request.settings.contrastThreshold;
            if (highContrastMode.isEnabled) {
                highContrastMode.disable();
                highContrastMode.enable();
            }
        }
        sendResponse({ success: true });
    } else if (request.action === 'exportContrastReport') {
        highContrastMode.exportReport();
        sendResponse({ success: true });
    } else if (request.action === 'getHighContrastState') {
        sendResponse(highContrastMode.getSettings());
    }
    return true; // Важно для асинхронных ответов
});