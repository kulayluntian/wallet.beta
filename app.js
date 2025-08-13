// --- GLOBAL APP NAMESPACE ---
const ZoeyWalletApp = {};

document.addEventListener("DOMContentLoaded", () => {
    // --- SHARED RESOURCES ---
    const SUPABASE_URL = 'https://kikavthamaslaxxdpabj.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2F2dGhhbWFzbGF4eGRwYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzEwMTAsImV4cCI6MjA3MDY0NzAxMH0.-Opk4pzWgfJwILshx6HhyE7bi2eeur8t8x-5C2_fxGE';
    
    ZoeyWalletApp.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    ZoeyWalletApp.allTransactionsCache = [];

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view");
    
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
            // Trigger render function when switching to wallet view
            if (viewId === 'walletView') {
                ZoeyWalletApp.wallet.render();
            }
        });
    });

    // --- INITIALIZATION ---
    // Initialize all modules
    ZoeyWalletApp.settings.init();
    ZoeyWalletApp.wallet.init();
    ZoeyWalletApp.transaction.init();

    // Initial load of transactions
    ZoeyWalletApp.transaction.load();
});