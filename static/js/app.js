/**
 * 凤凰台现金管理系统 - 前端主逻辑
 * 版本: 2.1 (增加编辑功能)
 */

// 配置
const CONFIG = {
    API_BASE: '',
    NOTIFICATION_DURATION: 3000,
    AUTO_REFRESH_INTERVAL: 60000,
};

// 系统状态
const state = {
    transactions: [],
    balance: 0,
    currentPeriod: 'day',
    selectedDate: null,
    categories: ['餐饮', '交通', '购物', '娱乐', '工资', '其他'],
    isLoading: false,
    editingTransaction: null
};

// DOM 元素
const elements = {
    currentDate: null,
    totalIncome: null,
    totalExpense: null,
    netBalance: null,
    transactionList: null,
    addTransactionBtn: null,
    mainChart: null,
    dateSelector: null,
    periodButtons: null,
    notification: null
};

// 全局变量暴露
window.state = state;
window.updateUI = updateUI;
window.addTransaction = addTransaction;

// ==================== 初始化 ====================
function init() {
    // 获取 DOM 元素
    elements.currentDate = document.getElementById('currentDate');
    elements.totalIncome = document.getElementById('totalIncome');
    elements.totalExpense = document.getElementById('totalExpense');
    elements.netBalance = document.getElementById('netBalance');
    elements.transactionList = document.getElementById('transactionList');
    elements.addTransactionBtn = document.getElementById('addTransaction');
    elements.mainChart = document.getElementById('mainChart');
    elements.dateSelector = document.getElementById('dateSelector');
    elements.periodButtons = document.querySelectorAll('.period-selector button');
    elements.notification = document.getElementById('notification');
    
    // 初始化日期
    const today = formatDate(new Date());
    state.selectedDate = today;
    if (elements.dateSelector) {
        elements.dateSelector.value = today;
    }
    
    // 绑定事件
    bindEvents();
    
    // 更新时间显示
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // 加载数据
    loadData();
    
    // 定期刷新
    setInterval(loadData, CONFIG.AUTO_REFRESH_INTERVAL);
}

// ==================== 事件绑定 ====================
function bindEvents() {
    // 添加交易
    if (elements.addTransactionBtn) {
        elements.addTransactionBtn.addEventListener('click', addTransaction);
    }
    
    // 周期切换
    if (elements.periodButtons) {
        elements.periodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.periodButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentPeriod = btn.dataset.period;
                updateUI();
            });
        });
    }
    
    // 日期选择
    if (elements.dateSelector) {
        elements.dateSelector.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            updateDateTime();
            updateUI();
        });
    }
    
    // Enter 提交
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTransaction();
            }
        });
    }
}

// ==================== 数据加载 ====================
async function loadData() {
    if (state.isLoading) return;
    
    try {
        state.isLoading = true;
        
        const response = await fetch(`${CONFIG.API_BASE}/api/transactions`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            state.transactions = data.transactions || [];
            state.balance = data.balance || 0;
            updateUI();
        } else {
            throw new Error(data.message || '加载失败');
        }
        
    } catch (error) {
        console.error('数据加载失败:', error);
        showNotification('数据加载失败: ' + error.message, 'error');
    } finally {
        state.isLoading = false;
    }
}

// ==================== UI 更新 ====================
function updateUI() {
    updateBalance();
    renderTransactionList();
    renderChart();
}

