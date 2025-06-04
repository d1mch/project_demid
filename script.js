const form = document.getElementById('transaction-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const dateInput = document.getElementById('date');
const categoryInput = document.getElementById('category');

const filterTypeSelect = document.getElementById('filter-type');
const filterCategorySelect = document.getElementById('filter-category');
const sortDateBtn = document.getElementById('sort-date');
const sortAmountBtn = document.getElementById('sort-amount');

const transactionsList = document.getElementById('transactions-list');
const chartSection = document.querySelector('.chart-section');
const ctx = document.getElementById('expense-chart').getContext('2d');

let transactions = [];
let filteredTransactions = [];
let sortDirection = { date: 'desc', amount: 'desc' };

let expenseChart = new Chart(ctx, {
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
    plugins: {
      legend: { position: 'bottom' },
    },
  },
});


async function loadTransactions() {
  const saved = localStorage.getItem('transactions');
  if (saved) {
    transactions = JSON.parse(saved);
  } else {
    try {
      const res = await fetch('transactions.json');
      transactions = await res.json();
      saveTransactions();
    } catch (e) {
      console.error('Ошибка загрузки initial data', e);
      transactions = [];
    }
  }
  updateCategoryFilter();
  applyFiltersAndSort();
}


function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// обновление фильтра по категориям
function updateCategoryFilter() {
  const categories = [...new Set(transactions.map(t => t.category))].sort();
  filterCategorySelect.innerHTML = `<option value="all">Все категории</option>` +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

// добавление транзакции
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTransaction = {
    id: Date.now(),
    title: titleInput.value.trim(),
    amount: +amountInput.value,
    type: typeSelect.value,
    date: dateInput.value,
    category: categoryInput.value.trim(),
  };

  if (!newTransaction.title || !newTransaction.amount || !newTransaction.date || !newTransaction.category) {
    alert('Пожалуйста, заполните все поля корректно');
    return;
  }

  transactions.push(newTransaction);
  saveTransactions();
  updateCategoryFilter();
  form.reset();
  applyFiltersAndSort();
});

// удаление транзакции
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  updateCategoryFilter();
  applyFiltersAndSort();
}

// рендеринг списка транзакций
function renderTransactions(list) {
  if (list.length === 0) {
    transactionsList.innerHTML = `<p>Транзакции не найдены.</p>`;
    return;
  }
  transactionsList.innerHTML = '';
  list.forEach(t => {
    const card = document.createElement('div');
    card.className = `transaction-card ${t.type === 'income' ? 'income' : 'expense'}`;

    card.innerHTML = `
      <div><strong>${t.title}</strong> (${t.category})</div>
      <div>${t.date}</div>
      <div>${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}</div>
      <button class="delete-btn" data-id="${t.id}">Удалить</button>
    `;
    transactionsList.appendChild(card);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.getAttribute('data-id');
      deleteTransaction(id);
    };
  });
}

// диаграмма (только расходы)
function updateChart(list) {
  const expenses = list.filter(t => t.type === 'expense');
  const sums = {};
  expenses.forEach(({ category, amount }) => {
    sums[category] = (sums[category] || 0) + amount;
  });

  const labels = Object.keys(sums);
  const data = Object.values(sums);

  // цвета для категорий 
  const colors = [
    '#f44336', '#e57373', '#ba000d', '#ff8a80', '#d32f2f',
    '#4caf50', '#81c784', '#2e7d32', '#a5d6a7', '#388e3c'
  ];

  expenseChart.data.labels = labels;
  expenseChart.data.datasets[0].data = data;
  expenseChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
  expenseChart.update();
}

// применение фильтров и сортировки
function applyFiltersAndSort() {
  const typeFilter = filterTypeSelect.value;
  const categoryFilter = filterCategorySelect.value;

  filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  // сортировка
  if (lastSort === 'date') {
    filteredTransactions.sort((a, b) => {
      if (sortDirection.date === 'asc') return new Date(a.date) - new Date(b.date);
      else return new Date(b.date) - new Date(a.date);
    });
  } else if (lastSort === 'amount') {
    filteredTransactions.sort((a, b) => {
      if (sortDirection.amount === 'asc') return a.amount - b.amount;
      else return b.amount - a.amount;
    });
  }

  renderTransactions(filteredTransactions);

  if (typeFilter === 'income') {
    chartSection.style.display = 'none';
  } else {
    chartSection.style.display = 'block';
    updateChart(filteredTransactions);
  }
}


filterTypeSelect.addEventListener('change', () => {
  applyFiltersAndSort();
});

filterCategorySelect.addEventListener('change', () => {
  applyFiltersAndSort();
});

let lastSort = null;

sortDateBtn.addEventListener('click', () => {
  sortDirection.date = sortDirection.date === 'asc' ? 'desc' : 'asc';
  lastSort = 'date';
  applyFiltersAndSort();
});

sortAmountBtn.addEventListener('click', () => {
  sortDirection.amount = sortDirection.amount === 'asc' ? 'desc' : 'asc';
  lastSort = 'amount';
  applyFiltersAndSort();
});

loadTransactions();
