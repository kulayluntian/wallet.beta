document.addEventListener("DOMContentLoaded", () => {
    // --- Supabase Setup ---
    const SUPABASE_URL = 'https://kikavthamaslaxxdpabj.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2F2dGhhbWFzbGF4eGRwYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzEwMTAsImV4cCI6MjA3MDY0NzAxMH0.-Opk4pzWgfJwILshx6HhyE7bi2eeur8t8x-5C2_fxGE';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let allTransactionsCache = [];

    // --- Preferences State ---
    const defaultPreferences = {
        theme: 'dark',
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
    let preferences = JSON.parse(JSON.stringify(defaultPreferences));

    // --- DOM Elements ---
    const form = document.getElementById("txForm");
    const list = document.getElementById("transactionList");
    const filter = document.getElementById("categoryFilter");
    const addBtn = document.getElementById("addBtn");
    const navButtons = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view");
    const totalBalanceDisplay = document.getElementById("totalBalanceDisplay");
    const walletTimeFilter = document.getElementById("walletTimeFilter");
    const darkThemeToggle = document.getElementById("darkThemeToggle");

    // Modal elements
    const addModal = document.getElementById("addModal");
    const actionModal = document.getElementById("actionModal");
    const editModal = document.getElementById("editModal");
    const deleteConfirmModal = document.getElementById("deleteConfirmModal");
    const editTxForm = document.getElementById("editTxForm");

    let activeTransaction = null;
    const expenseCategories = ['Food', 'Expenses', 'Miscellaneous', 'transportation', 'Savings'];

    // --- PREFERENCES LOGIC ---
    function savePreferences() {
        localStorage.setItem('walletPreferences', JSON.stringify(preferences));
    }

    function loadPreferences() {
        const saved = localStorage.getItem('walletPreferences');
        preferences = JSON.parse(JSON.stringify(defaultPreferences));

        if (saved) {
            try {
                const savedPrefs = JSON.parse(saved);
                if (typeof savedPrefs.theme === 'string') {
                    preferences.theme = savedPrefs.theme;
                }
                if (savedPrefs.dateTimeFormat) {
                    preferences.dateTimeFormat = {
                        ...defaultPreferences.dateTimeFormat,
                        ...savedPrefs.dateTimeFormat,
                        weekday: { ...defaultPreferences.dateTimeFormat.weekday, ...(savedPrefs.dateTimeFormat.weekday || {}) },
                        date: { ...defaultPreferences.dateTimeFormat.date, ...(savedPrefs.dateTimeFormat.date || {}) },
                        time: { ...defaultPreferences.dateTimeFormat.time, ...(savedPrefs.dateTimeFormat.time || {}) },
                    };
                }
                if (preferences.dateTimeFormat.order.includes('time')) {
                    preferences.dateTimeFormat.order = preferences.dateTimeFormat.order.filter(p => p !== 'time');
                }
            } catch (e) {
                console.error("Failed to parse saved preferences, using defaults.", e);
            }
        }
        applyPreferences();
    }

    function applyPreferences() {
        document.body.classList.toggle('dark-mode', preferences.theme === 'dark');
        document.body.classList.toggle('light-mode', preferences.theme === 'light');
        darkThemeToggle.checked = preferences.theme === 'dark';

        const dtPrefs = preferences.dateTimeFormat;
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
            const dtPrefs = preferences.dateTimeFormat;
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
            preferences.dateTimeFormat.separator = e.target.value;
            saveAndReload();
        });

        document.getElementById('dateSeparatorInput').addEventListener('input', (e) => {
            preferences.dateTimeFormat.date.separator = e.target.value;
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
            preferences.dateTimeFormat.order = newOrder;
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
        preferences.theme = darkThemeToggle.checked ? 'dark' : 'light';
        saveAndReload();
    });

    function saveAndReload() {
        savePreferences();
        applyPreferences();
        loadTransactions();
    }

    // *** THIS FUNCTION IS UPDATED TO FIX CLIPPING ***
    function setupAccordion() {
        const accordion = document.querySelector('.accordion');
        if (accordion) {
            const header = accordion.querySelector('.accordion-header');
            const content = accordion.querySelector('.accordion-content');

            header.addEventListener('click', function() {
                const isActive = accordion.classList.contains('active');
                // Always close first to handle resizing or dynamic content
                content.style.maxHeight = null;
                accordion.classList.remove('active');

                if (!isActive) {
                    // Then open if it was closed
                    accordion.classList.add('active');
                    // Use scrollHeight to get the content's full height
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        }
    }
    
    // --- DATE/TIME FORMATTING ENGINE ---
    function formatDateHeader(dateObj) {
        const dtPrefs = preferences.dateTimeFormat;
        const parts = [];
        const partBuilders = { weekday: buildWeekdayPart, date: buildDatePart };

        dtPrefs.order.forEach(partKey => {
            if (partBuilders[partKey] && dtPrefs[partKey] && dtPrefs[partKey].show) {
                parts.push(partBuilders[partKey](dateObj, dtPrefs));
            }
        });
        return parts.join(dtPrefs.separator);
    }
    
    function formatTransactionTime(dateObj) {
        const dtPrefs = preferences.dateTimeFormat;
        if (!dtPrefs.time.show) {
            return '';
        }
        return buildTimePart(dateObj, dtPrefs);
    }

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

    // --- VIEW NAVIGATION & OTHER FUNCTIONS ---
    // (The rest of the file from here down is unchanged)
    function showView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    }
    
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const viewId = btn.dataset.view;
            showView(viewId);
            if (viewId === 'walletView') {
                renderWalletView();
            }
        });
    });

    addBtn.addEventListener("click", () => {
        form.reset();
        document.getElementById('date').value = getTodayDateString();
        document.getElementById('time').value = getCurrentTimeString();
        document.getElementById('addAmountSign').textContent = '';
        document.getElementById('addAmountSign').className = 'amount-sign';
        addModal.style.display = 'flex';
    });

    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    function getCurrentTimeString() {
        return new Date().toTimeString().split(' ')[0];
    }
    
    function updateAmountSign(categoryValue, signElement) {
        if (!categoryValue) {
            signElement.textContent = '';
            signElement.className = 'amount-sign';
            return;
        }
        const isExpense = expenseCategories.includes(categoryValue);
        signElement.textContent = isExpense ? '−' : '+';
        signElement.className = `amount-sign ${isExpense ? 'expense' : 'income'}`;
    }

    document.getElementById('category').addEventListener('change', (e) => updateAmountSign(e.target.value, document.getElementById('addAmountSign')));
    document.getElementById('editCategory').addEventListener('change', (e) => updateAmountSign(e.target.value, document.getElementById('editAmountSign')));

    // --- WALLET VIEW LOGIC ---
    walletTimeFilter.addEventListener('change', renderWalletView);

    function getDateRanges(period) {
        const now = new Date();
        let start = new Date();
        let prevStart, prevEnd;

        switch (period) {
            case 'all':
                return { current: { start: new Date(0), end: now }, previous: null };
            case 'day':
                start.setHours(now.getHours() - 24, now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                prevStart = new Date(start.getTime());
                prevStart.setHours(prevStart.getHours() - 24);
                prevEnd = new Date(start.getTime());
                break;
            case 'week':
                const firstDayOfWeek = now.getDate() - now.getDay();
                start = new Date(now.setDate(firstDayOfWeek));
                start.setHours(0,0,0,0);
                prevStart = new Date(start.getTime());
                prevStart.setDate(start.getDate() - 7);
                prevEnd = new Date(start.getTime());
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setHours(0,0,0,0);
                prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEnd = new Date(start.getTime());
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                start.setHours(0,0,0,0);
                prevStart = new Date(now.getFullYear() - 1, 0, 1);
                prevEnd = new Date(start.getTime());
                break;
        }
        return { current: { start: start, end: new Date() }, previous: { start: prevStart, end: prevEnd }};
    }
    
    function calculateSummary(transactions, ranges) {
        const summary = { current: { funds: 0, expenses: 0, savings: 0 }, previous: { funds: 0, expenses: 0, savings: 0 } };
        const fundsCategories = ['Money'];
        const savingsCategories = ['Savings'];

        transactions.forEach(tx => {
            if (!tx.Date) return;
            const txDate = new Date(tx.Date);
            const amount = Number(tx.Amount) || 0;

            const checkPeriod = (period) => {
                if (fundsCategories.includes(tx.Category)) period.funds += amount;
                if (savingsCategories.includes(tx.Category)) period.savings += Math.abs(amount); 
                if (amount < 0) period.expenses += Math.abs(amount);
            };

            if (txDate >= ranges.current.start && txDate <= ranges.current.end) { checkPeriod(summary.current); }
            if (ranges.previous && txDate >= ranges.previous.start && txDate < ranges.previous.end) { checkPeriod(summary.previous); }
        });
        return summary;
    }

    function createSummaryCard(title, currentAmount, previousAmount, period) {
        let comparisonText = '';
        let comparisonClass = '';
        
        if (period === 'all') {
            comparisonText = 'Total accumulated';
        } else {
            const periodText = walletTimeFilter.options[walletTimeFilter.selectedIndex].text.replace('This', 'last').replace('Last 24 Hours', 'previous 24 hours');
            if (previousAmount !== 0) {
                const difference = currentAmount - previousAmount;
                const percentageChange = ((currentAmount - previousAmount) / Math.abs(previousAmount)) * 100;
                const moreOrLess = difference > 0 ? 'more' : 'less';
                comparisonText = `₱${Math.abs(difference).toFixed(2)} (${percentageChange.toFixed(0)}%) ${moreOrLess} than ${periodText.toLowerCase()}`;
                const isPositiveChange = (title === 'Expenses' && difference < 0) || (title !== 'Expenses' && difference > 0);
                comparisonClass = isPositiveChange ? 'positive' : 'negative';
            } else if (currentAmount > 0) {
                comparisonText = `No data for ${periodText.toLowerCase()}`;
            } else {
                comparisonText = 'No data for this period';
            }
        }
        return `<div class="summary-card"><div class="summary-details"><span class="summary-title">${title}</span><span class="summary-comparison ${comparisonClass}">${comparisonText}</span></div><span class="summary-amount">₱${currentAmount.toFixed(2)}</span></div>`;
    }
    
    async function renderWalletView() {
        const summaryContainer = document.getElementById('walletSummaryContainer');
        summaryContainer.innerHTML = `<p>Loading summary...</p>`;
        if (allTransactionsCache.length === 0) {
            try {
                const { data, error } = await supabaseClient.from('Wallet').select('*');
                if (error) throw error;
                allTransactionsCache = data;
            } catch (error) {
                console.error("Failed to fetch data for wallet view:", error);
                summaryContainer.innerHTML = `<p>Could not load summary data.</p>`;
                return;
            }
        }
        const period = walletTimeFilter.value;
        const ranges = getDateRanges(period);
        const summary = calculateSummary(allTransactionsCache, ranges);
        summaryContainer.innerHTML = `
            ${createSummaryCard('Funds', summary.current.funds, summary.previous.funds, period)}
            ${createSummaryCard('Expenses', summary.current.expenses, summary.previous.expenses, period)}
            ${createSummaryCard('Savings', summary.current.savings, summary.previous.savings, period)}
        `;
    }

    // --- TRANSACTION LIST LOGIC ---
    async function loadTransactions() {
        if (!supabaseClient) return; 
        list.innerHTML = "<li class='transaction'>Loading...</li>";
        const { data, error } = await supabaseClient
            .from('Wallet')
            .select('*');

        if (error) {
            console.error("Error loading transactions:", error.message);
            list.innerHTML = `<li class='transaction'>Failed to load transactions. Check console for details.</li>`;
            return;
        }

        allTransactionsCache = data;
        let totalBalance = 0;
        data.forEach(tx => {
            const amount = Number(tx.Amount) || 0;
            totalBalance += amount;
        });
        totalBalanceDisplay.textContent = `Total: ₱${totalBalance.toFixed(2)}`;
        
        list.innerHTML = "";
        const selectedCategory = filter.value;
        const filteredData = selectedCategory === "all" ? data : data.filter(tx => tx.Category === selectedCategory);
        
        if (filteredData.length === 0) {
            const message = selectedCategory === 'all' 
                ? "No transactions yet. Add one!"
                : `No transactions found for the "${selectedCategory}" category.`;
            list.innerHTML = `<li class='transaction'>${message}</li>`;
            return;
        }

        const sortedData = filteredData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        
        let lastHeaderDate = null;
        sortedData.forEach(tx => {
            if (!tx.Date) return;
            const txDate = new Date(tx.Date);
            const headerDateString = txDate.toLocaleDateString();

            if (headerDateString !== lastHeaderDate) {
                const header = document.createElement('li');
                header.className = 'date-header';
                header.textContent = formatDateHeader(txDate); 
                list.appendChild(header);
                lastHeaderDate = headerDateString;
            }

            const item = document.createElement("li");
            item.className = "transaction";
            const amount = Number(tx.Amount) || 0;
            const isExpense = amount < 0;
            const amountClass = isExpense ? 'expense' : 'income';
            const displayAmount = `${isExpense ? '−' : ''}₱${Math.abs(amount).toFixed(2)}`;
            const displayTime = formatTransactionTime(txDate);
            
            item.innerHTML = `
                <div class="tx-info">
                    <strong class="tx-description">${tx.Description}</strong>
                    <span class="tx-category">${tx.Category}${displayTime ? ` @ ${displayTime}` : ''}</span>
                </div>
                <div class="tx-amount ${amountClass}">${displayAmount}</div>`;
            item.addEventListener('click', () => openActionModal(tx));
            list.appendChild(item);
        });
    }

    // --- FORM SUBMISSION (ADD & EDIT) ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dateValue = document.getElementById("date").value;
        const timeValue = document.getElementById("time").value;
        const combinedDateTime = new Date(`${dateValue}T${timeValue}`).toISOString();

        const category = document.getElementById("category").value;
        const isExpense = expenseCategories.includes(category);
        const amount = parseFloat(document.getElementById("amount").value) || 0;
        const signedAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);

        const newEntry = {
            ID: Date.now(),
            Description: document.getElementById("description").value,
            Amount: signedAmount,
            Category: category,
            Date: combinedDateTime
        };
        
        const { error } = await supabaseClient.from('Wallet').insert([newEntry]);
        
        if (error) {
            console.error("Error adding transaction:", error.message);
        } else {
            closeAllModals();
            loadTransactions();
        }
    });
    
    editTxForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dateValue = document.getElementById("editDate").value;
        const timeValue = document.getElementById("editTime").value;
        const combinedDateTime = new Date(`${dateValue}T${timeValue}`).toISOString();
        
        const category = document.getElementById("editCategory").value;
        const isExpense = expenseCategories.includes(category);
        const amount = parseFloat(document.getElementById("editAmount").value) || 0;
        const signedAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
        
        const updatedData = {
            Description: document.getElementById("editDescription").value,
            Amount: signedAmount,
            Category: category,
            Date: combinedDateTime
        };
        
        const { error } = await supabaseClient
            .from('Wallet')
            .update(updatedData)
            .eq('ID', activeTransaction.ID);

        if (error) {
            console.error("Error updating transaction:", error.message);
        } else {
            closeAllModals();
            loadTransactions();
        }
    });
    
    // --- MODAL CONTROLS ---
    function openActionModal(transaction) {
        activeTransaction = transaction;
        actionModal.style.display = 'flex';
    }

    function closeAllModals() {
        addModal.style.display = 'none';
        actionModal.style.display = 'none';
        editModal.style.display = 'none';
        deleteConfirmModal.style.display = 'none';
        activeTransaction = null;
    }
    
    document.getElementById('editActionBtn').addEventListener('click', () => {
        actionModal.style.display = 'none';
        const txDate = new Date(activeTransaction.Date);
        const yyyymmddDate = txDate.toISOString().split('T')[0];
        const hhmmssTime = txDate.toTimeString().split(' ')[0];

        document.getElementById('editDescription').value = activeTransaction.Description;
        const category = activeTransaction.Category;
        document.getElementById('editCategory').value = category;
        document.getElementById('editDate').value = yyyymmddDate;
        document.getElementById('editTime').value = hhmmssTime;
        updateAmountSign(category, document.getElementById('editAmountSign'));
        
        const amount = Number(activeTransaction.Amount) || 0;
        document.getElementById('editAmount').value = Math.abs(amount).toFixed(2);
        
        editModal.style.display = 'flex';
    });
    
    document.getElementById('deleteActionBtn').addEventListener('click', () => {
        actionModal.style.display = 'none';
        deleteConfirmModal.style.display = 'flex';
    });
    
    document.getElementById('cancelAddBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelActionBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelEditBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeAllModals);
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const { error } = await supabaseClient
            .from('Wallet')
            .delete()
            .eq('ID', activeTransaction.ID);

        if (error) {
            console.error("Error deleting transaction:", error.message);
        } else {
            closeAllModals();
            loadTransactions();
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target === addModal || event.target === actionModal || event.target === editModal || event.target === deleteConfirmModal) {
            closeAllModals();
        }
    });

    // --- INITIALIZATION ---
    filter.addEventListener("change", loadTransactions);
    loadPreferences();
    setupDateTimeListeners(); 
    setupAccordion();
    loadTransactions();
});