function updateDateTime() {
    if (!elements.currentDate) return;
    
    const now = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}`;
    const timeStr = `${now.getHours() < 12 ? '上午' : '下午'}`;
    
    elements.currentDate.textContent = `${dateStr} ${timeStr}`;
}

function updateBalance() {
    const filtered = filterTransactions();
    
    const totalIncome = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const totalExpense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    if (elements.totalIncome) {
        elements.totalIncome.textContent = `¥${totalIncome.toFixed(2)}`;
    }
    if (elements.totalExpense) {
        elements.totalExpense.textContent = `¥${totalExpense.toFixed(2)}`;
    }
    if (elements.netBalance) {
        elements.netBalance.textContent = `¥${(totalIncome - totalExpense).toFixed(2)}`;
    }
}

function renderTransactionList() {
    if (!elements.transactionList) return;
    
    const filtered = filterTransactions()
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 50); // 只显示前50条
    
    if (filtered.length === 0) {
        elements.transactionList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>暂无交易记录</p>
            </div>
        `;
        return;
    }
    
    elements.transactionList.innerHTML = '';
    
    filtered.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.dataset.id = transaction.id;
        
        const time = new Date(transaction.time);
        const timeStr = formatDateTime(time);
        
        item.innerHTML = `
            <div class="transaction-info">
                <div style="font-weight: 500;">${escapeHtml(transaction.remark || transaction.category)}</div>
                <div class="transaction-category">${escapeHtml(transaction.category)} · ${getTimePeriod(time)}</div>
                <div class="transaction-time">${timeStr}</div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}¥${parseFloat(transaction.amount).toFixed(2)}
            </div>
            <div class="transaction-actions" style="display: flex; gap: 5px; margin-left: 10px;">
                <button class="btn-edit" onclick="editTransaction(${transaction.id})" title="编辑">
                    ✏️
                </button>
                <button class="btn-delete" onclick="deleteTransaction(${transaction.id})" title="删除">
                    🗑️
                </button>
            </div>
        `;
        
        elements.transactionList.appendChild(item);
    });
}

function renderChart() {
    if (!elements.mainChart || typeof echarts === 'undefined') {
        if (elements.mainChart) {
            elements.mainChart.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">图表功能不可用</p>';
        }
        return;
    }
    
    const chart = echarts.init(elements.mainChart);
    const filtered = filterTransactions();
    
    if (state.currentPeriod === 'day') {
        renderDayChart(chart, filtered);
    } else if (state.currentPeriod === 'week') {
        renderWeekChart(chart, filtered);
    } else {
        renderMonthChart(chart, filtered);
    }
    
    window.addEventListener('resize', () => chart.resize());
}

function renderDayChart(chart, transactions) {
    const categoryData = {};
    
    transactions.forEach(t => {
        if (!t || !t.category) return;
        
        if (!categoryData[t.category]) {
            categoryData[t.category] = { income: 0, expense: 0 };
        }
        
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
            categoryData[t.category].income += amount;
        } else {
            categoryData[t.category].expense += amount;
        }
    });
    
    const categories = Object.keys(categoryData);
    const incomeData = categories.map(c => categoryData[c].income);
    const expenseData = categories.map(c => categoryData[c].expense);
    
    const option = {
        title: {
            text: '当日分类趋势',
            left: 'center',
            textStyle: { 
                fontSize: 16, 
                fontWeight: 'bold',
                color: '#333'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { 
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            },
            formatter: params => {
                let result = `<strong>${params[0].axisValue}</strong><br>`;
                let total = 0;
                params.forEach(p => {
                    if (p.value > 0) {
                        const value = Math.abs(p.value).toFixed(2);
                        result += `${p.marker} ${p.seriesName}: ¥${value}<br>`;
                        total += p.value;
                    }
                });
                if (params.length > 1) {
                    result += `<strong>合计: ¥${total.toFixed(2)}</strong>`;
                }
                return result;
            }
        },
        legend: { 
            data: ['收入', '支出'], 
            bottom: 5,
            icon: 'roundRect'
        },
        grid: { 
            left: '3%', 
            right: '4%', 
            bottom: '15%', 
            top: '18%', 
            containLabel: true 
        },
        xAxis: { 
            type: 'category', 
            data: categories,
            axisLabel: {
                rotate: categories.length > 5 ? 30 : 0,
                interval: 0
            }
        },
        yAxis: { 
            type: 'value',
            name: '金额（¥）',
            axisLabel: {
                formatter: value => {
                    if (value >= 1000) {
                        return (value / 1000).toFixed(1) + 'k';
                    }
                    return value.toFixed(0);
                }
            }
        },
        series: [
            {
                name: '收入',
                type: 'line',
                data: incomeData,
                smooth: true,
                itemStyle: { color: '#43e97b' },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(67, 233, 123, 0.3)' },
                            { offset: 1, color: 'rgba(67, 233, 123, 0.05)' }
                        ]
                    }
                },
                symbolSize: 8
            },
            {
                name: '支出',
                type: 'line',
                data: expenseData,
                smooth: true,
                itemStyle: { color: '#f72585' },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(247, 37, 133, 0.3)' },
                            { offset: 1, color: 'rgba(247, 37, 133, 0.05)' }
                        ]
                    }
                },
                symbolSize: 8
            }
        ]
    };
    
    chart.setOption(option);
}

