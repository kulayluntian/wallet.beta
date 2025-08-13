((app) => {
    app.settings = {};

    // --- Preferences State ---
    const defaultPreferences = {
        theme: 'dark',
        graphType: 'bar', // Default graph type
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

    // --- DOM Elements ---
    const darkThemeToggle = document.getElementById("darkThemeToggle");

    // --- PREFERENCES LOGIC ---
    app.settings.save = () => {
        localStorage.setItem('walletPreferences', JSON.stringify(app.settings.preferences));
    };

    function loadPreferences() {
        const saved = localStorage.getItem('walletPreferences');
        app.settings.preferences = JSON.parse(JSON.stringify(defaultPreferences));

        if (saved) {
            try {
                const savedPrefs = JSON.parse(saved);

                if (typeof savedPrefs.theme === 'string') {
                    app.settings.preferences.theme = savedPrefs.theme;
                }
                if (typeof savedPrefs.graphType === 'string') {
                    app.settings.preferences.graphType = savedPrefs.graphType;
                }

                if (savedPrefs.dateTimeFormat) {
                    app.settings.preferences.dateTimeFormat = {
                        ...defaultPreferences.dateTimeFormat,
                        ...savedPrefs.dateTimeFormat,
                        weekday: { ...defaultPreferences.dateTimeFormat.weekday, ...(savedPrefs.dateTimeFormat.weekday || {}) },
                        date: { ...defaultPreferences.dateTimeFormat.date, ...(savedPrefs.dateTimeFormat.date || {}) },
                        time: { ...defaultPreferences.dateTimeFormat.time, ...(savedPrefs.dateTimeFormat.time || {}) },
                    };
                }
                if (app.settings.preferences.dateTimeFormat.order.includes('time')) {
                    app.settings.preferences.dateTimeFormat.order = app.settings.preferences.dateTimeFormat.order.filter(p => p !== 'time');
                }
            } catch (e) {
                console.error("Failed to parse saved preferences, using defaults.", e);
            }
        }
        applyPreferences();
    }

    function applyPreferences() {
        document.body.classList.toggle('dark-mode', app.settings.preferences.theme === 'dark');
        document.body.classList.toggle('light-mode', app.settings.preferences.theme === 'light');
        darkThemeToggle.checked = app.settings.preferences.theme === 'dark';

        const dtPrefs = app.settings.preferences.dateTimeFormat;
        const formatOrderList = document.getElementById('formatOrder');
        formatOrderList.innerHTML = '';
        const validOrderParts = ['weekday', 'date'];
        
        dtPrefs.order = dtPrefs.order.filter(part => validOrderParts.includes(part));

        dtPrefs.order.forEach(part => {
            const li = document.createElement('li');
            li.draggable = true;
            li.dataset.orderPart = part;
            li.textContent = part.charAt(0).toUpperCase() + part.slice(1);
            formatOrderList.appendChild(li);
        });

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
    
    // --- DATE & TIME SETTINGS EVENT LISTENERS ---
    function setupDateTimeListeners() {
        const settingsContainer = document.getElementById('dateTimeSettings');
        settingsContainer.addEventListener('change', (e) => {
            const dtPrefs = app.settings.preferences.dateTimeFormat;
            const target = e.target;

            if (target.type === 'checkbox') {
                if (target.id === 'showWeekday') { dtPrefs.weekday.show = target.checked; document.getElementById('weekdayOptions').classList.toggle('hidden', !target.checked); }
                if (target.id === 'showDate') { dtPrefs.date.show = target.checked; document.getElementById('dateOptions').classList.toggle('hidden', !target.checked); }
                if (target.id === 'showTime') { dtPrefs.time.show = target.checked; document.getElementById('timeOptions').classList.toggle('hidden', !target.checked); }
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

            saveAndReload();
        });

        document.getElementById('separatorInput').addEventListener('input', (e) => {
            app.settings.preferences.dateTimeFormat.separator = e.target.value;
            saveAndReload();
        });

        document.getElementById('dateSeparatorInput').addEventListener('input', (e) => {
            app.settings.preferences.dateTimeFormat.date.separator = e.target.value;
            saveAndReload();
        });

        const formatOrderList = document.getElementById('formatOrder');
        let draggedItem = null;
        formatOrderList.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });
        formatOrderList.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
        formatOrderList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(formatOrderList, e.clientY);
            const currentDragged = document.querySelector('.dragging');
            if (afterElement == null) {
                formatOrderList.appendChild(currentDragged);
            } else {
                formatOrderList.insertBefore(currentDragged, afterElement);
            }
        });
        formatOrderList.addEventListener('drop', () => {
            const newOrder = [...formatOrderList.querySelectorAll('li')].map(li => li.dataset.orderPart);
            app.settings.preferences.dateTimeFormat.order = newOrder;
            saveAndReload();
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }


    darkThemeToggle.addEventListener('change', () => {
        app.settings.preferences.theme = darkThemeToggle.checked ? 'dark' : 'light';
        saveAndReload();
    });

    function saveAndReload() {
        app.settings.save();
        applyPreferences();
        app.transaction.load();
    }

    function setupAccordion() {
        const accordion = document.querySelector('.accordion');
        if (accordion) {
            const header = accordion.querySelector('.accordion-header');
            const content = accordion.querySelector('.accordion-content');

            header.addEventListener('click', function() {
                const isActive = accordion.classList.contains('active');
                content.style.maxHeight = null;
                accordion.classList.remove('active');

                if (!isActive) {
                    accordion.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        }
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
        if (!dtPrefs.time.show) {
            return '';
        }
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
            const monthStyle = p.month_format === 'full' ? 'long' : 'short';
            const yearStyle = p.year_format === 'full' ? 'numeric' : '2-digit';
            const options = { month: monthStyle, day: 'numeric', year: yearStyle };
            return dateObj.toLocaleDateString('en-US', options);
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
            hour: '2-digit',
            minute: p.show_minutes ? '2-digit' : undefined,
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
        setupAccordion();
    };

})(ZoeyWalletApp);