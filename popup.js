document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const saveButton = document.getElementById('save');
    const fillButton = document.getElementById('fillForm');
    const statusDiv = document.getElementById('status');

    const loadData = () => {
        chrome.storage.local.get(['userInfo', 'autoAction'], (result) => {
            if (result.userInfo) {
                emailInput.value = result.userInfo.email || '';
                nameInput.value = result.userInfo.name || '';
                phoneInput.value = result.userInfo.phone || '';
            }
            if (result.autoAction) {
                document.querySelector(`input[name="autoAction"][value="${result.autoAction}"]`).checked = true;
            }
        });
    };

    const saveData = () => {
        const userInfo = {
            email: emailInput.value,
            name: nameInput.value,
            phone: phoneInput.value,
        };
        const autoAction = document.querySelector('input[name="autoAction"]:checked').value;
        
        chrome.storage.local.set({ userInfo, autoAction }, () => {
            statusDiv.textContent = '저장되었습니다.';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        });
    };

    fillButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const userInfo = {
            email: emailInput.value,
            name: nameInput.value,
            phone: phoneInput.value
        };

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: fillNaverForm,
            args: [userInfo]
        });
    });

    saveButton.addEventListener('click', saveData);
    loadData();
});

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