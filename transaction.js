((app) => {
    app.transaction = {};

    // --- DOM Elements ---
    const list = document.getElementById("transactionList");
    const totalBalanceDisplay = document.getElementById("totalBalanceDisplay");
    const filter = document.getElementById("categoryFilter");
    const addBtn = document.getElementById("addBtn");
    
    // Modals & Forms
    const addModal = document.getElementById("addModal");
    const actionModal = document.getElementById("actionModal");
    const editModal = document.getElementById("editModal");
    const deleteConfirmModal = document.getElementById("deleteConfirmModal");
    const txForm = document.getElementById("txForm");
    const editTxForm = document.getElementById("editTxForm");

    let activeTransaction = null;
    const expenseCategories = ['Food', 'Expenses', 'Miscellaneous', 'transportation', 'Savings'];

    // --- UTILITY FUNCTIONS ---
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

    // --- TRANSACTION LIST LOGIC ---
    app.transaction.load = async () => {
        if (!app.supabaseClient) return; 
        list.innerHTML = "<li class='transaction'>Loading...</li>";
        const { data, error } = await app.supabaseClient
            .from('Wallet')
            .select('*');

        if (error) {
            console.error("Error loading transactions:", error.message);
            list.innerHTML = `<li class='transaction'>Failed to load transactions. Check console for details.</li>`;
            return;
        }

        app.allTransactionsCache = data;
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
                header.textContent = app.settings.formatDateHeader(txDate); 
                list.appendChild(header);
                lastHeaderDate = headerDateString;
            }

            const item = document.createElement("li");
            item.className = "transaction";
            const amount = Number(tx.Amount) || 0;
            const isExpense = amount < 0;
            const amountClass = isExpense ? 'expense' : 'income';
            const displayAmount = `${isExpense ? '−' : ''}₱${Math.abs(amount).toFixed(2)}`;
            const displayTime = app.settings.formatTransactionTime(txDate);
            
            item.innerHTML = `
                <div class="tx-info">
                    <strong class="tx-description">${tx.Description}</strong>
                    <span class="tx-category">${tx.Category}${displayTime ? ` @ ${displayTime}` : ''}</span>
                </div>
                <div class="tx-amount ${amountClass}">${displayAmount}</div>`;
            item.addEventListener('click', () => openActionModal(tx));
            list.appendChild(item);
        });
    };

    // --- INITIALIZATION ---
    app.transaction.init = () => {
        // Form & Modal Listeners
        filter.addEventListener("change", app.transaction.load);
        addBtn.addEventListener("click", () => {
            txForm.reset();
            document.getElementById('date').value = getTodayDateString();
            document.getElementById('time').value = getCurrentTimeString();
            updateAmountSign('', document.getElementById('addAmountSign'));
            addModal.style.display = 'flex';
        });

        document.getElementById('category').addEventListener('change', (e) => updateAmountSign(e.target.value, document.getElementById('addAmountSign')));
        document.getElementById('editCategory').addEventListener('change', (e) => updateAmountSign(e.target.value, document.getElementById('editAmountSign')));

        txForm.addEventListener("submit", async (e) => {
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
            
            const { error } = await app.supabaseClient.from('Wallet').insert([newEntry]);
            
            if (error) {
                console.error("Error adding transaction:", error.message);
            } else {
                closeAllModals();
                app.transaction.load();
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
            
            const { error } = await app.supabaseClient
                .from('Wallet')
                .update(updatedData)
                .eq('ID', activeTransaction.ID);

            if (error) {
                console.error("Error updating transaction:", error.message);
            } else {
                closeAllModals();
                app.transaction.load();
            }
        });

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

        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            const { error } = await app.supabaseClient
                .from('Wallet')
                .delete()
                .eq('ID', activeTransaction.ID);

            if (error) {
                console.error("Error deleting transaction:", error.message);
            } else {
                closeAllModals();
                app.transaction.load();
            }
        });

        // Cancel Buttons
        document.getElementById('cancelAddBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelActionBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelEditBtn').addEventListener('click', closeAllModals);
        document.getElementById('cancelDeleteBtn').addEventListener('click', closeAllModals);

        // Close modal on outside click
        window.addEventListener('click', (event) => {
            if (event.target === addModal || event.target === actionModal || event.target === editModal || event.target === deleteConfirmModal) {
                closeAllModals();
            }
        });
    };

})(ZoeyWalletApp);