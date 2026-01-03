// Основной JavaScript файл

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    initAccessibility();
    initForms();
    initNavigation();
    initSliders();
    initModals();
    initSearch();
    
    // Проверка совместимости
    checkBrowserCompatibility();
});

// Функции доступности
function initAccessibility() {
    // Проверяем сохраненные настройки
    const style = localStorage.getItem('siteStyle') || 'standard';
    if (style === 'accessible') {
        document.body.classList.add('accessible-mode');
        document.getElementById('accessible-style').removeAttribute('disabled');
    }
    
    // Инициализация кнопок доступности
    const accessibilityBtns = document.querySelectorAll('.accessibility-btn');
    accessibilityBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('onclick');
            if (action) {
                eval(action);
            }
        });
    });
}

function toggleAccessibility() {
    const isAccessible = document.body.classList.contains('accessible-mode');
    const accessibleStyle = document.getElementById('accessible-style');
    
    if (isAccessible) {
        document.body.classList.remove('accessible-mode');
        accessibleStyle.setAttribute('disabled', 'disabled');
        localStorage.setItem('siteStyle', 'standard');
        showNotification('Стандартный режим включен');
    } else {
        document.body.classList.add('accessible-mode');
        accessibleStyle.removeAttribute('disabled');
        localStorage.setItem('siteStyle', 'accessible');
        showNotification('Режим для слабовидящих включен');
    }
}

function increaseFont() {
    let currentSize = parseInt(getComputedStyle(document.body).fontSize);
    document.body.style.fontSize = (currentSize + 2) + 'px';
    localStorage.setItem('fontSize', document.body.style.fontSize);
    showNotification('Размер шрифта увеличен');
}

function decreaseFont() {
    let currentSize = parseInt(getComputedStyle(document.body).fontSize);
    if (currentSize > 12) {
        document.body.style.fontSize = (currentSize - 2) + 'px';
        localStorage.setItem('fontSize', document.body.style.fontSize);
        showNotification('Размер шрифта уменьшен');
    }
}

function toggleContrast() {
    const contrastModes = ['contrast-white', 'contrast-black', 'contrast-blue'];
    let currentMode = document.body.dataset.contrast || 'contrast-white';
    let nextIndex = (contrastModes.indexOf(currentMode) + 1) % contrastModes.length;
    
    contrastModes.forEach(mode => document.body.classList.remove(mode));
    document.body.classList.add(contrastModes[nextIndex]);
    document.body.dataset.contrast = contrastModes[nextIndex];
    
    localStorage.setItem('contrastMode', contrastModes[nextIndex]);
    showNotification(`Режим контраста: ${getContrastModeName(contrastModes[nextIndex])}`);
}

function getContrastModeName(mode) {
    const names = {
        'contrast-white': 'Черный на белом',
        'contrast-black': 'Белый на черном',
        'contrast-blue': 'Синий на бежевом'
    };
    return names[mode] || mode;
}

// Работа с формами
function initForms() {
    // Валидация форм
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
    
    // Маска для телефона
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = '+7 (' + value.substring(1, 4) + ') ' + 
                        value.substring(4, 7) + '-' + 
                        value.substring(7, 9) + '-' + 
                        value.substring(9, 11);
            }
            this.value = value.substring(0, 18);
        });
    });
    
    // Датапикер для форм записи
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
        input.min = today;
        input.value = today;
    });
}

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        field.classList.remove('error');
        
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'field-error';
            errorMsg.textContent = 'Это поле обязательно для заполнения';
            
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
            
            field.parentNode.appendChild(errorMsg);
        }
    });
    
    // Проверка email
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            field.classList.add('error');
            isValid = false;
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'field-error';
            errorMsg.textContent = 'Введите корректный email адрес';
            
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
            
            field.parentNode.appendChild(errorMsg);
        }
    });
    
    return isValid;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Навигация
function initNavigation() {
    // Плавная прокрутка
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Активное состояние меню
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.main-nav a');
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
    
    // Мобильное меню
    initMobileMenu();
}

function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            const nav = document.querySelector('.main-nav ul');
            nav.classList.toggle('show');
            this.classList.toggle('active');
        });
    }
}

// Слайдеры
function initSliders() {
    // Инициализация баннера-слайдера
    const banners = document.querySelectorAll('.banner-slide');
    if (banners.length > 1) {
        let currentSlide = 0;
        
        function showSlide(index) {
            banners.forEach((banner, i) => {
                banner.style.opacity = i === index ? '1' : '0';
                banner.style.zIndex = i === index ? '1' : '0';
            });
        }
        
        function nextSlide() {
            currentSlide = (currentSlide + 1) % banners.length;
            showSlide(currentSlide);
        }
        
        // Автопрокрутка каждые 5 секунд
        setInterval(nextSlide, 5000);
        showSlide(0);
    }
    
    // Слайдер отзывов
    const reviews = document.querySelectorAll('.review-slide');
    if (reviews.length > 1) {
        let currentReview = 0;
        const reviewContainer = document.querySelector('.reviews-container');
        const prevBtn = document.querySelector('.prev-review');
        const nextBtn = document.querySelector('.next-review');
        
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                currentReview = (currentReview - 1 + reviews.length) % reviews.length;
                updateReviewSlider();
            });
            
            nextBtn.addEventListener('click', () => {
                currentReview = (currentReview + 1) % reviews.length;
                updateReviewSlider();
            });
        }
        
        function updateReviewSlider() {
            const offset = -currentReview * 100;
            reviewContainer.style.transform = `translateX(${offset}%)`;
        }
    }
}

// Модальные окна
function initModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.modal-close');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Закрытие по клику вне модального окна
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.classList.contains('show')) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        }
    });
}

// Поиск
function initSearch() {
    const searchInput = document.querySelector('.search-box input');
    const searchForm = document.querySelector('.search-box form');
    
    if (searchInput && searchForm) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            
            if (this.value.length >= 3) {
                searchTimeout = setTimeout(() => {
                    // AJAX поиск (можно реализовать)
                    console.log('Поиск:', this.value);
                }, 500);
            }
        });
        
        // Автодополнение
        searchInput.addEventListener('focus', function() {
            this.select();
        });
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
    
    // Закрытие по клику
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Проверка совместимости браузера
function checkBrowserCompatibility() {
    const isIE = /*@cc_on!@*/false || !!document.documentMode;
    const isEdge = !isIE && !!window.StyleMedia;
    
    if (isIE) {
        showNotification('Ваш браузер устарел. Рекомендуем использовать современный браузер для полной функциональности сайта.', 'warning');
    }
}

// AJAX функции
async function makeAjaxRequest(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('AJAX request failed:', error);
        showNotification('Ошибка при выполнении запроса', 'danger');
        return null;
    }
}

// Ленивая загрузка изображений
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('ru-RU', options);
}

// Инициализация календаря записи
function initAppointmentCalendar() {
    const calendarEl = document.querySelector('#appointmentCalendar');
    if (calendarEl) {
        // Здесь можно интегрировать библиотеку календаря
        // Например, Flatpickr или native HTML5 datepicker
    }
}

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showNotification('Произошла ошибка при работе приложения', 'danger');
});

// Экспорт функций в глобальную область видимости
window.toggleAccessibility = toggleAccessibility;
window.increaseFont = increaseFont;
window.decreaseFont = decreaseFont;
window.toggleContrast = toggleContrast;
window.showNotification = showNotification;
