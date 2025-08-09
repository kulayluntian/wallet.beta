document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "https://sheetdb.io/api/v1/u2ffzlk0reuy9";
    let allTransactionsCache = []; 

    // --- Preferences State ---
    let preferences = {
        theme: 'dark',
        timeFormat: '24hr',
        dateFormat: 'mmddyyyy'
    };

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
    const expenseCategories = ['Food', 'Expenses', 'Miscellaneous', 'transportation'];

    // --- PREFERENCES LOGIC ---
    function savePreferences() {
        localStorage.setItem('walletPreferences', JSON.stringify(preferences));
    }

    function loadPreferences() {
        const saved = localStorage.getItem('walletPreferences');
        if (saved) {
            preferences = JSON.parse(saved);
        }
        applyPreferences();
    }

    function applyPreferences() {
        document.body.classList.toggle('dark-mode', preferences.theme === 'dark');
        document.body.classList.toggle('light-mode', preferences.theme === 'light');
        darkThemeToggle.checked = preferences.theme === 'dark';
        document.querySelector(`input[name="timeFormat"][value="${preferences.timeFormat}"]`).checked = true;
        document.querySelector(`input[name="dateFormat"][value="${preferences.dateFormat}"]`).checked = true;
    }

    darkThemeToggle.addEventListener('change', () => {
        preferences.theme = darkThemeToggle.checked ? 'dark' : 'light';
        savePreferences();
        applyPreferences();
    });

    document.querySelectorAll('input[name="timeFormat"], input[name="dateFormat"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            preferences[e.target.name] = e.target.value;
            savePreferences();
            loadTransactions(); 
        });
    });

    // --- VIEW NAVIGATION ---
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

    // --- DATE/TIME FORMATTING UTILITIES ---
    function formatDisplayTime(dateObj) {
        if (preferences.timeFormat === '12hr') {
            return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/:\d+ /, ' ');
        }
        return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit'});
    }
    
    function formatFullDateHeader(dateObj) {
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayOfWeek = weekdays[dateObj.getDay()];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = monthNames[dateObj.getMonth()];
        const day = String(dateObj.getDate()).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${dayOfWeek}, ${month} ${day}, ${year}`;
    }
    
    function getTodayDateString() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getCurrentTimeString() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    // --- UI Logic for Amount Sign ---
    function updateAmountSign(categoryValue, signElement) {
        if (!categoryValue) {
            signElement.textContent = '';
            signElement.className = 'amount-sign';
            return;
        }
        const isExpense = expenseCategories.includes(categoryValue);
        if (isExpense) {
            signElement.textContent = '−';
            signElement.className = 'amount-sign expense';
        } else {
            signElement.textContent = '+';
            signElement.className = 'amount-sign income';
        }
    }

    document.getElementById('category').addEventListener('change', (e) => {
        updateAmountSign(e.target.value, document.getElementById('addAmountSign'));
    });
    document.getElementById('editCategory').addEventListener('change', (e) => {
        updateAmountSign(e.target.value, document.getElementById('editAmountSign'));
    });

    // --- WALLET VIEW LOGIC ---
    walletTimeFilter.addEventListener('change', renderWalletView);

    function getDateRanges(period) {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        let prevStart, prevEnd;
        switch (period) {
            case 'day':
                start.setHours(now.getHours() - 24, now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                prevStart = new Date(start.getTime());
                prevStart.setHours(prevStart.getHours() - 24);
                prevEnd = new Date(start.getTime());
                break;
            case 'week':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
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
        return { current: { start: start, end: end }, previous: { start: prevStart, end: prevEnd }};
    }

    function calculateSummary(transactions, ranges) {
        const summary = { current: { funds: 0, expenses: 0, savings: 0 }, previous: { funds: 0, expenses: 0, savings: 0 } };
        const fundsCategories = ['Money'];
        const savingsCategories = ['Savings'];
        transactions.forEach(tx => {
            if (!tx.Date) return;
            const txDate = new Date(tx.Date);
            const amount = parseFloat(String(tx.Amount).replace(/[^0-9.-]/g, '')) || 0;
            const checkPeriod = (period) => {
                if (fundsCategories.includes(tx.Category)) period.funds += amount;
                if (savingsCategories.includes(tx.Category)) period.savings += amount;
                if (amount < 0) period.expenses += Math.abs(amount);
            };
            if (txDate >= ranges.current.start && txDate <= ranges.current.end) { checkPeriod(summary.current); }
            if (txDate >= ranges.previous.start && txDate < ranges.previous.end) { checkPeriod(summary.previous); }
        });
        return summary;
    }

    function createSummaryCard(title, currentAmount, previousAmount) {
        const difference = currentAmount - previousAmount;
        let comparisonText = '';
        let comparisonClass = '';
        const periodText = walletTimeFilter.options[walletTimeFilter.selectedIndex].text.replace('This', 'last').replace('Last 24 Hours', 'previous 24 hours');
        if (previousAmount !== 0) {
            const moreOrLess = difference > 0 ? 'more' : 'less';
            comparisonText = `₱${Math.abs(difference).toFixed(2)} ${moreOrLess} than ${periodText.toLowerCase()}`;
            const isPositiveChange = (title === 'Expenses' && difference < 0) || (title !== 'Expenses' && difference > 0);
            comparisonClass = isPositiveChange ? 'positive' : 'negative';
        } else if (currentAmount > 0) {
            comparisonText = `No data for ${periodText.toLowerCase()}`;
        } else {
            comparisonText = 'No data for this period';
        }
        return `<div class="summary-card"><div class="summary-details"><span class="summary-title">${title}</span><span class="summary-comparison ${comparisonClass}">${comparisonText}</span></div><span class="summary-amount">₱${currentAmount.toFixed(2)}</span></div>`;
    }

    async function renderWalletView() {
        const summaryContainer = document.getElementById('walletSummaryContainer');
        summaryContainer.innerHTML = `<p>Loading summary...</p>`;
        if (allTransactionsCache.length === 0) {
            try {
                const res = await fetch(API_URL);
                if (!res.ok) throw new Error("Network response error");
                allTransactionsCache = await res.json();
            } catch (error) {
                console.error("Failed to fetch data for wallet view:", error);
                summaryContainer.innerHTML = `<p>Could not load summary data.</p>`;
                return;
            }
        }
        const period = walletTimeFilter.value;
        const ranges = getDateRanges(period);
        const summary = calculateSummary(allTransactionsCache, ranges);
        summaryContainer.innerHTML = `${createSummaryCard('Funds', summary.current.funds, summary.previous.funds)}${createSummaryCard('Expenses', summary.current.expenses, summary.previous.expenses)}${createSummaryCard('Savings', summary.current.savings, summary.previous.savings)}`;
    }

    // --- TRANSACTION LIST LOGIC ---
    function loadTransactions() {
        fetch(API_URL).then(res => res.ok ? res.json() : Promise.reject(res)).then(data => {
            allTransactionsCache = data;
            let totalBalance = 0;
            data.forEach(tx => {
                const amount = parseFloat(String(tx.Amount).replace(/[^0-9.-]/g, '')) || 0;
                totalBalance += amount;
            });
            totalBalanceDisplay.textContent = `Total: ₱${totalBalance.toFixed(2)}`;
            list.innerHTML = "";
            const selectedCategory = filter.value;
            const filteredData = selectedCategory === "all" ? data : data.filter(tx => tx.Category === selectedCategory);
            const sortedData = filteredData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            let lastDisplayedDate = null;
            sortedData.forEach(tx => {
                if (!tx.Date) return;
                const txDate = new Date(tx.Date);
                const dateKey = txDate.toLocaleDateString();
                if (dateKey !== lastDisplayedDate) {
                    const header = document.createElement('li');
                    header.className = 'date-header';
                    header.textContent = formatFullDateHeader(txDate);
                    list.appendChild(header);
                    lastDisplayedDate = dateKey;
                }
                const item = document.createElement("li");
                item.className = "transaction";
                const amount = parseFloat(String(tx.Amount).replace(/[^0-9.-]/g, '')) || 0;
                const isExpense = amount < 0;
                const amountClass = isExpense ? 'expense' : 'income';
                const displayAmount = `${isExpense ? '−' : ''}₱${Math.abs(amount).toFixed(2)}`;
                const displayTime = formatDisplayTime(txDate);
                item.innerHTML = `<div class="tx-info"><strong class="tx-description">${tx.Description}</strong><span class="tx-category">${tx.Category} @ ${displayTime}</span></div><div class="tx-amount ${amountClass}">${displayAmount}</div>`;
                item.addEventListener('click', () => openActionModal(tx));
                list.appendChild(item);
            });
        }).catch(error => {
            console.error("Error loading transactions:", error);
            list.innerHTML = "<li class='transaction'>Failed to load transactions.</li>";
        });
    }

    // --- FORM SUBMISSION (ADD & EDIT) ---
    function getInternalDateFromInput(dateInput) {
        const [year, month, day] = dateInput.split('-');
        return `${month}/${day}/${year}`;
    }

    form.addEventListener("submit", e => {
        e.preventDefault();
        const combinedDateTime = `${getInternalDateFromInput(document.getElementById("date").value)} ${document.getElementById("time").value}`;
        const category = document.getElementById("category").value;
        const isExpense = expenseCategories.includes(category);
        const amount = parseFloat(document.getElementById("amount").value) || 0;
        const signedAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
        const newEntry = { data: { ID: Date.now(), Description: document.getElementById("description").value, Amount: signedAmount.toFixed(2), Category: category, Date: combinedDateTime }};
        fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEntry) })
            .then(res => { if (!res.ok) throw new Error("Failed to add transaction"); closeAllModals(); loadTransactions(); })
            .catch(error => console.error("Error adding transaction:", error));
    });
    
    editTxForm.addEventListener("submit", e => {
        e.preventDefault();
        const combinedDateTime = `${getInternalDateFromInput(document.getElementById("editDate").value)} ${document.getElementById("editTime").value}`;
        const category = document.getElementById("editCategory").value;
        const isExpense = expenseCategories.includes(category);
        const amount = parseFloat(document.getElementById("editAmount").value) || 0;
        const signedAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
        const updatedData = { data: { Description: document.getElementById("editDescription").value, Amount: signedAmount.toFixed(2), Category: category, Date: combinedDateTime }};
        fetch(`${API_URL}/ID/${activeTransaction.ID}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedData) })
            .then(res => { if (!res.ok) throw new Error("Failed to update transaction"); closeAllModals(); loadTransactions(); })
            .catch(error => console.error("Error updating transaction:", error));
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
        const fullDateString = String(activeTransaction.Date || '');
        const firstSpaceIndex = fullDateString.indexOf(' ');
        let datePart, timePart;
        if (firstSpaceIndex === -1) {
            datePart = fullDateString.trim(); timePart = "00:00:00"; 
        } else {
            datePart = fullDateString.substring(0, firstSpaceIndex).trim();
            timePart = fullDateString.substring(firstSpaceIndex + 1).trim();
        }
        const timeComponents = timePart.split(':');
        const paddedTime = timeComponents.map(component => component.padStart(2, '0')).join(':');
        const [month, day, year] = datePart.split('/');
        const yyyymmddDate = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
        document.getElementById('editDescription').value = activeTransaction.Description;
        const category = activeTransaction.Category;
        document.getElementById('editCategory').value = category;
        document.getElementById('editDate').value = yyyymmddDate;
        document.getElementById('editTime').value = paddedTime;
        updateAmountSign(category, document.getElementById('editAmountSign'));
        const amount = parseFloat(String(activeTransaction.Amount).replace(/[^0-9.-]/g, '')) || 0;
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
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        fetch(`${API_URL}/ID/${activeTransaction.ID}`, { method: "DELETE" })
            .then(res => { if (!res.ok) throw new Error("Failed to delete"); closeAllModals(); loadTransactions(); })
            .catch(error => console.error("Error deleting transaction:", error));
    });

    window.addEventListener('click', (event) => {
        if (event.target === addModal || event.target === actionModal || event.target === editModal || event.target === deleteConfirmModal) {
            closeAllModals();
        }
    });

    // --- INITIALIZATION ---
    filter.addEventListener("change", loadTransactions);
    loadPreferences();
    loadTransactions();
});