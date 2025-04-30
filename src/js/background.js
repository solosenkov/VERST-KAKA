// Слушаем установку расширения
chrome.runtime.onInstalled.addListener(() => {
    // Инициализируем начальное состояние
    chrome.storage.local.set({
        highContrastState: {
            isEnabled: false,
            contrastThreshold: 4.5,
            highlightLowContrastElements: true,
            highlightColor: '#FF0000',
            showContrastReport: true
        }
    });
});

// Слушаем сообщения от popup и content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_HIGH_CONTRAST_STATE') {
        chrome.storage.local.get(['highContrastState'], (result) => {
            sendResponse(result.highContrastState);
        });
        return true; // Важно для асинхронного ответа
    }
    
    if (request.type === 'SET_HIGH_CONTRAST_STATE') {
        chrome.storage.local.set({ highContrastState: request.state }, () => {
            // Оповещаем все вкладки об изменении состояния
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'HIGH_CONTRAST_STATE_UPDATED',
                        state: request.state
                    }).catch(() => {
                        // Игнорируем ошибки для вкладок, где контент скрипт не запущен
                    });
                });
            });
            sendResponse({ success: true });
        });
        return true;
    }
});