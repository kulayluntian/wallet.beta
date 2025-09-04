// --- GLOBAL APP NAMESPACE ---
const ZoeyWalletApp = {};

document.addEventListener("DOMContentLoaded", async () => {
    // --- SHARED RESOURCES ---
    const SUPABASE_URL = 'https://kikavthamaslaxxdpabj.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2F2dGhhbWFzbGF4eGRwYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzEwMTAsImV4cCI6MjA3MDY0NzAxMH0.-Opk4pzWgfJwILshx6HhyE7bi2eeur8t8x-5C2_fxGE';
    
    ZoeyWalletApp.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    ZoeyWalletApp.allTransactionsCache = [];
    ZoeyWalletApp.categoriesCache = [];
    ZoeyWalletApp.defaultCategories = ["Food", "Money", "Expenses", "Savings", "Miscellaneous"];
    ZoeyWalletApp.isSyncing = false;

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view");
    const offlineBanner = document.getElementById("offlineBanner");

    // --- SERVICE WORKER REGISTRATION (CORRECTED) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // [THE FIX] Use a relative path to ensure it works in any directory.
            navigator.serviceWorker.register('sw.js') 
                .then(reg => console.log('Service Worker registered successfully', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        });
    }
    
    // --- LOCAL DATA & QUEUE MANAGEMENT ---
    const PENDING_ACTIONS_KEY = 'pendingActions';
    const OFFLINE_CACHE_KEY = 'zoeywallet_offline_data';
    
    ZoeyWalletApp.saveCacheToLocal = () => { /* ... unchanged ... */ };
    ZoeyWalletApp.queueAction = (action) => { /* ... unchanged ... */ };
    ZoeyWalletApp.processSyncQueue = async () => { /* ... unchanged ... */ };
    
    // ... PASTE THE UNCHANGED FUNCTIONS HERE ...
    ZoeyWalletApp.saveCacheToLocal = () => {
        try {
            const dataToSave = { transactions: ZoeyWalletApp.allTransactionsCache };
            localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(dataToSave));
        } catch (e) { console.error("Error saving cache to localStorage:", e); }
    };
    
    ZoeyWalletApp.queueAction = (action) => {
        const queue = JSON.parse(localStorage.getItem(PENDING_ACTIONS_KEY) || '[]');
        queue.push(action);
        localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(queue));
    };

    ZoeyWalletApp.processSyncQueue = async () => {
        if (!navigator.onLine || ZoeyWalletApp.isSyncing) return;
        let queue = JSON.parse(localStorage.getItem(PENDING_ACTIONS_KEY) || '[]');
        if (queue.length === 0) {
            await ZoeyWalletApp.transaction.fetchAndRender(true);
            return;
        }
        ZoeyWalletApp.isSyncing = true;
        console.log(`Starting sync for ${queue.length} action(s).`);
        while (queue.length > 0) {
            const action = queue[0];
            let success = false;
            try {
                switch (action.type) {
                    case 'add': {
                        const { error } = await ZoeyWalletApp.supabaseClient.from('Wallet').insert([action.payload]);
                        if (error) throw new Error(`ADD failed: ${error.message}`);
                        console.log(`Successfully synced ADD for ID ${action.payload.ID}`);
                        break;
                    }
                    case 'edit': {
                        const { error } = await ZoeyWalletApp.supabaseClient.from('Wallet').update(action.payload.data).eq('ID', action.payload.id);
                        if (error) throw new Error(`EDIT failed for ID ${action.payload.id}: ${error.message}`);
                        console.log(`Successfully synced EDIT for ID: ${action.payload.id}`);
                        break;
                    }
                    case 'delete': {
                        const { error } = await ZoeyWalletApp.supabaseClient.from('Wallet').delete().eq('ID', action.payload.id);
                        if (error) throw new Error(`DELETE failed for ID ${action.payload.id}: ${error.message}`);
                        console.log(`Successfully synced DELETE for ID: ${action.payload.id}`);
                        break;
                    }
                }
                success = true;
            } catch (error) {
                console.error("A sync action failed:", error);
                ZoeyWalletApp.isSyncing = false;
                return; 
            }
            if (success) {
                queue.shift();
            }
        }
        localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(queue));
        ZoeyWalletApp.saveCacheToLocal();
        ZoeyWalletApp.isSyncing = false;
        console.log("Sync queue finished. Fetching final state from server.");
        await ZoeyWalletApp.transaction.fetchAndRender(true);
    };

    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        offlineBanner.style.display = isOnline ? 'none' : 'block';
        if (isOnline) ZoeyWalletApp.processSyncQueue();
    }
    
    ZoeyWalletApp.updateCategories = () => {
        const categoriesFromTransactions = [...new Set(ZoeyWalletApp.allTransactionsCache.map(tx => tx.Category))];
        const userAddedCategories = JSON.parse(localStorage.getItem('userAddedCategories') || '[]');
        const combined = [...new Set([...ZoeyWalletApp.defaultCategories, ...categoriesFromTransactions, ...userAddedCategories])];
        ZoeyWalletApp.categoriesCache = combined.sort((a, b) => a.localeCompare(b));
        populateAllDropdowns();
        if(ZoeyWalletApp.settings.renderCustomCategoryList) ZoeyWalletApp.settings.renderCustomCategoryList();
    };

    function populateAllDropdowns() {
        const dropdowns = [
            document.getElementById('categoryFilter'),
            document.getElementById('category'),
            document.getElementById('editCategory')
        ];
        dropdowns.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            const firstOptionHTML = (select.id === 'categoryFilter') 
                ? '<option value="all">Show All</option>' 
                : '<option value="" disabled>Select Category</option>';
            select.innerHTML = firstOptionHTML;
            ZoeyWalletApp.categoriesCache.forEach(cat => {
                if (cat) {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    select.appendChild(option);
                }
            });
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            } else if(select.id === 'category') {
                select.selectedIndex = 0;
            }
        });
    }

    function showView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(viewId);
        if (activeView) activeView.classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    }
    
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const viewId = btn.dataset.view;
            showView(viewId);
            if (viewId === 'walletView') ZoeyWalletApp.wallet.render();
        });
    });

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    ZoeyWalletApp.settings.init();
    ZoeyWalletApp.wallet.init();
    ZoeyWalletApp.transaction.init();
    await ZoeyWalletApp.transaction.fetchAndRender();
    updateOnlineStatus();
});