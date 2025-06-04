class TransactionManager {
  constructor() {
    this.transactions = [];
    this.filteredTransactions = [];
    this.sortDirection = { date: 'desc', amount: 'desc' };
    this.lastSort = null;

    this.initElements();
    this.initChart();
    this.loadTransactions();
    this.addEventListeners();
  }

  initElements() {
    this.form = document.getElementById('transaction-form');
    this.titleInput = document.getElementById('title');
    this.amountInput = document.getElementById('amount');
    this.typeSelect = document.getElementById('type');
    this.dateInput = document.getElementById('date');
    this.categoryInput = document.getElementById('category');

    this.filterTypeSelect = document.getElementById('filter-type');
    this.filterCategorySelect = document.getElementById('filter-category');
    this.sortDateBtn = document.getElementById('sort-date');
    this.sortAmountBtn = document.getElementById('sort-amount');

    this.transactionsList = document.getElementById('transactions-list');
    this.chartSection = document.querySelector('.chart-section');
    this.ctx = document.getElementById('expense-chart').getContext('2d');
  }

  initChart() {
    this.expenseChart = new Chart(this.ctx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          label: 'Расходы по категориям',
          data: [],
          backgroundColor: [],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  async loadTransactions() {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      this.transactions = JSON.parse(saved);
    } else {
      try {
        const res = await fetch('transactions.json');
        this.transactions = await res.json();
        this.saveTransactions();
      } catch (e) {
        console.error('Ошибка загрузки initial data', e);
        this.transactions = [];
      }
    }
    this.updateCategoryFilter();
    this.applyFiltersAndSort();
  }

  saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(this.transactions));
  }

  updateCategoryFilter() {
    const categories = [...new Set(this.transactions.map(t => t.category))].sort();
    this.filterCategorySelect.innerHTML =
      `<option value="all">Все категории</option>` +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  addTransaction(transaction) {
    this.transactions.push(transaction);
    this.saveTransactions();
    this.updateCategoryFilter();
    this.applyFiltersAndSort();
  }

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions();
    this.updateCategoryFilter();
    this.applyFiltersAndSort();
  }

  renderTransactions(list) {
    if (list.length === 0) {
      this.transactionsList.innerHTML = `<p>Транзакции не найдены.</p>`;
      return;
    }
    this.transactionsList.innerHTML = '';
    list.forEach(t => {
      const card = document.createElement('div');
      card.className = `transaction-card ${t.type === 'income' ? 'income' : 'expense'}`;
      card.innerHTML = `
        <div><strong>${t.title}</strong> (${t.category})</div>
        <div>${t.date}</div>
        <div>${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}</div>
        <button class="delete-btn" data-id="${t.id}">Удалить</button>
      `;
      this.transactionsList.appendChild(card);
    });

    this.transactionsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => {
        const id = +btn.getAttribute('data-id');
        this.deleteTransaction(id);
      };
    });
  }

  updateChart(list) {
    const expenses = list.filter(t => t.type === 'expense');
    const sums = {};
    expenses.forEach(({ category, amount }) => {
      sums[category] = (sums[category] || 0) + amount;
    });

    const labels = Object.keys(sums);
    const data = Object.values(sums);

    const colors = [
      '#f44336', '#e57373', '#ba000d', '#ff8a80', '#d32f2f',
      '#4caf50', '#81c784', '#2e7d32', '#a5d6a7', '#388e3c'
    ];

    this.expenseChart.data.labels = labels;
    this.expenseChart.data.datasets[0].data = data;
    this.expenseChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    this.expenseChart.update();
  }

  applyFiltersAndSort() {
    const typeFilter = this.filterTypeSelect.value;
    const categoryFilter = this.filterCategorySelect.value;

    this.filteredTransactions = this.transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });

    if (this.lastSort === 'date') {
      this.filteredTransactions.sort((a, b) =>
        this.sortDirection.date === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date)
      );
    } else if (this.lastSort === 'amount') {
      this.filteredTransactions.sort((a, b) =>
        this.sortDirection.amount === 'asc' ? a.amount - b.amount : b.amount - a.amount
      );
    }

    this.renderTransactions(this.filteredTransactions);

    if (typeFilter === 'income') {
      this.chartSection.style.display = 'none';
    } else {
      this.chartSection.style.display = 'block';
      this.updateChart(this.filteredTransactions);
    }
  }

  addEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();

      const transaction = {
        id: Date.now(),
        title: this.titleInput.value.trim(),
        amount: +this.amountInput.value,
        type: this.typeSelect.value,
        date: this.dateInput.value,
        category: this.categoryInput.value.trim(),
      };

      if (!transaction.title || !transaction.amount || !transaction.date || !transaction.category) {
        alert('Пожалуйста, заполните все поля корректно');
        return;
      }

      this.form.reset();
      this.addTransaction(transaction);
    });

    this.filterTypeSelect.addEventListener('change', () => this.applyFiltersAndSort());
    this.filterCategorySelect.addEventListener('change', () => this.applyFiltersAndSort());

    this.sortDateBtn.addEventListener('click', () => {
      this.sortDirection.date = this.sortDirection.date === 'asc' ? 'desc' : 'asc';
      this.lastSort = 'date';
      this.applyFiltersAndSort();
    });

    this.sortAmountBtn.addEventListener('click', () => {
      this.sortDirection.amount = this.sortDirection.amount === 'asc' ? 'desc' : 'asc';
      this.lastSort = 'amount';
      this.applyFiltersAndSort();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TransactionManager();
});
