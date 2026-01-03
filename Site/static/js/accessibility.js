// Функции для версии для слабовидящих

document.addEventListener('DOMContentLoaded', function() {
    initAccessibilityMode();
    initAccessibilityControls();
    initKeyboardNavigation();
    initScreenReaderSupport();
});

// Инициализация режима доступности
function initAccessibilityMode() {
    // Проверяем параметры из localStorage
    const savedStyle = localStorage.getItem('accessibilityStyle');
    const savedFontSize = localStorage.getItem('accessibilityFontSize');
    const imagesHidden = localStorage.getItem('accessibilityImagesHidden') === 'true';
    
    // Применяем сохраненные настройки
    if (savedStyle) {
        applyContrastStyle(savedStyle);
    }
    
    if (savedFontSize) {
        document.body.style.fontSize = savedFontSize + '%';
    }
    
    if (imagesHidden) {
        hideImages();
    }
    
    // Добавляем ARIA атрибуты
    enhanceAccessibility();
}

// Управление контрастом
function applyContrastStyle(style) {
    // Удаляем все классы контраста
    document.body.classList.remove(
        'contrast-white',
        'contrast-black',
        'contrast-blue'
    );
    
    // Добавляем выбранный стиль
    document.body.classList.add(style);
    localStorage.setItem('accessibilityStyle', style);
    
    // Обновляем кнопку
    updateContrastButton(style);
}

function updateContrastButton(style) {
    const buttons = document.querySelectorAll('[data-contrast-style]');
    buttons.forEach(btn => {
        if (btn.dataset.contrastStyle === style) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
}

// Управление шрифтом
function changeFontSize(action) {
    let currentSize = parseInt(getComputedStyle(document.body).fontSize);
    
    switch(action) {
        case 'increase':
            currentSize += 20;
            break;
        case 'decrease':
            currentSize -= 20;
            break;
        case 'reset':
            currentSize = 100;
            break;
    }
    
    // Ограничения
    if (currentSize < 50) currentSize = 50;
    if (currentSize > 200) currentSize = 200;
    
    document.body.style.fontSize = currentSize + '%';
    localStorage.setItem('accessibilityFontSize', currentSize);
    
    // Озвучивание изменения
    speak(`Размер шрифта установлен на ${currentSize} процентов`);
}

// Управление изображениями
function hideImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        const alt = img.getAttribute('alt') || 'Изображение без описания';
        
        // Создаем текстовую замену
        const textReplacement = document.createElement('span');
        textReplacement.className = 'image-replacement';
        textReplacement.textContent = `[ИЗОБРАЖЕНИЕ: ${alt}]`;
        textReplacement.style.cssText = `
            display: block;
            padding: 10px;
            border: 2px dashed #666;
            background: #f0f0f0;
            margin: 10px 0;
            font-weight: bold;
        `;
        
        // Сохраняем оригинальное изображение в data атрибутах
        img.dataset.originalSrc = img.src;
        img.dataset.originalDisplay = img.style.display;
        
        // Заменяем изображение текстом
        img.parentNode.insertBefore(textReplacement, img);
        img.style.display = 'none';
    });
    
    localStorage.setItem('accessibilityImagesHidden', 'true');
}

function showImages() {
    const replacements = document.querySelectorAll('.image-replacement');
    replacements.forEach(replacement => {
        const img = replacement.nextElementSibling;
        if (img && img.tagName === 'IMG') {
            img.style.display = img.dataset.originalDisplay || '';
            replacement.remove();
        }
    });
    
    localStorage.setItem('accessibilityImagesHidden', 'false');
}

function toggleImages() {
    const isHidden = localStorage.getItem('accessibilityImagesHidden') === 'true';
    
    if (isHidden) {
        showImages();
        speak('Изображения включены');
    } else {
        hideImages();
        speak('Изображения выключены. Используются текстовые описания.');
    }
}

// Навигация с клавиатуры
function initKeyboardNavigation() {
    // Добавляем tabindex для всех интерактивных элементов
    const interactiveElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]'
    );
    
    interactiveElements.forEach(el => {
        if (!el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
        }
    });
    
    // Обработка навигации с клавиатуры
    document.addEventListener('keydown', function(e) {
        // Пропуск навигации
        if (e.key === 'Tab' && e.shiftKey && document.activeElement === interactiveElements[0]) {
            e.preventDefault();
            interactiveElements[interactiveElements.length - 1].focus();
        }
        
        // Активация по Enter/Space
        if ((e.key === 'Enter' || e.key === ' ') && 
            document.activeElement.getAttribute('role') === 'button') {
            e.preventDefault();
            document.activeElement.click();
        }
        
        // Закрытие модальных окон по Escape
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const closeBtn = modal.querySelector('[data-dismiss="modal"]');
                if (closeBtn) closeBtn.click();
            });
        }
    });
}