function renderWeekChart(chart, transactions) {
    // 计算本周每天的收支情况
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const selectedDate = new Date(state.selectedDate);
    const dayOfWeek = selectedDate.getDay();
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const incomeData = [0, 0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0, 0];
    
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const diff = Math.floor((tDate - monday) / (1000 * 60 * 60 * 24));
        
        if (diff >= 0 && diff < 7) {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
                incomeData[diff] += amount;
            } else if (t.type === 'expense') {
                expenseData[diff] += amount;
            }
        }
    });
    
    const option = {
        title: {
            text: '本周收支趋势',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            data: ['收入', '支出'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: weekDays,
            boundaryGap: false
        },
        yAxis: {
            type: 'value',
            name: '金额（¥）'
        },
        series: [
            {
                name: '收入',
                type: 'line',
                data: incomeData,
                itemStyle: { color: '#4cc9f0' },
                smooth: true,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(76, 201, 240, 0.3)' },
                            { offset: 1, color: 'rgba(76, 201, 240, 0.05)' }
                        ]
                    }
                }
            },
            {
                name: '支出',
                type: 'line',
                data: expenseData,
                itemStyle: { color: '#f72585' },
                smooth: true,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(247, 37, 133, 0.3)' },
                            { offset: 1, color: 'rgba(247, 37, 133, 0.05)' }
                        ]
                    }
                }
            }
        ]
    };
    
    chart.setOption(option);
}

