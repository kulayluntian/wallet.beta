document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://kikavthamaslaxxdpabj.supabase.co';
    // [THE FIX] This is the original, correct, uncorrupted key.
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2F2dGhhbWFzbGF4eGRwYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzEwMTAsImV4cCI6MjA3MDY0NzAxMH0.-Opk4pzWgfJwILshx6HhyE7bi2eeur8t8x-5C2_fxGE';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- DOM ELEMENTS ---
    const tableBody = document.getElementById('dataTableBody');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const totalBalanceDisplay = document.getElementById('totalBalanceDisplay');

    // --- STATE ---
    let tableData = [];

    function parseDateString(dateString) {
        if (!dateString) return new Date(NaN);
        return new Date(dateString);
    }

    async function fetchData() {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Loading data...</td></tr>`;

        const { data, error } = await supabaseClient.from('Wallet').select('*');

        if (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger-color);">Failed to load data. Please check the console.</td></tr>`;
            totalBalanceDisplay.textContent = 'Error';
            return;
        }

        let totalBalance = 0;
        data.forEach(tx => {
            const amount = Number(tx.Amount) || 0;
            if (tx.Category === 'Savings') {
                totalBalance -= amount;
            } else {
                totalBalance += amount;
            }
        });
        totalBalanceDisplay.textContent = `Total: ₱${totalBalance.toFixed(2)}`;

        data.sort((a, b) => parseDateString(b.Date) - parseDateString(a.Date));
        
        tableData = data;
        renderTable();
    }

    function renderTable() {
        tableBody.innerHTML = '';

        if (tableData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No transactions found.</td></tr>`;
            return;
        }

        tableData.forEach(tx => {
            const tr = document.createElement('tr');
            const amount = Number(tx.Amount) || 0;
            let amountClass = '';
            if (tx.Category === 'Savings') {
                amountClass = amount > 0 ? 'savings-add' : 'savings-withdraw';
            } else {
                amountClass = amount < 0 ? 'expense' : 'income';
            }
            const dateObj = parseDateString(tx.Date);
            const formattedDate = dateObj.toString() === 'Invalid Date' ? 'Invalid Date' : dateObj.toLocaleString();
            tr.innerHTML = `
                <td>${tx.Description || ''}</td>
                <td class="amount ${amountClass}">${amount.toFixed(2)}</td>
                <td>${tx.Category || ''}</td>
                <td>${formattedDate}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function downloadCSV() {
        if (tableData.length === 0) {
            alert('No data to download.');
            return;
        }
        const headers = ['Description', 'Amount', 'Category', 'Date'];
        let csvContent = headers.join(',') + '\n';
        tableData.forEach(tx => {
            const description = `"${String(tx.Description || '').replace(/"/g, '""')}"`;
            const dateObj = parseDateString(tx.Date);
            const formattedDate = dateObj.toString() === 'Invalid Date' ? '' : dateObj.toLocaleString();
            const row = [ description, tx.Amount, tx.Category || '', `"${formattedDate}"` ];
            csvContent += row.join(',') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'zoeywallet_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- INITIALIZATION ---
    downloadBtn.addEventListener('click', downloadCSV);
    fetchData();
});