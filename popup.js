// popup.js - Interactive popup logic for LinkedIn Zip Solver (Manifest V3 CSP Compliant)

document.addEventListener('DOMContentLoaded', () => {
    const statusBox = document.getElementById('status-box');
    const actionsContainer = document.getElementById('actions-container');
    const solveBtn = document.getElementById('popup-solve-btn');
    const showBtn = document.getElementById('popup-show-btn');
    const autoPlayBtn = document.getElementById('popup-autoplay-btn');
    const clearBtn = document.getElementById('popup-clear-btn');
    const helpLink = document.getElementById('help-link');

    // Query current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.url) {
            updateStatus('error', 'Unable to detect active tab');
            return;
        }

        const isLinkedInGames = activeTab.url.includes('linkedin.com/games');

        if (!isLinkedInGames) {
            updateStatus('warning', 'Please navigate to a LinkedIn game page (e.g. linkedin.com/games/zip) to use the solver.');
            if (actionsContainer) actionsContainer.style.opacity = '0.5';
            return;
        }

        // Send handshake to content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'getStatus' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                updateStatus('info', 'Extension loaded. If on a Zip puzzle, refresh the page to attach.');
            } else if (response.hasSolution) {
                updateStatus('success', `Solution ready: ${response.stepCount} steps!`);
            } else if (response.hasGrid) {
                updateStatus('success', 'Zip puzzle detected! Ready to solve.');
            } else {
                updateStatus('info', 'Ready on LinkedIn Games. Open a Zip puzzle to begin.');
            }
        });
    });

    function sendAction(actionName) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: actionName }, (res) => {
                if (chrome.runtime.lastError) {
                    updateStatus('error', 'Could not communicate with the page. Try refreshing the game tab.');
                } else if (actionName === 'solve') {
                    updateStatus('success', res && res.steps ? `Solved: ${res.steps} steps` : 'Solved!');
                } else if (actionName === 'clear') {
                    updateStatus('info', 'Overlays cleared.');
                }
            });
        });
    }

    if (solveBtn) solveBtn.addEventListener('click', () => sendAction('solve'));
    if (showBtn) showBtn.addEventListener('click', () => sendAction('showSolution'));
    if (autoPlayBtn) autoPlayBtn.addEventListener('click', () => sendAction('autoPlay'));
    if (clearBtn) clearBtn.addEventListener('click', () => sendAction('clear'));

    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/aryamantepal/LinkedInZip-Solver' });
        });
    }

    function updateStatus(type, message) {
        if (!statusBox) return;
        statusBox.textContent = message;

        statusBox.className = 'status-box';
        if (type === 'success') {
            statusBox.style.background = '#e6f4ea';
            statusBox.style.borderColor = '#ceead6';
            statusBox.style.color = '#137333';
        } else if (type === 'warning') {
            statusBox.style.background = '#fef7e0';
            statusBox.style.borderColor = '#feefc3';
            statusBox.style.color = '#b06000';
        } else if (type === 'error') {
            statusBox.style.background = '#fce8e6';
            statusBox.style.borderColor = '#fad2cf';
            statusBox.style.color = '#c5221f';
        } else {
            statusBox.style.background = '#f1f3f4';
            statusBox.style.borderColor = '#dadce0';
            statusBox.style.color = '#3c4043';
        }
    }
});