function renderMonthChart(chart, transactions) {
    // 获取当前月份的天数
    const selectedDate = new Date(state.selectedDate);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 初始化数据
    const incomeData = Array(daysInMonth).fill(0);
    const expenseData = Array(daysInMonth).fill(0);
    const dateLabels = Array.from({length: daysInMonth}, (_, i) => `${i+1}日`);
    
    // 统计每天的收支
    transactions.forEach(t => {
        if (!t.date) return;
        
        const tDate = new Date(t.date);
        if (tDate.getFullYear() === year && tDate.getMonth() === month) {
            const day = tDate.getDate() - 1;  // 数组索引从0开始
            const amount = parseFloat(t.amount) || 0;
            
            if (t.type === 'income') {
                incomeData[day] += amount;
            } else if (t.type === 'expense') {
                expenseData[day] += amount;
            }
        }
    });
    
    const option = {
        title: {
            text: `${year}年${month + 1}月收支统计`,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                let result = params[0].axisValue + '<br>';
                let totalIncome = 0;
                let totalExpense = 0;
                
                params.forEach(p => {
                    if (p.value > 0) {
                        result += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br>`;
                        if (p.seriesName === '收入') totalIncome = p.value;
                        else totalExpense = p.value;
                    }
                });
                
                const net = totalIncome - totalExpense;
                result += `<strong>净收入: ¥${net.toFixed(2)}</strong>`;
                return result;
            }
        },
        legend: {
            data: ['收入', '支出'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dateLabels,
            axisLabel: {
                interval: Math.floor(daysInMonth / 10), // 避免标签过密
                rotate: 0
            }
        },
        yAxis: {
            type: 'value',
            name: '金额（¥）'
        },
        series: [
            {
                name: '收入',
                type: 'bar',
                data: incomeData,
                itemStyle: { color: '#4cc9f0' },
                barMaxWidth: 30
            },
            {
                name: '支出',
                type: 'bar',
                data: expenseData,
                itemStyle: { color: '#f72585' },
                barMaxWidth: 30
            }
        ]
    };
    
    chart.setOption(option);
}

// ==================== 交易操作 ====================
async function addTransaction() {
    const type = document.getElementById('transactionType')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const category = document.getElementById('category')?.value;
    const remark = document.getElementById('remark')?.value || '';
    
    if (!amount || isNaN(amount) || amount <= 0) {
        showNotification('请输入有效的金额', 'error');
        return;
    }
    
    const now = new Date();
    const transaction = {
        type,
        amount,
        category,
        remark,
        date: formatDate(now),
        time: now.toISOString()
    };
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            document.getElementById('amount').value = '';
            document.getElementById('remark').value = '';
            showNotification('交易添加成功 ✅', 'success');
            await loadData();
        } else {
            throw new Error(data.message || '添加失败');
        }
        
    } catch (error) {
        console.error('添加交易错误:', error);
        showNotification('添加失败: ' + error.message, 'error');
    }
}

// 编辑交易
window.editTransaction = async function(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) {
        showNotification('未找到该交易记录', 'error');
        return;
    }
    
    // 填充表单
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.getElementById('remark').value = transaction.remark || '';
    
    // 修改按钮
    const btn = document.getElementById('addTransaction');
    const btnText = document.getElementById('btnText');
    if (btnText) {
        btnText.textContent = '💾 保存修改';
    } else {
        btn.textContent = '💾 保存修改';
    }
    btn.style.background = 'linear-gradient(135deg, #f72585 0%, #ff6a00 100%)';
    
    // 保存编辑状态
    state.editingTransaction = id;
    
    // 修改按钮事件
    btn.onclick = () => saveEditTransaction(id);
    
    // 滚动到表单
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('编辑模式：修改后点击"保存修改"', 'info');
};

// 保存编辑
async function saveEditTransaction(id) {
    const type = document.getElementById('transactionType')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const category = document.getElementById('category')?.value;
    const remark = document.getElementById('remark')?.value || '';
    
    if (!amount || isNaN(amount) || amount <= 0) {
        showNotification('请输入有效的金额', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, amount, category, remark })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('修改成功 ✅', 'success');
            cancelEdit();
            await loadData();
        } else {
            throw new Error(data.message || '修改失败');
        }
        
    } catch (error) {
        console.error('修改交易错误:', error);
        showNotification('修改失败: ' + error.message, 'error');
    }
}

// 取消编辑
function cancelEdit() {
    state.editingTransaction = null;
    
    const btn = document.getElementById('addTransaction');
    const btnText = document.getElementById('btnText');
    if (btnText) {
        btnText.textContent = '✅ 添加交易';
    } else {
        btn.textContent = '✅ 添加交易';
    }
    btn.style.background = '';
    btn.onclick = addTransaction;
    
    document.getElementById('amount').value = '';
    document.getElementById('remark').value = '';
}

// 删除交易
window.deleteTransaction = async function(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) {
        showNotification('未找到该交易记录', 'error');
        return;
    }
    
    const confirmMsg = `确定删除这条记录吗？\n\n分类: ${transaction.category}\n金额: ¥${transaction.amount}\n备注: ${transaction.remark || '无'}`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/transactions/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('删除成功 ✅', 'success');
            await loadData();
        } else {
            throw new Error(data.message || '删除失败');
        }
        
    } catch (error) {
        console.error('删除交易错误:', error);
        showNotification('删除失败: ' + error.message, 'error');
    }
};

// ==================== 辅助函数 ====================
function filterTransactions() {
    if (!state.selectedDate) return state.transactions;
    
    return state.transactions.filter(t => {
        if (!t || !t.date) return false;
        
        switch (state.currentPeriod) {
            case 'day':
                return t.date === state.selectedDate;
            case 'week':
                // 获取选中日期所在周的起始和结束日期
                const selectedDate = new Date(state.selectedDate);
                const dayOfWeek = selectedDate.getDay();
                const monday = new Date(selectedDate);
                monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                
                const transactionDate = new Date(t.date);
                return transactionDate >= monday && transactionDate <= sunday;
            case 'month':
                const month = state.selectedDate.substring(0, 7);
                return t.date.startsWith(month);
            default:
                return true;
        }
    });
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
    const dateStr = formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
}

function getTimePeriod(date) {
    const hours = date.getHours();
    if (hours >= 6 && hours < 12) return '上午';
    if (hours >= 12 && hours < 14) return '中午';
    if (hours >= 14 && hours < 18) return '下午';
    return '晚上';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    if (!elements.notification) return;
    
    const colors = {
        success: 'rgba(76, 201, 240, 0.95)',
        error: 'rgba(247, 37, 133, 0.95)',
        info: 'rgba(67, 97, 238, 0.95)'
    };
    
    elements.notification.textContent = message;
    elements.notification.style.backgroundColor = colors[type] || colors.info;
    elements.notification.classList.add('show');
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, CONFIG.NOTIFICATION_DURATION);
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', init);
