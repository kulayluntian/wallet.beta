((app) => {
    app.wallet = {};

    // --- DOM Elements ---
    const walletTimeFilter = document.getElementById("walletTimeFilter");
    const summaryContainer = document.getElementById('walletSummaryContainer');
    const graphModal = document.getElementById('graphModal');
    const closeGraphBtn = document.getElementById('closeGraphBtn');
    const graphTitle = document.getElementById('graphTitle');
    const chartCanvas = document.getElementById('chartCanvas');
    const barGraphBtn = document.getElementById('barGraphBtn');
    const lineGraphBtn = document.getElementById('lineGraphBtn');
    let chartInstance = null;

    // --- State for re-rendering chart ---
    let currentGraphDataType = null;
    let currentGraphPeriod = null;

    // --- CHART LOGIC ---
    function showGraph(dataType, period) {
        currentGraphDataType = dataType;
        currentGraphPeriod = period;

        graphTitle.textContent = `${dataType} Trend`;
        
        const { labels, data } = processDataForChart(dataType, period);
        
        const colors = {
            Funds: 'rgba(166, 255, 166, 0.6)',
            Expenses: 'rgba(255, 179, 179, 0.6)',
            Savings: 'rgba(191, 168, 211, 0.6)'
        };
        const borderColor = {
            Funds: 'rgb(166, 255, 166)',
            Expenses: 'rgb(255, 179, 179)',
            Savings: 'rgb(191, 168, 211)'
        }

        if (chartInstance) {
            chartInstance.destroy();
        }
        
        barGraphBtn.classList.toggle('active', app.settings.preferences.graphType === 'bar');
        lineGraphBtn.classList.toggle('active', app.settings.preferences.graphType === 'line');

        chartInstance = new Chart(chartCanvas, {
            type: app.settings.preferences.graphType,
            data: {
                labels: labels,
                datasets: [{
                    label: dataType,
                    data: data,
                    backgroundColor: colors[dataType] || colors['Savings'],
                    borderColor: borderColor[dataType] || borderColor['Savings'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // *** THE FAULTY CUSTOM ANIMATION BLOCK IS GONE ***
                // This allows the default "grow from bottom" animation to work correctly.
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `₱${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value;
                            }
                        }
                    }
                }
            }
        });

        graphModal.style.display = 'flex';
    }

    function processDataForChart(dataType, period) {
        const ranges = getDateRanges(period);
        const transactions = app.allTransactionsCache.filter(tx => {
            const txDate = new Date(tx.Date);
            return txDate >= ranges.current.start && txDate <= ranges.current.end;
        });

        let labels = [];
        let data = [];

        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (period === 'day') {
            labels = Array.from({length: 24}, (_, i) => `${i % 12 === 0 ? 12 : i % 12}${i < 12 ? 'am' : 'pm'}`);
            data = new Array(24).fill(0);
        } else if (period === 'week') {
            labels = weekDays;
            data = new Array(7).fill(0);
        } else if (period === 'month') {
            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
            data = new Array(daysInMonth).fill(0);
        } else { // year or all
            labels = months;
            data = new Array(12).fill(0);
        }

        transactions.forEach(tx => {
            const amount = Number(tx.Amount);
            const txDate = new Date(tx.Date);
            let index = -1;

            if (period === 'day') index = txDate.getHours();
            else if (period === 'week') index = txDate.getDay();
            else if (period === 'month') index = txDate.getDate() - 1;
            else index = txDate.getMonth();

            if (index > -1) {
                if (dataType === 'Funds' && tx.Category === 'Money') {
                    data[index] += amount;
                } else if (dataType === 'Expenses' && amount < 0) {
                    data[index] += Math.abs(amount);
                } else if (dataType === 'Savings' && tx.Category === 'Savings') {
                    data[index] += Math.abs(amount);
                }
            }
        });

        return { labels, data };
    }


    // --- WALLET VIEW LOGIC ---
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
                const percentageChange = Math.abs(previousAmount) > 0 ? ((currentAmount - previousAmount) / Math.abs(previousAmount)) * 100 : 0;
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
        return `<div class="summary-card" data-type="${title}"><div class="summary-details"><span class="summary-title">${title}</span><span class="summary-comparison ${comparisonClass}">${comparisonText}</span></div><span class="summary-amount">₱${currentAmount.toFixed(2)}</span></div>`;
    }
    
    app.wallet.render = async () => {
        summaryContainer.innerHTML = `<p>Loading summary...</p>`;
        
        if (app.allTransactionsCache.length === 0) {
            try {
                const { data, error } = await app.supabaseClient.from('Wallet').select('*');
                if (error) throw error;
                app.allTransactionsCache = data;
            } catch (error) {
                console.error("Failed to fetch data for wallet view:", error);
                summaryContainer.innerHTML = `<p>Could not load summary data.</p>`;
                return;
            }
        }
        const period = walletTimeFilter.value;
        const ranges = getDateRanges(period);
        const summary = calculateSummary(app.allTransactionsCache, ranges);
        summaryContainer.innerHTML = `
            ${createSummaryCard('Funds', summary.current.funds, summary.previous.funds, period)}
            ${createSummaryCard('Expenses', summary.current.expenses, summary.previous.expenses, period)}
            ${createSummaryCard('Savings', summary.current.savings, summary.previous.savings, period)}
        `;

        summaryContainer.querySelectorAll('.summary-card').forEach(card => {
            card.addEventListener('click', () => {
                showGraph(card.dataset.type, walletTimeFilter.value);
            });
        });
    };

    // --- INITIALIZATION ---
    app.wallet.init = () => {
        walletTimeFilter.addEventListener('change', app.wallet.render);
        closeGraphBtn.addEventListener('click', () => graphModal.style.display = 'none');
        graphModal.addEventListener('click', (e) => {
            if(e.target === graphModal) {
                graphModal.style.display = 'none';
            }
        });

        barGraphBtn.addEventListener('click', () => {
            app.settings.preferences.graphType = 'bar';
            app.settings.save();
            showGraph(currentGraphDataType, currentGraphPeriod);
        });

        lineGraphBtn.addEventListener('click', () => {
            app.settings.preferences.graphType = 'line';
            app.settings.save();
            showGraph(currentGraphDataType, currentGraphPeriod);
        });
    };

})(ZoeyWalletApp);