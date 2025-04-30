/**
 * Инструмент проверки размеров элементов
 * Подсвечивает элементы, которые меньше указанного минимального размера
 */

class ElementSizeCheck {
  constructor() {
    this.isActive = false;
    this.minSize = 44; // Минимальный размер по умолчанию (px)
    this.highlightColor = '#FF5733';
    this.showDimensions = true;
    this.overlays = [];
    this.controlPanel = null;
    
    this.onMouseMove = this.onMouseMove.bind(this);
    this.highlightElements = this.highlightElements.bind(this);
    this.createControlPanel = this.createControlPanel.bind(this);
    this.removeControlPanel = this.removeControlPanel.bind(this);
    this.updateMinSize = this.updateMinSize.bind(this);
  }

  /**
   * Активировать проверку размеров элементов
   */
  activate() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Создаем панель управления с ползунком
    this.createControlPanel();
    
    // Запускаем подсветку элементов
    this.highlightElements();
    
    // Добавляем обработчик движения мыши для обновления позиции меток с размерами
    document.addEventListener('mousemove', this.onMouseMove);
    
    // Обновляем подсветку при прокрутке
    document.addEventListener('scroll', this.highlightElements, { passive: true });
    
    // Обновляем подсветку при изменении размера окна
    window.addEventListener('resize', this.highlightElements);
  }

  /**
   * Деактивировать проверку размеров элементов
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Удаляем все наложения
    this.clearOverlays();
    
    // Удаляем панель управления
    this.removeControlPanel();
    
    // Удаляем обработчики событий
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('scroll', this.highlightElements);
    window.removeEventListener('resize', this.highlightElements);
  }

  /**
   * Создает контрольную панель с ползунком
   */
  createControlPanel() {
    if (this.controlPanel) return;
    
    const panel = document.createElement('div');
    panel.className = 'element-size-control-panel';
    panel.innerHTML = `
      <button class="element-size-close-btn">&times;</button>
      <h3>Проверка размеров элементов</h3>
      <div>
        <label for="size-slider">Минимальный размер: <span id="size-value">${this.minSize}px</span></label>
        <input type="range" id="size-slider" min="10" max="100" value="${this.minSize}" step="1">
      </div>
      <div>
        <label>
          <input type="checkbox" id="show-dimensions" ${this.showDimensions ? 'checked' : ''}>
          Показывать размеры
        </label>
      </div>
      <div>
        <label for="highlight-color">Цвет подсветки:</label>
        <input type="color" id="highlight-color" value="${this.highlightColor}">
      </div>
    `;
    
    document.body.appendChild(panel);
    this.controlPanel = panel;
    
    // Добавляем обработчики событий
    const closeBtn = panel.querySelector('.element-size-close-btn');
    closeBtn.addEventListener('click', () => this.deactivate());
    
    const sizeSlider = panel.querySelector('#size-slider');
    sizeSlider.addEventListener('input', this.updateMinSize);
    
    const showDimensions = panel.querySelector('#show-dimensions');
    showDimensions.addEventListener('change', (e) => {
      this.showDimensions = e.target.checked;
      this.highlightElements();
    });
    
    const colorPicker = panel.querySelector('#highlight-color');
    colorPicker.addEventListener('input', (e) => {
      this.highlightColor = e.target.value;
      document.querySelectorAll('.element-size-highlight').forEach(el => {
        el.style.outlineColor = this.highlightColor;
        el.style.backgroundColor = this.highlightColor.replace(')', ', 0.2)').replace('rgb', 'rgba');
      });
    });
  }

  /**
   * Удаляет контрольную панель
   */
  removeControlPanel() {
    if (this.controlPanel) {
      document.body.removeChild(this.controlPanel);
      this.controlPanel = null;
    }
  }

  /**
   * Обновляет значение минимального размера и перезапускает подсветку
   */
  updateMinSize(e) {
    this.minSize = parseInt(e.target.value);
    const valueDisplay = document.getElementById('size-value');
    if (valueDisplay) {
      valueDisplay.textContent = `${this.minSize}px`;
    }
    this.highlightElements();
  }

  /**
   * Очищает все наложения
   */
  clearOverlays() {
    document.querySelectorAll('.element-size-highlight').forEach(el => {
      el.classList.remove('element-size-highlight');
    });
    
    document.querySelectorAll('.element-size-dimensions').forEach(el => {
      document.body.removeChild(el);
    });
    
    this.overlays = [];
  }

  /**
   * Подсвечивает элементы меньше указанного размера
   */
  highlightElements() {
    // Очищаем предыдущие наложения
    this.clearOverlays();
    
    // Находим все интерактивные элементы
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex]');
    
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Проверяем, меньше ли элемент минимального размера
      if (width < this.minSize || height < this.minSize) {
        element.classList.add('element-size-highlight');
        
        if (this.showDimensions) {
          const dimensionsElement = document.createElement('div');
          dimensionsElement.className = 'element-size-dimensions';
          dimensionsElement.textContent = `${Math.round(width)}×${Math.round(height)}px`;
          dimensionsElement.style.top = `${rect.top + window.scrollY - 20}px`;
          dimensionsElement.style.left = `${rect.left + window.scrollX}px`;
          
          document.body.appendChild(dimensionsElement);
          this.overlays.push(dimensionsElement);
        }
      }
    });
  }

  /**
   * Обработчик движения мыши для обновления подсказок с размерами
   */
  onMouseMove(e) {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    
    // Проверяем, есть ли у элемента или его родителей класс подсветки
    let highlightedElement = null;
    let node = element;
    
    while (node && node !== document.body) {
      if (node.classList.contains('element-size-highlight')) {
        highlightedElement = node;
        break;
      }
      node = node.parentElement;
    }
    
    // Обновляем видимость меток с размерами
    if (this.showDimensions) {
      this.overlays.forEach(overlay => {
        if (overlay.classList.contains('element-size-dimensions')) {
          overlay.style.opacity = highlightedElement ? '1' : '0.5';
        }
      });
    }
  }

  /**
   * Переключает состояние инструмента
   */
  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
    return this.isActive;
  }

  /**
   * Применяет настройки
   */
  applySettings(settings) {
    if (settings.minSize !== undefined) {
      this.minSize = settings.minSize;
    }
    if (settings.showDimensions !== undefined) {
      this.showDimensions = settings.showDimensions;
    }
    if (settings.highlightColor !== undefined) {
      this.highlightColor = settings.highlightColor;
    }
    
    if (this.isActive) {
      this.highlightElements();
      
      // Обновляем значения в панели управления
      if (this.controlPanel) {
        const sizeSlider = this.controlPanel.querySelector('#size-slider');
        const sizeValue = this.controlPanel.querySelector('#size-value');
        const showDimensions = this.controlPanel.querySelector('#show-dimensions');
        const colorPicker = this.controlPanel.querySelector('#highlight-color');
        
        if (sizeSlider) sizeSlider.value = this.minSize;
        if (sizeValue) sizeValue.textContent = `${this.minSize}px`;
        if (showDimensions) showDimensions.checked = this.showDimensions;
        if (colorPicker) colorPicker.value = this.highlightColor;
      }
    }
  }
}

// Создаем экземпляр инструмента
const elementSizeCheck = new ElementSizeCheck();

// Обработка сообщений от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleElementSizeCheck') {
    const isActive = elementSizeCheck.toggle();
    sendResponse({ isActive });
  } else if (request.action === 'updateElementSizeCheckSettings') {
    elementSizeCheck.applySettings(request.settings);
    sendResponse({ success: true });
  } else if (request.action === 'getElementSizeCheckStatus') {
    sendResponse({ isActive: elementSizeCheck.isActive });
  }
});