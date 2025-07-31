document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const ageInput = document.getElementById('age');
    const smartFillToggle = document.getElementById('smartFill');
    const saveButton = document.getElementById('save');
    const fillButton = document.getElementById('fillForm');
    const statusDiv = document.getElementById('status');

    const loadData = () => {
        chrome.storage.local.get(['userInfo', 'autoAction', 'smartFill'], (result) => {
            if (result.userInfo) {
                emailInput.value = result.userInfo.email || '';
                nameInput.value = result.userInfo.name || '';
                phoneInput.value = result.userInfo.phone || '';
                ageInput.value = result.userInfo.age || '';
            }
            if (result.autoAction) {
                const radioButton = document.querySelector(`input[name="autoAction"][value="${result.autoAction}"]`);
                if (radioButton) radioButton.checked = true;
            }
            smartFillToggle.checked = result.smartFill !== false;
        });
    };

    const saveData = () => {
        const userInfo = {
            email: emailInput.value,
            name: nameInput.value,
            phone: phoneInput.value,
            age: ageInput.value
        };
        const autoActionElement = document.querySelector('input[name="autoAction"]:checked');
        const autoAction = autoActionElement ? autoActionElement.value : 'none';
        const smartFill = smartFillToggle.checked;
        
        chrome.storage.local.set({ userInfo, autoAction, smartFill }, () => {
            statusDiv.textContent = '저장되었습니다.';
            statusDiv.className = 'status success';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 2000);
        });
    };

    fillButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url || (!tab.url.startsWith('https://office.naver.com/form/') && !tab.url.startsWith('https://form.naver.com/'))) {
            statusDiv.textContent = '네이버 폼 페이지에서만 사용할 수 있습니다.';
            statusDiv.className = 'status error';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 3000);
            return;
        }

        const userInfo = {
            email: emailInput.value,
            name: nameInput.value,
            phone: phoneInput.value,
            age: ageInput.value
        };

        chrome.storage.local.get(['smartFill'], (result) => {
            const smartFill = result.smartFill !== false;
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: fillNaverForm,
                args: [userInfo, smartFill]
            });
        });

        statusDiv.textContent = '자동 입력을 실행했습니다.';
        statusDiv.className = 'status success';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 2000);
    });

    saveButton.addEventListener('click', saveData);
    loadData();
});

function fillNaverForm(userInfo, smartFill = true) {
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
        }, 50);
        setTimeout(() => { clearInterval(intervalId); }, 2000);
    };

    const fillByQuestionTitle = (value, keywords) => {
        if (!value || !smartFill) return;
        
        const intervalId = setInterval(() => {
            const questionElements = document.querySelectorAll(`
                .question_title, .form_question_title, .question-title,
                h1, h2, h3, h4, h5, h6,
                .title, .label, .field-label, .form-label,
                [class*="title"], [class*="question"], [class*="label"],
                label, .form_item_title, .item_title, .field_title
            `.replace(/\s+/g, ' ').trim());
            
            for (const questionEl of questionElements) {
                const questionText = questionEl.textContent?.toLowerCase().trim() || '';
                
                if (keywords.some(keyword => questionText.includes(keyword))) {
                    const containers = [
                        questionEl.closest('.form_question, .question_container, .form_item, .field, .input-group, .form-group'),
                        questionEl.closest('[class*="question"], [class*="item"], [class*="field"]'),
                        questionEl.parentElement,
                        questionEl.nextElementSibling
                    ].filter(Boolean);
                    
                    for (const container of containers) {
                        const input = container.querySelector('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea');
                        
                        if (input && !input.value) {
                            input.value = value;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            clearInterval(intervalId);
                            return;
                        }
                    }
                }
            }
        }, 50);
        setTimeout(() => { clearInterval(intervalId); }, 2000);
    };

    fillField(['input[name*="email"]', 'input[placeholder*="이메일"]'], userInfo.email);
    fillField(['input[name*="name"]', 'input[placeholder*="이름"]'], userInfo.name);
    fillField(['input[name*="phone"]', 'input[name*="tel"]', 'input[placeholder*="전화번호"]', 'input[placeholder*="연락처"]'], userInfo.phone);
    fillField(['input[name*="age"]', 'input[placeholder*="나이"]', 'input[placeholder*="연령"]'], userInfo.age);

    if (smartFill) {
        setTimeout(() => {
            fillByQuestionTitle(userInfo.email, ['이메일', 'email', '메일', 'mail', 'e-mail', '전자우편']);
            fillByQuestionTitle(userInfo.name, ['이름', 'name', '성명', '이름을', '성함', '이름은', 'username', '사용자명']);
            fillByQuestionTitle(userInfo.phone, ['전화번호', 'phone', 'tel', '연락처', '휴대폰', '핸드폰', '전화', 'mobile', 'contact']);
            fillByQuestionTitle(userInfo.age, ['나이', 'age', '연령']);
        }, 300);
    }
}
