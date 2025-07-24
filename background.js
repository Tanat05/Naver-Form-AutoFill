chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('https://office.naver.com/form/') || tab.url.startsWith('https://form.naver.com/'))) {
        chrome.storage.local.get(['autoAction', 'userInfo'], (result) => {
            if (!result.autoAction) return;

            if (result.autoAction === 'focus') {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: focusFirstInput,
                });
            } else if (result.autoAction === 'autofill') {
                if (!result.userInfo) return;
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: fillNaverForm,
                    args: [result.userInfo],
                });
            } else if (result.autoAction === 'autofillAndFocus') {
                if (!result.userInfo) return;
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: autofillAndFocusEmpty,
                    args: [result.userInfo],
                });
            }
        });
    }
});

function focusFirstInput() {
    const selector = 'input[type="email"]:not([readonly]):not([disabled]), input[type="text"]:not([readonly]):not([disabled]), input[type="tel"]:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])';
    const intervalId = setInterval(() => {
        const firstInput = document.querySelector(selector);
        if (firstInput) {
            firstInput.focus();
            clearInterval(intervalId);
        }
    }, 100);
    setTimeout(() => { clearInterval(intervalId); }, 3000);
}

function fillNaverForm(userInfo) {
    const fillField = (selectors, value) => {
        if (!value) return;
        const selector = selectors.join(', ');
        const intervalId = setInterval(() => {
            const field = document.querySelector(selector);
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                clearInterval(intervalId);
            }
        }, 100);
        setTimeout(() => { clearInterval(intervalId); }, 3000);
    };

    fillField(['input[name*="email"]', 'input[placeholder*="이메일"]'], userInfo.email);
    fillField(['input[name*="name"]', 'input[placeholder*="이름"]'], userInfo.name);
    fillField(['input[name*="phone"]', 'input[name*="tel"]', 'input[placeholder*="전화번호"]', 'input[placeholder*="연락처"]'], userInfo.phone);
}

function autofillAndFocusEmpty(userInfo) {
    const fillField = (selectors, value) => new Promise(resolve => {
        if (!value) return resolve();
        const selector = selectors.join(', ');
        const intervalId = setInterval(() => {
            const field = document.querySelector(selector);
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                clearInterval(intervalId);
                resolve();
            }
        }, 100);
        setTimeout(() => { 
            clearInterval(intervalId);
            resolve();
        }, 3000);
    });

    const fillPromises = [
        fillField(['input[name*="email"]', 'input[placeholder*="이메일"]'], userInfo.email),
        fillField(['input[name*="name"]', 'input[placeholder*="이름"]'], userInfo.name),
        fillField(['input[name*="phone"]', 'input[name*="tel"]', 'input[placeholder*="전화번호"]', 'input[placeholder*="연락처"]'], userInfo.phone)
    ];

    Promise.all(fillPromises).then(() => {
        const allInputs = document.querySelectorAll(
            'input[type="email"]:not([readonly]):not([disabled]), input[type="text"]:not([readonly]):not([disabled]), input[type="tel"]:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
        );

        for (const input of allInputs) {
            if (!input.value) {
                input.focus();
                break;
            }
        }
    });
}