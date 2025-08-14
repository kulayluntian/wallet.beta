document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://kikavthamaslaxxdpabj.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2F2dGhhbWFzbGF4eGRwYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzEwMTAsImV4cCI6MjA3MDY0NzAxMH0.-Opk4pzWgfJwILshx6HhyE7bi2eeur8t8x-5C2_fxGE';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- DOM ELEMENTS ---
    const tableBody = document.getElementById('dataTableBody');
    const downloadBtn = document.getElementById('downloadCsvBtn');

    // --- STATE ---
    let tableData = [];

    /**
     * Reliably parses the custom "M/D/YYYY HH:MM:SS" date string from the database.
     */
    function parseCustomDateString(dateString) {
        if (!dateString) return new Date(NaN);

        const parts = dateString.split(' ');
        if (parts.length < 2) return new Date(NaN);

        const dateParts = parts[0].split('/');
        const timeParts = parts[1].split(':');

        if (dateParts.length < 3 || timeParts.length < 3) return new Date(NaN);

        const year = parseInt(dateParts[2], 10);
        const month = parseInt(dateParts[0], 10) - 1;
        const day = parseInt(dateParts[1], 10);
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = parseInt(timeParts[2], 10);

        return new Date(year, month, day, hours, minutes, seconds);
    }

    /**
     * Fetches data from the 'Wallet' table in Supabase.
     */
    async function fetchData() {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Loading data...</td></tr>`;

        const { data, error } = await supabaseClient.from('Wallet').select('*');

        if (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger-color);">Failed to load data. Check console.</td></tr>`;
            return;
        }

        data.sort((a, b) => parseCustomDateString(b.Date) - parseCustomDateString(a.Date));
        
        tableData = data;
        renderTable();
    }

    /**
     * Renders the fetched data into the HTML table.
     */
    function renderTable() {
        tableBody.innerHTML = '';

        if (tableData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No transactions found.</td></tr>`;
            return;
        }

        tableData.forEach(tx => {
            const tr = document.createElement('tr');

            const amount = Number(tx.Amount) || 0;
            const amountClass = amount < 0 ? 'expense' : 'income';
            
            const dateObj = parseCustomDateString(tx.Date);
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

    /**
     * Converts the table data to a CSV string and triggers a download.
     */
    function downloadCSV() {
        if (tableData.length === 0) {
            alert('No data to download.');
            return;
        }

        const headers = ['Description', 'Amount', 'Category', 'Date'];
        let csvContent = headers.join(',') + '\n';

        tableData.forEach(tx => {
            const description = `"${String(tx.Description || '').replace(/"/g, '""')}"`;
            const dateObj = parseCustomDateString(tx.Date);
            const formattedDate = dateObj.toString() === 'Invalid Date' ? '' : dateObj.toLocaleString();

            const row = [
                description,
                tx.Amount,
                tx.Category || '',
                `"${formattedDate}"`
            ];
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // --- INITIALIZATION ---
    downloadBtn.addEventListener('click', downloadCSV);
    fetchData();
});