((app) => {
    app.settings = {};

    // --- State ---
    const defaultPreferences = {
        theme: 'dark',
        graphType: 'bar',
        dateTimeFormat: {
            order: ['weekday', 'date'],
            separator: ', ',
            weekday: { show: true, format: 'full' },
            date: { 
                show: true, 
                order: 'mmddyyyy', 
                month_format: 'full', 
                year_format: 'full', 
                leading_zero: true,
                separator: '/'
            },
            time: { show: true, format: '12hr', show_minutes: true, show_seconds: false }
        }
    };
    app.settings.preferences = JSON.parse(JSON.stringify(defaultPreferences));
    let categoryToDelete = null;

    // --- DOM Elements ---
    const darkThemeToggle = document.getElementById("darkThemeToggle");
    const addCategoryBtn = document.getElementById("addCategoryBtn");
    const newCategoryInput = document.getElementById("newCategoryInput");
    const customCategoryList = document.getElementById("customCategoryList");
    const deleteCategoryModal = document.getElementById("deleteCategoryConfirmModal");
    const deleteCategoryMessage = document.getElementById("deleteCategoryMessage");
    const confirmDeleteCategoryBtn = document.getElementById("confirmDeleteCategoryBtn");
    const cancelDeleteCategoryBtn = document.getElementById("cancelDeleteCategoryBtn");


    // --- CATEGORY LOGIC ---
    function handleAddCategory() {
        const newCategory = newCategoryInput.value.trim();
        if (newCategory === '') {
            alert('Category name cannot be empty.');
            return;
        }
        if (app.categoriesCache.map(c => c.toLowerCase()).includes(newCategory.toLowerCase())) {
            alert('This category already exists.');
            return;
        }

        const userAddedCategories = JSON.parse(localStorage.getItem('userAddedCategories') || '[]');
        userAddedCategories.push(newCategory);
        localStorage.setItem('userAddedCategories', JSON.stringify(userAddedCategories));

        newCategoryInput.value = '';
        app.updateCategories();
    }

    function handleDeleteCategoryRequest(e) {
        if (!e.target.classList.contains('delete-category-btn')) return;

        categoryToDelete = e.target.closest('li').dataset.category;
        deleteCategoryMessage.textContent = `Are you sure you want to delete the category "${categoryToDelete}"? This cannot be undone.`;
        deleteCategoryModal.style.display = 'flex';
    }
    
    function confirmDeleteCategory() {
        if (!categoryToDelete) return;
        
        let userAddedCategories = JSON.parse(localStorage.getItem('userAddedCategories') || '[]');
        userAddedCategories = userAddedCategories.filter(cat => cat !== categoryToDelete);
        localStorage.setItem('userAddedCategories', JSON.stringify(userAddedCategories));

        app.updateCategories();
        closeDeleteCategoryModal();
    }

    function closeDeleteCategoryModal() {
        deleteCategoryModal.style.display = 'none';
        categoryToDelete = null;
    }
    
    app.settings.renderCustomCategoryList = () => {
        const categoriesFromTransactions = [...new Set(app.allTransactionsCache.map(tx => tx.Category))];
        const allKnownCategories = new Set([...categoriesFromTransactions, ...JSON.parse(localStorage.getItem('userAddedCategories') || '[]')]);
        const customCategories = [...allKnownCategories].filter(cat => cat && !app.defaultCategories.includes(cat));

        customCategoryList.innerHTML = '';
        if (customCategories.length === 0) {
            customCategoryList.innerHTML = '<li>No custom categories yet.</li>';
        } else {
            customCategories.sort().forEach(cat => {
                const li = document.createElement('li');
                li.dataset.category = cat;
                li.innerHTML = `
                    <span>${cat}</span>
                    <button class="delete-category-btn" aria-label="Delete ${cat}">&times;</button>
                `;
                customCategoryList.appendChild(li);
            });
        }
    };

    // --- PREFERENCES LOGIC ---
    app.settings.save = () => {
        localStorage.setItem('walletPreferences', JSON.stringify(app.settings.preferences));
    };

    function loadPreferences() {
        const saved = localStorage.getItem('walletPreferences');
        if (saved) {
            try {
                const savedPrefs = JSON.parse(saved);
                // Deep merge to avoid losing nested properties on update
                app.settings.preferences = {
                    ...defaultPreferences,
                    ...savedPrefs,
                    dateTimeFormat: {
                        ...defaultPreferences.dateTimeFormat,
                        ...(savedPrefs.dateTimeFormat || {}),
                        weekday: { ...defaultPreferences.dateTimeFormat.weekday, ...(savedPrefs.dateTimeFormat?.weekday || {}) },
                        date: { ...defaultPreferences.dateTimeFormat.date, ...(savedPrefs.dateTimeFormat?.date || {}) },
                        time: { ...defaultPreferences.dateTimeFormat.time, ...(savedPrefs.dateTimeFormat?.time || {}) },
                    }
                };
            } catch (e) {
                console.error("Failed to parse saved preferences, using defaults.", e);
                app.settings.preferences = JSON.parse(JSON.stringify(defaultPreferences));
            }
        }
        applyPreferences();
    }

    function applyPreferences() {
        document.body.classList.toggle('dark-mode', app.settings.preferences.theme === 'dark');
        document.body.classList.toggle('light-mode', app.settings.preferences.theme === 'light');
        darkThemeToggle.checked = app.settings.preferences.theme === 'dark';

        const dtPrefs = app.settings.preferences.dateTimeFormat;
        
        document.getElementById('orderItem1').textContent = dtPrefs.order[0].charAt(0).toUpperCase() + dtPrefs.order[0].slice(1);
        document.getElementById('orderItem2').textContent = dtPrefs.order[1].charAt(0).toUpperCase() + dtPrefs.order[1].slice(1);

        document.getElementById('separatorInput').value = dtPrefs.separator;
        document.getElementById('showWeekday').checked = dtPrefs.weekday.show;
        document.querySelector(`input[name="weekdayFormat"][value="${dtPrefs.weekday.format}"]`).checked = true;
        document.getElementById('weekdayOptions').classList.toggle('hidden', !dtPrefs.weekday.show);
        
        document.getElementById('showDate').checked = dtPrefs.date.show;
        document.querySelector(`input[name="dateFormat"][value="${dtPrefs.date.order}"]`).checked = true;
        document.getElementById('dateSeparatorInput').value = dtPrefs.date.separator;
        document.querySelector(`input[name="monthFormat"][value="${dtPrefs.date.month_format}"]`).checked = true;
        document.querySelector(`input[name="yearFormat"][value="${dtPrefs.date.year_format}"]`).checked = true;
        document.getElementById('leadingZero').checked = dtPrefs.date.leading_zero;
        document.getElementById('dateOptions').classList.toggle('hidden', !dtPrefs.date.show);
        
        document.getElementById('showTime').checked = dtPrefs.time.show;
        document.querySelector(`input[name="timeFormat"][value="${dtPrefs.time.format}"]`).checked = true;
        document.getElementById('showMinutes').checked = dtPrefs.time.show_minutes;
        document.getElementById('showSeconds').checked = dtPrefs.time.show_seconds;
        document.getElementById('timeOptions').classList.toggle('hidden', !dtPrefs.time.show);
    }
    
    // --- EVENT LISTENERS ---
    function setupDateTimeListeners() {
        const settingsContainer = document.getElementById('dateTimeSettings');
        settingsContainer.addEventListener('change', (e) => {
            const dtPrefs = app.settings.preferences.dateTimeFormat;
            const target = e.target;

            if (target.type === 'checkbox') {
                if (target.id === 'showWeekday') dtPrefs.weekday.show = target.checked;
                if (target.id === 'showDate') dtPrefs.date.show = target.checked;
                if (target.id === 'showTime') dtPrefs.time.show = target.checked;
                if (target.id === 'leadingZero') dtPrefs.date.leading_zero = target.checked;
                if (target.id === 'showMinutes') dtPrefs.time.show_minutes = target.checked;
                if (target.id === 'showSeconds') dtPrefs.time.show_seconds = target.checked;
            } else if (target.type === 'radio') {
                if (target.name === 'weekdayFormat') dtPrefs.weekday.format = target.value;
                if (target.name === 'dateFormat') dtPrefs.date.order = target.value;
                if (target.name === 'monthFormat') dtPrefs.date.month_format = target.value;
                if (target.name === 'yearFormat') dtPrefs.date.year_format = target.value;
                if (target.name === 'timeFormat') dtPrefs.time.format = target.value;
            }
            applyPreferences(); // Apply visual change immediately
            saveAndReRender();
        });

        document.getElementById('separatorInput').addEventListener('input', (e) => { app.settings.preferences.dateTimeFormat.separator = e.target.value; saveAndReRender(); });
        document.getElementById('dateSeparatorInput').addEventListener('input', (e) => { app.settings.preferences.dateTimeFormat.date.separator = e.target.value; saveAndReRender(); });
        document.getElementById('swapOrderBtn').addEventListener('click', () => { app.settings.preferences.dateTimeFormat.order.reverse(); saveAndReRender(); });
    }

    darkThemeToggle.addEventListener('change', () => {
        app.settings.preferences.theme = darkThemeToggle.checked ? 'dark' : 'light';
        saveAndReRender();
    });

    function saveAndReRender() {
        app.settings.save();
        applyPreferences();
        if (app.transaction && app.transaction.load) {
            app.transaction.load();
        }
    }

    function setupAccordions() {
        document.querySelectorAll('.accordion .accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const accordion = header.closest('.accordion');
                const content = accordion.querySelector('.accordion-content');
                const isActive = accordion.classList.contains('active');

                accordion.classList.toggle('active', !isActive);
                content.style.maxHeight = !isActive ? content.scrollHeight + 'px' : null;
            });
        });
    }
    
    // --- DATE/TIME FORMATTING ENGINE ---
    app.settings.formatDateHeader = (dateObj) => {
        const dtPrefs = app.settings.preferences.dateTimeFormat;
        const parts = [];
        const partBuilders = { weekday: buildWeekdayPart, date: buildDatePart };

        dtPrefs.order.forEach(partKey => {
            if (partBuilders[partKey] && dtPrefs[partKey] && dtPrefs[partKey].show) {
                parts.push(partBuilders[partKey](dateObj, dtPrefs));
            }
        });
        return parts.join(dtPrefs.separator);
    };
    
    app.settings.formatTransactionTime = (dateObj) => {
        const dtPrefs = app.settings.preferences.dateTimeFormat;
        if (!dtPrefs.time.show) { return ''; }
        return buildTimePart(dateObj, dtPrefs);
    };

    function buildWeekdayPart(dateObj, prefs) {
        const format = prefs.weekday.format;
        if (format === 'full') return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        if (format === 'three') return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        if (format === 'one') return dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
        return '';
    }

    function buildDatePart(dateObj, prefs) {
        const p = prefs.date;
        let day = dateObj.getDate();
        let month = dateObj.getMonth() + 1;
        let year = dateObj.getFullYear();
        
        if (p.month_format === 'full' || p.month_format === 'three') {
            return dateObj.toLocaleDateString('en-US', { 
                month: p.month_format === 'full' ? 'long' : 'short', 
                day: 'numeric', 
                year: p.year_format === 'full' ? 'numeric' : '2-digit' 
            });
        }

        const sep = p.separator; 
        if (p.leading_zero) {
            day = String(day).padStart(2, '0');
            month = String(month).padStart(2, '0');
        }
        if (p.year_format === 'two') {
            year = String(year).slice(-2);
        }

        switch(p.order) {
            case 'ddmmyyyy': return `${day}${sep}${month}${sep}${year}`;
            case 'yyyymmdd': return `${year}${sep}${month}${sep}${day}`;
            case 'mmddyyyy': default: return `${month}${sep}${day}${sep}${year}`;
        }
    }

    function buildTimePart(dateObj, prefs) {
        const p = prefs.time;
        if (!p.show_minutes) return '';
        const options = {
            hour: 'numeric', // Use numeric for better flexibility with 12/24
            minute: '2-digit',
            second: p.show_seconds ? '2-digit' : undefined,
            hour12: p.format === '12hr',
        };
        Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);
        return dateObj.toLocaleTimeString('en-US', options);
    }

    // --- INITIALIZATION ---
    app.settings.init = () => {
        loadPreferences();
        setupDateTimeListeners(); 
        setupAccordions();
        addCategoryBtn.addEventListener('click', handleAddCategory);
        customCategoryList.addEventListener('click', handleDeleteCategoryRequest);
        confirmDeleteCategoryBtn.addEventListener('click', confirmDeleteCategory);
        cancelDeleteCategoryBtn.addEventListener('click', closeDeleteCategoryModal);
        deleteCategoryModal.addEventListener('click', (e) => {
            if (e.target === deleteCategoryModal) closeDeleteCategoryModal();
        });
    };

})(ZoeyWalletApp);