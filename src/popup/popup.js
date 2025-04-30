document.addEventListener('DOMContentLoaded', () => {
    // Кнопки инструментов
    const toggleRulerButton = document.getElementById('toggleRuler');
    const toggleStyleInspectorButton = document.getElementById('toggleStyleInspector');
    const toggleGridButton = document.getElementById('toggleGrid');
    const toggleDesignCompareButton = document.getElementById('toggleDesignCompare');
    const toggleResponsivenessButton = document.getElementById('toggleResponsiveness');
    const toggleElementSizeCheckButton = document.getElementById('toggleElementSizeCheck');
    
    // Элементы настроек сетки
    const gridSettings = document.getElementById('gridSettings');
    const gridColumns = document.getElementById('gridColumns');
    const gridRows = document.getElementById('gridRows');
    const gridColor = document.getElementById('gridColor');
    const gridOpacity = document.getElementById('gridOpacity');
    const gridGutter = document.getElementById('gridGutter');
    const opacityValue = document.getElementById('opacityValue');

    // Элементы настроек сравнения макетов
    const designCompareSettings = document.getElementById('designCompareSettings');
    const designFile = document.getElementById('designFile');
    const designOpacity = document.getElementById('designOpacity');
    const designScale = document.getElementById('designScale');
    const designPosX = document.getElementById('designPosX');
    const designPosY = document.getElementById('designPosY');
    const designOpacityValue = document.getElementById('designOpacityValue');

    // Элементы настроек адаптивности
    const responsivenessSettings = document.getElementById('responsivenessSettings');
    const presetButtons = responsivenessSettings.querySelectorAll('.responsiveness-preset-button');
    const respWidthInput = document.getElementById('respWidth');
    const respHeightInput = document.getElementById('respHeight');
    const setCustomSizeButton = document.getElementById('setCustomSize');
    const respWidthSlider = document.getElementById('respWidthSlider');
    const respWidthValue = document.getElementById('respWidthValue');
    const checkAccessibilityTargetsCheckbox = document.getElementById('checkAccessibilityTargets');

    // Элементы настроек проверки размера элементов
    const elementSizeCheckSettings = document.getElementById('elementSizeCheckSettings');
    const minElementSize = document.getElementById('minElementSize');
    const minElementSizeValue = document.getElementById('minElementSizeValue');
    const showElementDimensions = document.getElementById('showElementDimensions');
    const highlightColor = document.getElementById('highlightColor');

    // Состояния инструментов
    let isRulerActive = false;
    let isStyleInspectorActive = false;
    let isGridActive = false;
    let isDesignCompareActive = false;
    let isResponsivenessActive = false;
    let isCheckingAccessibility = false;
    let isElementSizeCheckActive = false;
    let currentWindowId = null; // Добавляем переменную для ID окна
    
    // Обновление настроек проверки размеров элементов
    // Перемещаем определение функции сюда, перед её использованием
    const updateElementSizeCheckSettings = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const settings = {
                minSize: parseInt(minElementSize.value),
                showDimensions: showElementDimensions.checked,
                highlightColor: highlightColor.value
            };

            minElementSizeValue.textContent = settings.minSize + 'px';

            await chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_ELEMENT_SIZE_CHECK_SETTINGS',
                settings
            });
        } catch (error) {
            console.error('Ошибка обновления настроек проверки размера элементов:', error);
        }
    };

    // Debounce function
    function debounce(func, wait) {
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

    // Debounced function for slider
    const debouncedSetWidth = debounce(async (width) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, {
                type: 'SET_RESPONSIVENESS_SIZE',
                width: parseInt(width),
                height: null // Только изменяем ширину через слайдер
            });
        } catch (error) {
            console.error('Ошибка установки ширины:', error);
        }
    }, 250); // 250ms delay

    // Инициализация content script
    async function initContentScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentWindowId = tab.windowId; // Получаем ID окна здесь
            
            try {
                // Проверяем состояние инструментов
                const rulerState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RULER_STATE' });
                if (rulerState && rulerState.isActive) {
                    isRulerActive = true;
                    toggleRulerButton.textContent = 'Выключить линейку';
                    toggleRulerButton.classList.add('active');
                }

                const styleInspectorState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STYLE_INSPECTOR_STATE' });
                if (styleInspectorState && styleInspectorState.isActive) {
                    isStyleInspectorActive = true;
                    toggleStyleInspectorButton.textContent = 'Выключить инспектор стилей';
                    toggleStyleInspectorButton.classList.add('active');
                }

                const gridState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_GRID_STATE' });
                if (gridState && gridState.isActive) {
                    isGridActive = true;
                    toggleGridButton.textContent = 'Выключить сетку';
                    toggleGridButton.classList.add('active');
                    gridSettings.classList.add('visible');
                    
                    // Устанавливаем значения настроек
                    if (gridState.settings) {
                        gridColumns.value = gridState.settings.columns;
                        gridRows.value = gridState.settings.rows;
                        gridColor.value = gridState.settings.color;
                        gridOpacity.value = gridState.settings.opacity;
                        opacityValue.textContent = gridState.settings.opacity;
                        gridGutter.value = gridState.settings.gutter;
                    }
                }

                const designCompareState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_DESIGN_COMPARE_STATE' });
                if (designCompareState && designCompareState.isActive) {
                    isDesignCompareActive = true;
                    toggleDesignCompareButton.textContent = 'Выключить сравнение';
                    toggleDesignCompareButton.classList.add('active');
                    designCompareSettings.classList.add('visible');
                    
                    // Устанавливаем значения настроек
                    if (designCompareState.settings) {
                        designOpacity.value = designCompareState.settings.opacity;
                        designOpacityValue.textContent = designCompareState.settings.opacity;
                        designScale.value = designCompareState.settings.scale;
                        designPosX.value = designCompareState.settings.posX;
                        designPosY.value = designCompareState.settings.posY;
                    }
                }

                const responsivenessState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RESPONSIVENESS_STATE' });
                if (responsivenessState) {
                    isResponsivenessActive = responsivenessState.isActive;
                    isCheckingAccessibility = responsivenessState.isCheckingAccessibility;
                    toggleResponsivenessButton.textContent = isResponsivenessActive ? 'Выключить адаптивность' : 'Проверить адаптивность';
                    toggleResponsivenessButton.classList.toggle('active', isResponsivenessActive);
                    responsivenessSettings.classList.toggle('visible', isResponsivenessActive);
                    checkAccessibilityTargetsCheckbox.checked = isCheckingAccessibility;
                    
                    // Установить начальное значение слайдера (если активно)
                    if (isResponsivenessActive) {
                        const win = await chrome.windows.get(tab.windowId);
                        respWidthSlider.value = win.width;
                        respWidthValue.textContent = win.width;
                    }
                }

                const elementSizeCheckState = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ELEMENT_SIZE_CHECK_STATE' });
                if (elementSizeCheckState && elementSizeCheckState.isActive) {
                    isElementSizeCheckActive = true;
                    toggleElementSizeCheckButton.textContent = 'Выключить проверку размера элементов';
                    toggleElementSizeCheckButton.classList.add('active');
                    elementSizeCheckSettings.classList.add('visible');
                    
                    // Устанавливаем значения настроек
                    if (elementSizeCheckState.settings) {
                        minElementSize.value = elementSizeCheckState.settings.minSize;
                        minElementSizeValue.textContent = elementSizeCheckState.settings.minSize + 'px';
                        showElementDimensions.checked = elementSizeCheckState.settings.showDimensions;
                        highlightColor.value = elementSizeCheckState.settings.highlightColor;
                    }
                }

            } catch (error) {
                // Если content script не отвечает, инжектируем его заново
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/js/ruler.js', 'src/js/style-inspector.js', 'src/js/grid.js', 'src/js/design-compare.js', 'src/js/responsiveness.js', 'src/js/element-size-check.js', 'src/js/accessibility-check.js']
                });
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['src/css/ruler.css', 'src/css/style-inspector.css', 'src/css/grid.css', 'src/css/design-compare.css', 'src/css/responsiveness.css', 'src/css/element-size-check.css', 'src/css/accessibility-check.css']
                });
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            toggleRulerButton.disabled = true;
            toggleStyleInspectorButton.disabled = true;
            toggleGridButton.disabled = true;
            toggleDesignCompareButton.disabled = true;
            toggleResponsivenessButton.disabled = true;
        }
    }

    // Инициализируем content script при загрузке popup
    initContentScript();

    // Обработчик для линейки
    toggleRulerButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isRulerActive = !isRulerActive;
            toggleRulerButton.textContent = isRulerActive ? 'Выключить линейку' : 'Включить линейку';
            toggleRulerButton.classList.toggle('active');

            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_RULER',
                isActive: isRulerActive
            });
        } catch (error) {
            console.error('Ошибка переключения линейки:', error);
            await initContentScript();
        }
    });

    // Обработчик для инспектора стилей
    toggleStyleInspectorButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isStyleInspectorActive = !isStyleInspectorActive;
            toggleStyleInspectorButton.textContent = isStyleInspectorActive ? 
                'Выключить инспектор стилей' : 'Включить инспектор стилей';
            toggleStyleInspectorButton.classList.toggle('active');

            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_STYLE_INSPECTOR',
                isActive: isStyleInspectorActive
            });
        } catch (error) {
            console.error('Ошибка переключения инспектора стилей:', error);
            await initContentScript();
        }
    });

    // Обработчик для сетки
    toggleGridButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isGridActive = !isGridActive;
            toggleGridButton.textContent = isGridActive ? 'Выключить сетку' : 'Включить сетку';
            toggleGridButton.classList.toggle('active');
            gridSettings.classList.toggle('visible', isGridActive);

            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_GRID',
                isActive: isGridActive
            });
        } catch (error) {
            console.error('Ошибка переключения сетки:', error);
            await initContentScript();
        }
    });

    // Обработчик для сравнения макетов
    toggleDesignCompareButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isDesignCompareActive = !isDesignCompareActive;
            toggleDesignCompareButton.textContent = isDesignCompareActive ? 
                'Выключить сравнение' : 'Сравнить макеты';
            toggleDesignCompareButton.classList.toggle('active');
            designCompareSettings.classList.toggle('visible', isDesignCompareActive);

            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_DESIGN_COMPARE',
                isActive: isDesignCompareActive
            });
        } catch (error) {
            console.error('Ошибка переключения сравнения макетов:', error);
            await initContentScript();
        }
    });

    // Обработчик для проверки адаптивности
    toggleResponsivenessButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isResponsivenessActive = !isResponsivenessActive;
            toggleResponsivenessButton.textContent = isResponsivenessActive ? 'Выключить адаптивность' : 'Проверить адаптивность';
            toggleResponsivenessButton.classList.toggle('active');
            responsivenessSettings.classList.toggle('visible', isResponsivenessActive);

            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_RESPONSIVENESS',
                isActive: isResponsivenessActive
            });

            // Если активно, устанавливаем начальное значение слайдера
            if (isResponsivenessActive) {
                // Устанавливаем значение по умолчанию (например, для мобильного)
                respWidthInput.value = "390";
                respWidthSlider.value = 390;
                respWidthValue.textContent = "390";
            }
        } catch (error) {
            console.error('Ошибка переключения режима адаптивности:', error);
            await initContentScript(); // Попробовать переинициализировать
        }
    });

    // Загрузка макета
    designFile.addEventListener('change', async (e) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'DESIGN_COMPARE_UPLOAD',
                        imageData: event.target.result
                    });
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Ошибка загрузки макета:', error);
        }
    });

    // Обновление настроек сравнения макетов
    const updateDesignCompareSettings = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const settings = {
                opacity: parseFloat(designOpacity.value),
                scale: parseInt(designScale.value),
                posX: parseInt(designPosX.value),
                posY: parseInt(designPosY.value)
            };

            designOpacityValue.textContent = settings.opacity;

            await chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_DESIGN_COMPARE_SETTINGS',
                settings
            });
        } catch (error) {
            console.error('Ошибка обновления настроек сравнения:', error);
        }
    };

    // Обработчики изменения настроек сравнения макетов
    designOpacity.addEventListener('input', updateDesignCompareSettings);
    designScale.addEventListener('input', updateDesignCompareSettings);
    designPosX.addEventListener('input', updateDesignCompareSettings);
    designPosY.addEventListener('input', updateDesignCompareSettings);

    // Обработчики изменения настроек сетки
    const updateGridSettings = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const settings = {
                columns: parseInt(gridColumns.value),
                rows: parseInt(gridRows.value),
                color: gridColor.value,
                opacity: parseFloat(gridOpacity.value),
                gutter: parseInt(gridGutter.value)
            };

            opacityValue.textContent = settings.opacity;

            await chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_GRID_SETTINGS',
                settings
            });
        } catch (error) {
            console.error('Ошибка обновления настроек сетки:', error);
        }
    };

    gridColumns.addEventListener('change', updateGridSettings);
    gridRows.addEventListener('change', updateGridSettings);
    gridColor.addEventListener('change', updateGridSettings);
    gridOpacity.addEventListener('input', updateGridSettings);
    gridGutter.addEventListener('change', updateGridSettings);

    // Обработчики для пресетов адаптивности
    presetButtons.forEach(button => {
        button.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const width = button.dataset.width ? parseInt(button.dataset.width) : null;
                const height = button.dataset.height ? parseInt(button.dataset.height) : null;

                // Снимаем выделение с других кнопок
                presetButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Отправляем команду для изменения размера iframe
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'SET_RESPONSIVENESS_SIZE',
                    width: width,
                    height: height
                });
                
                // Обновляем значение слайдера и поля ввода
                if (width) {
                    respWidthSlider.value = width;
                    respWidthValue.textContent = width;
                    respWidthInput.value = width;
                } else {
                    // Устанавливаем пропорциональный размер для десктопа
                    respWidthSlider.value = 1440;
                    respWidthValue.textContent = 1440;
                    respWidthInput.value = 1440;
                }
                
                if (height) {
                    respHeightInput.value = height;
                }

            } catch (error) {
                console.error('Ошибка установки пресета:', error);
            }
        });
    });

    // Обработчик для пользовательского размера
    setCustomSizeButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const width = respWidthInput.value ? parseInt(respWidthInput.value) : null;
            const height = respHeightInput.value ? parseInt(respHeightInput.value) : null;

            if (!width && !height) return; // Нечего применять

            // Снимаем выделение с пресетов
            presetButtons.forEach(btn => btn.classList.remove('active'));

            // Отправляем команду для изменения размера iframe
            await chrome.tabs.sendMessage(tab.id, {
                type: 'SET_RESPONSIVENESS_SIZE',
                width: width,
                height: height
            });
            
            // Обновляем значение слайдера
            if (width) {
                respWidthSlider.value = width;
                respWidthValue.textContent = width;
            }

        } catch (error) {
            console.error('Ошибка установки пользовательского размера:', error);
        }
    });

    // Обработчик для слайдера ширины
    respWidthSlider.addEventListener('input', (e) => {
        const width = e.target.value;
        respWidthValue.textContent = width;
        respWidthInput.value = width; // Обновляем и поле ввода
        // Снимаем выделение с пресетов
        presetButtons.forEach(btn => btn.classList.remove('active'));
        debouncedSetWidth(width);
    });

    // Обработчик для чекбокса проверки доступности
    checkAccessibilityTargetsCheckbox.addEventListener('change', async (e) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isCheckingAccessibility = e.target.checked;
            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_ACCESSIBILITY_CHECK',
                isActive: isCheckingAccessibility
            });
        } catch (error) {
            console.error('Ошибка переключения проверки доступности:', error);
        }
    });

    // Инициализация обработчиков событий для настроек проверки размера элементов
    if (minElementSize) {
        minElementSize.addEventListener('input', () => {
            minElementSizeValue.textContent = minElementSize.value + 'px';
            updateElementSizeCheckSettings();
        });
        
        showElementDimensions.addEventListener('change', updateElementSizeCheckSettings);
        highlightColor.addEventListener('change', updateElementSizeCheckSettings);
    }

    // Обработчик для кнопки проверки размера элементов
    toggleElementSizeCheckButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            isElementSizeCheckActive = !isElementSizeCheckActive;
            toggleElementSizeCheckButton.textContent = isElementSizeCheckActive ? 'Выключить проверку размера элементов' : 'Включить проверку размера элементов';
            toggleElementSizeCheckButton.classList.toggle('active');
            elementSizeCheckSettings.classList.toggle('visible', isElementSizeCheckActive);

            // Отправляем сообщение с единым форматом
            await chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_ELEMENT_SIZE_CHECK',
                isActive: isElementSizeCheckActive
            });
            
            // Если включаем проверку, отправляем текущие настройки
            if (isElementSizeCheckActive) {
                await updateElementSizeCheckSettings();
            }
        } catch (error) {
            console.error('Ошибка переключения проверки размера элементов:', error);
            await initContentScript();
        }
    });

    // Обработчики изменения настроек проверки размеров элементов
    minElementSize.addEventListener('input', updateElementSizeCheckSettings);
    showElementDimensions.addEventListener('change', updateElementSizeCheckSettings);
    highlightColor.addEventListener('input', updateElementSizeCheckSettings);

    // Слушатель сообщений от content scripts
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'RULER_STATE_CHANGED') {
            isRulerActive = message.isActive;
            toggleRulerButton.textContent = isRulerActive ? 'Выключить линейку' : 'Включить линейку';
            toggleRulerButton.classList.toggle('active', isRulerActive);
        } else if (message.type === 'STYLE_INSPECTOR_STATE_CHANGED') {
            isStyleInspectorActive = message.isActive;
            toggleStyleInspectorButton.textContent = isStyleInspectorActive ? 
                'Выключить инспектор стилей' : 'Включить инспектор стилей';
            toggleStyleInspectorButton.classList.toggle('active', isStyleInspectorActive);
        } else if (message.type === 'GRID_STATE_CHANGED') {
            isGridActive = message.isActive;
            toggleGridButton.textContent = isGridActive ? 'Выключить сетку' : 'Включить сетку';
            toggleGridButton.classList.toggle('active', isGridActive);
            gridSettings.classList.toggle('visible', isGridActive);
        } else if (message.type === 'DESIGN_COMPARE_STATE_CHANGED') {
            isDesignCompareActive = message.isActive;
            toggleDesignCompareButton.textContent = isDesignCompareActive ? 
                'Выключить сравнение' : 'Сравнить макеты';
            toggleDesignCompareButton.classList.toggle('active', isDesignCompareActive);
            designCompareSettings.classList.toggle('visible', isDesignCompareActive);
        } else if (message.type === 'DESIGN_COMPARE_POSITION_CHANGED') {
            if (message.settings) {
                designPosX.value = message.settings.posX;
                designPosY.value = message.settings.posY;
            }
        } else if (message.type === 'RESPONSIVENESS_STATE_CHANGED') {
            isResponsivenessActive = message.isActive;
            toggleResponsivenessButton.textContent = isResponsivenessActive ? 'Выключить адаптивность' : 'Проверить адаптивность';
            toggleResponsivenessButton.classList.toggle('active', isResponsivenessActive);
            responsivenessSettings.classList.toggle('visible', isResponsivenessActive);
            // Если выключили через Escape, сбросить чекбокс доступности
            if (!isResponsivenessActive) {
                checkAccessibilityTargetsCheckbox.checked = false;
            }
        }
    });
});