// Поддержка скринридеров
function initScreenReaderSupport() {
    // Добавляем ARIA landmarks
    const main = document.querySelector('main');
    if (main && !main.id) {
        main.id = 'main-content';
        main.setAttribute('role', 'main');
    }
    
    // Добавляем aria-label для иконок
    const icons = document.querySelectorAll('i[class*="fa-"]');
    icons.forEach(icon => {
        const parentLink = icon.closest('a');
        const parentButton = icon.closest('button');
        
        if (!icon.hasAttribute('aria-label')) {
            // Извлекаем название иконки из класса
            const iconClass = Array.from(icon.classList).find(cls => cls.startsWith('fa-'));
            if (iconClass) {
                const iconName = iconClass.replace('fa-', '').replace('-', ' ');
                icon.setAttribute('aria-label', iconName);
            }
        }
    });
    
    // Live regions для динамического контента
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
    
    window.speak = function(message) {
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    };
}

// Улучшение доступности
function enhanceAccessibility() {
    // Добавляем заголовки для таблиц
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        if (!table.hasAttribute('summary') && !table.querySelector('caption')) {
            const caption = table.createCaption();
            caption.textContent = 'Таблица данных';
        }
        
        // Добавляем scope для заголовков
        const headers = table.querySelectorAll('th');
        headers.forEach(th => {
            if (!th.hasAttribute('scope')) {
                th.setAttribute('scope', 'col');
            }
        });
    });
    
    // Добавляем описания для форм
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (!form.hasAttribute('aria-label') && !form.hasAttribute('aria-labelledby')) {
            const legend = form.querySelector('legend');
            const heading = form.querySelector('h1, h2, h3, h4, h5, h6');
            
            if (legend) {
                form.setAttribute('aria-labelledby', legend.id || 
                    (legend.id = 'form-legend-' + Math.random().toString(36).substr(2, 9)));
            } else if (heading) {
                form.setAttribute('aria-labelledby', heading.id || 
                    (heading.id = 'form-heading-' + Math.random().toString(36).substr(2, 9)));
            } else {
                form.setAttribute('aria-label', 'Форма');
            }
        }
    });
    
    // Обеспечиваем логический порядок фокуса
    const focusableElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]'
    );
    
    let tabIndex = 0;
    focusableElements.forEach(el => {
        if (!el.hasAttribute('tabindex') || el.tabIndex < 0) {
            el.setAttribute('tabindex', ++tabIndex);
        }
    });
}

// Инициализация элементов управления
function initAccessibilityControls() {
    // Кнопки переключения стилей
    const styleButtons = document.querySelectorAll('[data-accessibility-action]');
    styleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.accessibilityAction;
            
            switch(action) {
                case 'contrast-white':
                case 'contrast-black':
                case 'contrast-blue':
                    applyContrastStyle(action);
                    speak(`Включен режим ${getContrastDescription(action)}`);
                    break;
                    
                case 'font-increase':
                    changeFontSize('increase');
                    break;
                    
                case 'font-decrease':
                    changeFontSize('decrease');
                    break;
                    
                case 'font-reset':
                    changeFontSize('reset');
                    speak('Размер шрифта сброшен');
                    break;
                    
                case 'toggle-images':
                    toggleImages();
                    break;
                    
                case 'standard-version':
                    goToStandardVersion();
                    break;
            }
        });
        
        // Поддержка клавиатуры
        button.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

function getContrastDescription(style) {
    const descriptions = {
        'contrast-white': 'черный текст на белом фоне',
        'contrast-black': 'белый текст на черном фоне',
        'contrast-blue': 'синий текст на бежевом фоне'
    };
    return descriptions[style] || style;
}

function goToStandardVersion() {
    // Очищаем настройки доступности
    localStorage.removeItem('accessibilityStyle');
    localStorage.removeItem('accessibilityFontSize');
    localStorage.removeItem('accessibilityImagesHidden');
    
    // Перенаправляем на стандартную версию
    window.location.href = '/?style=standard';
}

// Вспомогательные функции
function getCurrentContrastStyle() {
    const styles = ['contrast-white', 'contrast-black', 'contrast-blue'];
    return styles.find(style => document.body.classList.contains(style)) || 'contrast-white';
}

function isAccessibilityModeActive() {
    return document.body.classList.contains('accessible-mode');
}

// Экспорт функций
window.applyContrastStyle = applyContrastStyle;
window.changeFontSize = changeFontSize;
window.toggleImages = toggleImages;
window.goToStandardVersion = goToStandardVersion;
window.speak = speak;

// Стили для скринридеров
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
    
    .accessibility-controls button.active {
        outline: 3px solid #FF0000 !important;
        outline-offset: 2px !important;
    }
    
    :focus {
        outline: 3px solid #FF0000 !important;
        outline-offset: 2px !important;
    }
    
    .focus-highlight {
        box-shadow: 0 0 0 3px #FF0000 !important;
    }
`;
document.head.appendChild(style);
