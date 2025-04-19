document.addEventListener('DOMContentLoaded', () => {
    const toggleRulerButton = document.getElementById('toggleRuler');
    const toggleStyleInspectorButton = document.getElementById('toggleStyleInspector');
    let isRulerActive = false;
    let isStyleInspectorActive = false;

    // Функция для инициализации content script
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
            } catch (error) {
                // Если content script не отвечает, инжектируем его заново
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/js/ruler.js', 'src/js/style-inspector.js']
                });
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['src/css/ruler.css', 'src/css/style-inspector.css']
                });
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            toggleRulerButton.textContent = 'Ошибка';
            toggleStyleInspectorButton.textContent = 'Ошибка';
            toggleRulerButton.disabled = true;
            toggleStyleInspectorButton.disabled = true;
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

    // Слушатель сообщений от content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'RULER_STATE_CHANGED') {
            isRulerActive = message.isActive;
            toggleRulerButton.textContent = isRulerActive ? 'Выключить линейку' : 'Включить линейку';
            toggleRulerButton.classList.toggle('active', isRulerActive);
        } else if (message.type === 'STYLE_INSPECTOR_STATE_CHANGED') {
            isStyleInspectorActive = message.isActive;
            toggleStyleInspectorButton.textContent = isStyleInspectorActive ? 
                'Выключить инспектор стилей' : 'Включить инспектор стилей';
            toggleStyleInspectorButton.classList.toggle('active', isStyleInspectorActive);
        }
    });
});