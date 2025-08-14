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

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view");
    
    // --- CATEGORY MANAGEMENT ---
    ZoeyWalletApp.updateCategories = () => {
        const categoriesFromTransactions = [...new Set(ZoeyWalletApp.allTransactionsCache.map(tx => tx.Category))];
        const userAddedCategories = JSON.parse(localStorage.getItem('userAddedCategories') || '[]');
        
        const combined = [...new Set([...ZoeyWalletApp.defaultCategories, ...categoriesFromTransactions, ...userAddedCategories])];
        ZoeyWalletApp.categoriesCache = combined.sort((a, b) => a.localeCompare(b));
        
        populateAllDropdowns();
        if(ZoeyWalletApp.settings.renderCustomCategoryList) {
            ZoeyWalletApp.settings.renderCustomCategoryList();
        }
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
            
            // Try to restore previous value
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            } else if(select.id === 'category') {
                select.selectedIndex = 0; // Reset to "Select Category"
            }
        });
    }

    // --- VIEW NAVIGATION ---
    function showView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.add('active');
        }
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    }
    
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const viewId = btn.dataset.view;
            showView(viewId);
            if (viewId === 'walletView') {
                ZoeyWalletApp.wallet.render();
            }
        });
    });

    // --- INITIALIZATION ---
    ZoeyWalletApp.settings.init();
    ZoeyWalletApp.wallet.init();
    ZoeyWalletApp.transaction.init();

    // Initial load of transactions and categories
    await ZoeyWalletApp.transaction.fetchAndRender();
});