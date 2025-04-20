document.addEventListener('DOMContentLoaded', () => {
    // Кнопки инструментов
    const toggleRulerButton = document.getElementById('toggleRuler');
    const toggleStyleInspectorButton = document.getElementById('toggleStyleInspector');
    const toggleGridButton = document.getElementById('toggleGrid');
    const toggleDesignCompareButton = document.getElementById('toggleDesignCompare');
    
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

    // Состояния инструментов
    let isRulerActive = false;
    let isStyleInspectorActive = false;
    let isGridActive = false;
    let isDesignCompareActive = false;

    // Инициализация content script
    async function initContentScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
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
            } catch (error) {
                // Если content script не отвечает, инжектируем его заново
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/js/ruler.js', 'src/js/style-inspector.js', 'src/js/grid.js', 'src/js/design-compare.js']
                });
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['src/css/ruler.css', 'src/css/style-inspector.css', 'src/css/grid.css', 'src/css/design-compare.css']
                });
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            toggleRulerButton.disabled = true;
            toggleStyleInspectorButton.disabled = true;
            toggleGridButton.disabled = true;
            toggleDesignCompareButton.disabled = true;
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
        }
    });
});