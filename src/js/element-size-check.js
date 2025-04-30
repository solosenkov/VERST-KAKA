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
    
    // Добавляем обработчики для элементов управления
    const closeButton = panel.querySelector('.element-size-close-btn');
    closeButton.addEventListener('click', () => {
      this.deactivate();
      chrome.runtime.sendMessage({
        type: 'ELEMENT_SIZE_CHECK_STATE_CHANGED',
        isActive: false
      });
    });
    
    const sizeSlider = panel.querySelector('#size-slider');
    sizeSlider.addEventListener('input', (e) => {
      this.updateMinSize(parseInt(e.target.value));
    });
    
    const showDimensionsCheckbox = panel.querySelector('#show-dimensions');
    showDimensionsCheckbox.addEventListener('change', (e) => {
      this.showDimensions = e.target.checked;
      this.highlightElements();
    });
    
    const highlightColorPicker = panel.querySelector('#highlight-color');
    highlightColorPicker.addEventListener('change', (e) => {
      this.highlightColor = e.target.value;
      this.highlightElements();
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
   * Обновляет минимальный размер элементов
   */
  updateMinSize(size) {
    this.minSize = size;
    if (this.controlPanel) {
      this.controlPanel.querySelector('#size-value').textContent = `${size}px`;
    }
    this.highlightElements();
  }
  
  /**
   * Подсвечивает элементы, не соответствующие минимальным размерам
   */
  highlightElements() {
    // Сначала очищаем все предыдущие наложения
    this.clearOverlays();
    
    // Находим все кликабельные элементы (ссылки, кнопки и т.д.)
    const clickableElements = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex="0"]');
    
    clickableElements.forEach(element => {
      // Получаем размеры элемента
      const rect = element.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Если любой из размеров меньше минимального, подсвечиваем
      if (width < this.minSize || height < this.minSize) {
        this.highlightElement(element, rect);
      }
    });
  }
  
  /**
   * Подсвечивает один элемент и показывает его размеры
   */
  highlightElement(element, rect) {
    // Создаем наложение
    const overlay = document.createElement('div');
    overlay.classList.add('element-size-overlay');
    overlay.style.position = 'absolute';
    overlay.style.left = `${window.scrollX + rect.left}px`;
    overlay.style.top = `${window.scrollY + rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = this.highlightColor + '66'; // Добавляем прозрачность
    overlay.style.border = `2px solid ${this.highlightColor}`;
    overlay.style.boxSizing = 'border-box';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '999999';
    
    // Если нужно, добавляем метку с размерами
    if (this.showDimensions) {
      const dimensions = document.createElement('div');
      dimensions.classList.add('element-size-dimensions');
      dimensions.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      dimensions.style.position = 'absolute';
      dimensions.style.left = '0';
      dimensions.style.top = '0';
      dimensions.style.backgroundColor = this.highlightColor;
      dimensions.style.color = '#fff';
      dimensions.style.padding = '2px 4px';
      dimensions.style.fontSize = '12px';
      dimensions.style.fontFamily = 'Arial, sans-serif';
      dimensions.style.fontWeight = 'bold';
      dimensions.style.pointerEvents = 'none';
      overlay.appendChild(dimensions);
    }
    
    document.body.appendChild(overlay);
    this.overlays.push(overlay);
  }
  
  /**
   * Удаляет все наложения с подсветкой элементов
   */
  clearOverlays() {
    this.overlays.forEach(overlay => {
      document.body.removeChild(overlay);
    });
    this.overlays = [];
  }
  
  /**
   * Обработчик движения мыши для обновления позиции меток
   */
  onMouseMove() {
    this.highlightElements();
  }
  
  /**
   * Возвращает текущее состояние и настройки инструмента
   */
  getState() {
    return {
      isActive: this.isActive,
      settings: {
        minSize: this.minSize,
        showDimensions: this.showDimensions,
        highlightColor: this.highlightColor
      }
    };
  }
  
  /**
   * Применяет новые настройки
   */
  updateSettings(settings) {
    if (settings.minSize !== undefined) {
      this.minSize = settings.minSize;
      if (this.controlPanel) {
        const sizeSlider = this.controlPanel.querySelector('#size-slider');
        const sizeValue = this.controlPanel.querySelector('#size-value');
        sizeSlider.value = settings.minSize;
        sizeValue.textContent = `${settings.minSize}px`;
      }
    }
    
    if (settings.showDimensions !== undefined) {
      this.showDimensions = settings.showDimensions;
      if (this.controlPanel) {
        const showDimensionsCheckbox = this.controlPanel.querySelector('#show-dimensions');
        showDimensionsCheckbox.checked = settings.showDimensions;
      }
    }
    
    if (settings.highlightColor !== undefined) {
      this.highlightColor = settings.highlightColor;
      if (this.controlPanel) {
        const highlightColorPicker = this.controlPanel.querySelector('#highlight-color');
        highlightColorPicker.value = settings.highlightColor;
      }
    }
    
    // Обновляем подсветку после изменения настроек
    if (this.isActive) {
      this.highlightElements();
    }
  }
}

// Инициализация инструмента проверки размеров элементов
const elementSizeCheck = new ElementSizeCheck();

// Обработчик сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Поддерживаем как новый формат (с type), так и старый (с action) для обратной совместимости
  const messageType = message.type || message.action;
  
  switch(messageType) {
    case 'TOGGLE_ELEMENT_SIZE_CHECK':
    case 'toggleElementSizeCheck':
      if (message.isActive === true) {
        elementSizeCheck.activate();
      } else if (message.isActive === false) {
        elementSizeCheck.deactivate();
      } else {
        // Переключаем состояние, если isActive не указан
        if (elementSizeCheck.isActive) {
          elementSizeCheck.deactivate();
        } else {
          elementSizeCheck.activate();
        }
      }
      
      // Отправляем ответ с текущим состоянием
      sendResponse(elementSizeCheck.getState());
      break;
    
    case 'GET_ELEMENT_SIZE_CHECK_STATE':
      sendResponse(elementSizeCheck.getState());
      break;
    
    case 'UPDATE_ELEMENT_SIZE_CHECK_SETTINGS':
      elementSizeCheck.updateSettings(message.settings);
      sendResponse(elementSizeCheck.getState());
      break;
  }
  
  // Необходимо вернуть true для асинхронных ответов
  return true;
});