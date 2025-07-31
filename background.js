chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('https://office.naver.com/form/') || tab.url.startsWith('https://form.naver.com/'))) {
        chrome.storage.local.get(['autoAction', 'userInfo', 'smartFill'], (result) => {
            if (!result.autoAction || result.autoAction === 'none') return;

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
                    args: [result.userInfo, result.smartFill !== false],
                });
            } else if (result.autoAction === 'autofillAndFocus') {
                if (!result.userInfo) return;
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: autofillAndFocusEmpty,
                    args: [result.userInfo, result.smartFill !== false],
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
    }, 50);
    setTimeout(() => { clearInterval(intervalId); }, 2000);
}

function fillNaverForm(userInfo, smartFill = true) {
    const showCompletionNotification = () => {
        const existingNotification = document.querySelector('.naver-form-autofill-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'naver-form-autofill-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #ffffff;
                color: #333333;
                padding: 16px 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 15px;
                max-width: 260px;
                min-width: 220px;
                border: 1px solid rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(10px);
                animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: pointer;
                user-select: none;
                transition: box-shadow 0.2s ease;
            ">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 4px; line-height: 1.4;">
                            네이버 폼 자동 채우기 완료
                        </div>
                        <div style="font-size: 14px; color: #666666; line-height: 1.4; margin-bottom: 12px;">
                            사용자 정보가 자동으로 입력되었어요
                        </div>
                        <div style="font-size: 12px; color: #999999; padding-top: 8px; border-top: 1px solid #f0f0f0;">
                            개발자: 타나트 · 
                            <a href="https://github.com/Tanat05/Naver-Form-AutoFill" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: 500;">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (!document.querySelector('#naver-form-autofill-styles')) {
            const style = document.createElement('style');
            style.id = 'naver-form-autofill-styles';
            style.textContent = `
                @keyframes slideInUp {
                    from {
                        transform: translateY(100%) scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutDown {
                    from {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    to {
                        transform: translateY(100%) scale(0.95);
                        opacity: 0;
                    }
                }
                
                .naver-form-autofill-notification:hover {
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, 8000);

        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        });
    };

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
            
            showCompletionNotification();
        }, 300);
    } else {
        showCompletionNotification();
    }
}

function autofillAndFocusEmpty(userInfo, smartFill = true) {
    const showCompletionNotification = () => {
        const existingNotification = document.querySelector('.naver-form-autofill-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'naver-form-autofill-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #ffffff;
                color: #333333;
                padding: 16px 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 15px;
                max-width: 260px;
                min-width: 220px;
                border: 1px solid rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(10px);
                animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: pointer;
                user-select: none;
                transition: box-shadow 0.2s ease;
            ">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 4px; line-height: 1.4;">
                            네이버 폼 자동 채우기 완료
                        </div>
                        <div style="font-size: 14px; color: #666666; line-height: 1.4; margin-bottom: 12px;">
                            사용자 정보가 자동으로 입력되었어요
                        </div>
                        <div style="font-size: 12px; color: #999999; padding-top: 8px; border-top: 1px solid #f0f0f0;">
                            개발자: 타나트 · 
                            <a href="https://github.com/Tanat05/Naver-Form-AutoFill" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: 500;">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (!document.querySelector('#naver-form-autofill-styles')) {
            const style = document.createElement('style');
            style.id = 'naver-form-autofill-styles';
            style.textContent = `
                @keyframes slideInUp {
                    from {
                        transform: translateY(100%) scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutDown {
                    from {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    to {
                        transform: translateY(100%) scale(0.95);
                        opacity: 0;
                    }
                }
                
                .naver-form-autofill-notification:hover {
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, 8000);
        
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        });
    };

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
        }, 50);
        setTimeout(() => { 
            clearInterval(intervalId);
            resolve();
        }, 2000);
    });

    const fillByQuestionTitle = (value, keywords) => new Promise(resolve => {
        if (!value || !smartFill) return resolve();
        
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
                            resolve();
                            return;
                        }
                    }
                }
            }
        }, 50);
        setTimeout(() => { 
            clearInterval(intervalId);
            resolve();
        }, 2000);
    });

    const fillPromises = [
        fillField(['input[name*="email"]', 'input[placeholder*="이메일"]'], userInfo.email),
        fillField(['input[name*="name"]', 'input[placeholder*="이름"]'], userInfo.name),
        fillField(['input[name*="phone"]', 'input[name*="tel"]', 'input[placeholder*="전화번호"]', 'input[placeholder*="연락처"]'], userInfo.phone),
        fillField(['input[name*="age"]', 'input[placeholder*="나이"]', 'input[placeholder*="연령"]'], userInfo.age)
    ];

    Promise.all(fillPromises).then(() => {
        if (smartFill) {
            const fallbackPromises = [
                fillByQuestionTitle(userInfo.email, ['이메일', 'email', '메일', 'mail', 'e-mail', '전자우편']),
                fillByQuestionTitle(userInfo.name, ['이름', 'name', '성명', '이름을', '성함', '이름은', 'username', '사용자명']),
                fillByQuestionTitle(userInfo.phone, ['전화번호', 'phone', 'tel', '연락처', '휴대폰', '핸드폰', '전화', 'mobile', 'contact']),
                fillByQuestionTitle(userInfo.age, ['나이', 'age', '연령'])
            ];

            Promise.all(fallbackPromises).then(() => {
                focusEmptyInput();
                showCompletionNotification();
            });
        } else {
            focusEmptyInput();
            showCompletionNotification();
        }
    });

    function focusEmptyInput() {
        const allInputs = document.querySelectorAll(
            'input[type="email"]:not([readonly]):not([disabled]), input[type="text"]:not([readonly]):not([disabled]), input[type="tel"]:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
        );

        for (const input of allInputs) {
            if (!input.value) {
                input.focus();
                break;
            }
        }
    }
}
