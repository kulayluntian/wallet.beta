((app) => {
    app.transaction = {};

    // --- DOM Elements ---
    const list = document.getElementById("transactionList");
    const totalBalanceDisplay = document.getElementById("totalBalanceDisplay");
    const filter = document.getElementById("categoryFilter");
    const addBtn = document.getElementById("addBtn");
    
    // Modals & Forms
    const addModal = document.getElementById("addModal");
    const editModal = document.getElementById("editModal");
    const deleteConfirmModal = document.getElementById("deleteConfirmModal");
    const txForm = document.getElementById("txForm");
    const editTxForm = document.getElementById("editTxForm");

    let activeTransaction = null;

    // --- UTILITY FUNCTIONS ---
    function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
    function getCurrentTimeString() { return new Date().toTimeString().split(' ')[0]; }
    
    /**
     * [THE FIX] This function now manually builds the exact date string format
     * that matches your database's text column (YYYY-MM-DD HH:MM:SS+08).
     */
    function formatDateTimeForStorage(dateObj) {
        const pad = (num) => String(num).padStart(2, '0');

        const year = dateObj.getFullYear();
        const month = pad(dateObj.getMonth() + 1);
        const day = pad(dateObj.getDate());
        const hours = pad(dateObj.getHours());
        const minutes = pad(dateObj.getMinutes());
        const seconds = pad(dateObj.getSeconds());

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+08`;
    }
    
    function closeAllModals() {
        addModal.style.display = 'none';
        editModal.style.display = 'none';
        deleteConfirmModal.style.display = 'none';
        activeTransaction = null;
    }

    function openEditModal(transaction) {
        activeTransaction = transaction;
        // Since the date is now text, we need to parse it carefully for the input fields
        const txDate = new Date(transaction.Date.replace(' ', 'T').replace('+08', ''));
        
        document.getElementById('editDescription').value = transaction.Description;
        document.getElementById('editCategory').value = transaction.Category;
        document.getElementById('editDate').value = txDate.toISOString().split('T')[0];
        document.getElementById('editTime').value = txDate.toTimeString().split(' ')[0];
        document.getElementById('editAmount').value = (Number(transaction.Amount) || 0).toFixed(2);
        editModal.style.display = 'flex';
    }

    // The rest of the file is correct and does not need to be changed.
    // All functions from here on are the same as the last working version.

    function openDeleteModal(transaction) {
        activeTransaction = transaction;
        deleteConfirmModal.style.display = 'flex';
    }

    function handleAddTransaction(e) {
        e.preventDefault();
        const dateFromForm = new Date(`${document.getElementById("date").value}T${document.getElementById("time").value}`);
        const newEntry = {
            ID: Date.now(),
            Description: document.getElementById("description").value,
            Amount: parseFloat(document.getElementById("amount").value) || 0,
            Category: document.getElementById("category").value,
            Date: formatDateTimeForStorage(dateFromForm)
        };
        closeAllModals();
        app.allTransactionsCache.unshift(newEntry);
        app.saveCacheToLocal();
        app.queueAction({ type: 'add', payload: newEntry });
        app.transaction.load();
        app.processSyncQueue();
    }
    
    function handleEditTransaction(e) {
        e.preventDefault();
        const idToEdit = activeTransaction.ID;
        const dateFromForm = new Date(`${document.getElementById("editDate").value}T${document.getElementById("editTime").value}`);
        const updatedData = {
            Description: document.getElementById("editDescription").value,
            Amount: parseFloat(document.getElementById("editAmount").value) || 0,
            Category: document.getElementById("editCategory").value,
            Date: formatDateTimeForStorage(dateFromForm)
        };
        closeAllModals();
        const index = app.allTransactionsCache.findIndex(tx => String(tx.ID) === String(idToEdit));
        if (index !== -1) {
            app.allTransactionsCache[index] = { ...app.allTransactionsCache[index], ...updatedData };
            app.saveCacheToLocal();
            app.queueAction({ type: 'edit', payload: { id: idToEdit, data: updatedData } });
            app.transaction.load();
            app.processSyncQueue();
        }
    }

    function handleDeleteTransaction() {
        const idToDelete = activeTransaction.ID;
        closeAllModals();
        app.allTransactionsCache = app.allTransactionsCache.filter(tx => String(tx.ID) !== String(idToDelete));
        app.saveCacheToLocal();
        app.queueAction({ type: 'delete', payload: { id: idToDelete } });
        app.transaction.load();
        app.processSyncQueue();
    }

    app.transaction.load = () => {
        let totalBalance = 0;
        app.allTransactionsCache.forEach(tx => {
            const amount = Number(tx.Amount) || 0;
            totalBalance += (tx.Category === 'Savings' ? -amount : amount);
        });
        totalBalanceDisplay.textContent = `Total: ₱${totalBalance.toFixed(2)}`;
        
        const selectedCategory = filter.value;
        const filteredData = selectedCategory === "all" 
            ? app.allTransactionsCache 
            : app.allTransactionsCache.filter(tx => tx.Category === selectedCategory);
        
        list.innerHTML = "";
        if (filteredData.length === 0) {
            const message = selectedCategory === 'all' 
                ? "No transactions yet. Add one!"
                : `No transactions found for the "${selectedCategory}" category.`;
            list.innerHTML = `<li class='transaction'><div class='tx-main'><div class='tx-info'>${message}</div></div></li>`;
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
                header.textContent = app.settings.formatDateHeader(txDate); 
                list.appendChild(header);
                lastHeaderDate = headerDateString;
            }

            const item = document.createElement("li");
            item.className = "transaction";
            item.dataset.id = tx.ID;

            const amount = Number(tx.Amount) || 0;
            let amountClass = '', displayAmount = '';
            
            if (tx.Category === 'Savings') {
                amountClass = amount > 0 ? 'savings-add' : 'savings-withdraw';
                displayAmount = `${amount > 0 ? '+' : '−'}₱${Math.abs(amount).toFixed(2)}`;
            } else {
                const isExpense = amount < 0;
                amountClass = isExpense ? 'expense' : 'income';
                displayAmount = `${isExpense ? '−' : ''}₱${Math.abs(amount).toFixed(2)}`;
            }

            const displayTime = app.settings.formatTransactionTime(txDate);
            
            item.innerHTML = `
                <div class="tx-main">
                    <div class="tx-info">
                        <strong class="tx-description">${tx.Description}</strong>
                        <span class="tx-category">${tx.Category}${displayTime ? ` @ ${displayTime}` : ''}</span>
                    </div>
                    <div class="tx-amount ${amountClass}">${displayAmount}</div>
                </div>
                <div class="tx-actions">
                    <button class="tx-action-btn edit">Edit</button>
                    <button class="tx-action-btn delete">Delete</button>
                </div>`;
            list.appendChild(item);
        });
    };

    app.transaction.fetchAndRender = async (forceNetwork = false) => {
        const pendingActions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
        if (pendingActions.length > 0 && !forceNetwork) {
            const cachedData = JSON.parse(localStorage.getItem('zoeywallet_offline_data'));
            app.allTransactionsCache = (cachedData && cachedData.transactions) ? cachedData.transactions : [];
        } else if (navigator.onLine) {
            const { data, error } = await app.supabaseClient.from('Wallet').select('*').order('Date', { ascending: false });
            if (error) {
                console.error("Error fetching fresh data:", error.message);
                const cachedData = JSON.parse(localStorage.getItem('zoeywallet_offline_data'));
                app.allTransactionsCache = (cachedData && cachedData.transactions) ? cachedData.transactions : [];
            } else {
                app.allTransactionsCache = data;
                app.saveCacheToLocal();
            }
        } else {
             const cachedData = JSON.parse(localStorage.getItem('zoeywallet_offline_data'));
             app.allTransactionsCache = (cachedData && cachedData.transactions) ? cachedData.transactions : [];
        }

        app.updateCategories();
        app.transaction.load();
    };

    app.transaction.init = () => {
        filter.addEventListener("change", app.transaction.load);
        addBtn.addEventListener("click", () => {
            txForm.reset();
            document.getElementById('date').value = getTodayDateString();
            document.getElementById('time').value = getCurrentTimeString();
            document.getElementById('category').selectedIndex = 0;
            addModal.style.display = 'flex';
        });

        list.addEventListener('click', (e) => {
            const clickedTxLi = e.target.closest('.transaction');
            if (!clickedTxLi || !clickedTxLi.dataset.id) return;
            
            const transactionId = clickedTxLi.dataset.id;
            const transactionData = app.allTransactionsCache.find(t => String(t.ID) === transactionId);
            
            if (!transactionData) return;

            if (e.target.classList.contains('edit')) { openEditModal(transactionData); }
            if (e.target.classList.contains('delete')) { openDeleteModal(transactionData); }
            
            if (e.target.closest('.tx-main')) {
                const wasActive = clickedTxLi.classList.contains('active');
                list.querySelectorAll('.transaction.active').forEach(item => { item.classList.remove('active'); });
                if (!wasActive) { clickedTxLi.classList.add('active'); }
            }
        });

        txForm.addEventListener("submit", handleAddTransaction);
        editTxForm.addEventListener("submit", handleEditTransaction);
        document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteTransaction);

        document.getElementById('cancelAddBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelEditBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelDeleteBtn').addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) closeAllModals(); });
    };

})(ZoeyWalletApp);