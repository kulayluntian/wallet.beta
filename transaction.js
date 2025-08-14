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
    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    function getCurrentTimeString() {
        return new Date().toTimeString().split(' ')[0];
    }
    
    // WARNING: This function creates a display-friendly string. Storing this in a
    // database is NOT recommended as it breaks sorting, filtering, and timezones.
    function formatDateTimeForStorage(dateObj) {
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const year = dateObj.getFullYear();
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const seconds = dateObj.getSeconds();

        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // This creates the "M/D/YYYY HH:MM:SS" format
        return `${month}/${day}/${year} ${timeString}`;
    }

    // --- MODAL CONTROLS ---
    function closeAllModals() {
        addModal.style.display = 'none';
        editModal.style.display = 'none';
        deleteConfirmModal.style.display = 'none';
        activeTransaction = null;
    }

    function openEditModal(transaction) {
        activeTransaction = transaction;
        
        // Since the DB format is now a string, we have to parse it back
        // This is inefficient and can be unreliable.
        const txDate = new Date(transaction.Date); 
        
        const yyyymmddDate = txDate.toISOString().split('T')[0];
        const hhmmssTime = txDate.toTimeString().split(' ')[0];

        document.getElementById('editDescription').value = transaction.Description;
        document.getElementById('editCategory').value = transaction.Category;
        document.getElementById('editDate').value = yyyymmddDate;
        document.getElementById('editTime').value = hhmmssTime;
        document.getElementById('editAmount').value = (Number(transaction.Amount) || 0).toFixed(2);
        
        editModal.style.display = 'flex';
    }

    function openDeleteModal(transaction) {
        activeTransaction = transaction;
        deleteConfirmModal.style.display = 'flex';
    }


    // --- DATA & RENDERING LOGIC ---
    app.transaction.fetchAndRender = async () => {
        if (!app.supabaseClient) return; 
        list.innerHTML = "<li class='transaction'><div class='tx-main'><div class='tx-info'>Loading...</div></div></li>";
        
        const { data, error } = await app.supabaseClient.from('Wallet').select('*');

        if (error) {
            console.error("Error loading transactions:", error.message);
            list.innerHTML = `<li class='transaction'><div class='tx-main'><div class='tx-info'>Failed to load transactions.</div></div></li>`;
            return;
        }

        app.allTransactionsCache = data;
        app.updateCategories();
        app.transaction.load();
    };

    app.transaction.load = () => {
        let totalBalance = 0;
        app.allTransactionsCache.forEach(tx => {
            totalBalance += Number(tx.Amount) || 0;
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
            const txDate = new Date(tx.Date); // We have to parse the string on every render now
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
            const isExpense = amount < 0;
            const amountClass = isExpense ? 'expense' : 'income';
            const displayAmount = `${isExpense ? '−' : ''}₱${Math.abs(amount).toFixed(2)}`;
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

    // --- INITIALIZATION ---
    app.transaction.init = () => {
        // Event Listeners
        filter.addEventListener("change", app.transaction.load);
        addBtn.addEventListener("click", () => {
            txForm.reset();
            document.getElementById('date').value = getTodayDateString();
            document.getElementById('time').value = getCurrentTimeString();
            document.getElementById('category').selectedIndex = 0;
            addModal.style.display = 'flex';
        });

        // Main event delegator for the transaction list
        list.addEventListener('click', (e) => {
            const clickedTxLi = e.target.closest('.transaction');
            if (!clickedTxLi) return; 

            const transactionId = parseInt(clickedTxLi.dataset.id, 10);
            const transactionData = app.allTransactionsCache.find(t => t.ID === transactionId);
            if (!transactionData) return;

            if (e.target.classList.contains('edit')) { openEditModal(transactionData); return; }
            if (e.target.classList.contains('delete')) { openDeleteModal(transactionData); return; }
            
            if (e.target.closest('.tx-main')) {
                const wasActive = clickedTxLi.classList.contains('active');
                list.querySelectorAll('.transaction.active').forEach(item => { item.classList.remove('active'); });
                if (!wasActive) { clickedTxLi.classList.add('active'); }
            }
        });

        txForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // Create a Date object from the form inputs
            const dateFromForm = new Date(`${document.getElementById("date").value}T${document.getElementById("time").value}`);

            const newEntry = {
                ID: Date.now(),
                Description: document.getElementById("description").value,
                Amount: parseFloat(document.getElementById("amount").value) || 0,
                Category: document.getElementById("category").value,
                // THE CHANGE IS HERE:
                Date: formatDateTimeForStorage(dateFromForm) // Saving the custom string
            };
            const { error } = await app.supabaseClient.from('Wallet').insert([newEntry]);
            if (error) { console.error("Error adding transaction:", error.message); } 
            else { closeAllModals(); await app.transaction.fetchAndRender(); }
        });
    
        editTxForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // Create a Date object from the form inputs
            const dateFromForm = new Date(`${document.getElementById("editDate").value}T${document.getElementById("editTime").value}`);

            const updatedData = {
                Description: document.getElementById("editDescription").value,
                Amount: parseFloat(document.getElementById("editAmount").value) || 0,
                Category: document.getElementById("editCategory").value,
                // THE CHANGE IS HERE:
                Date: formatDateTimeForStorage(dateFromForm) // Saving the custom string
            };
            const { error } = await app.supabaseClient.from('Wallet').update(updatedData).eq('ID', activeTransaction.ID);
            if (error) { console.error("Error updating transaction:", error.message); } 
            else { closeAllModals(); await app.transaction.fetchAndRender(); }
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            const { error } = await app.supabaseClient.from('Wallet').delete().eq('ID', activeTransaction.ID);
            if (error) { console.error("Error deleting transaction:", error.message); } 
            else { closeAllModals(); await app.transaction.fetchAndRender(); }
        });

        // Cancel Buttons
        document.getElementById('cancelAddBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelEditBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelDeleteBtn').addEventListener('click', closeAllModals);

        // Close modal on outside click
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                closeAllModals();
            }
        });
    };

})(ZoeyWalletApp);