import React, { useState, useEffect, useCallback } from 'react';
import { transactionApi } from '../../api/transactionApi';
import TransactionForm from './TransactionForm';
import './Transactions.css';

const TransactionList = () => {  // ✅ BỎ userId props
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [filter, setFilter] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        type: 'all'
    });
    const [availableYears, setAvailableYears] = useState([]);
    const [loadingYears, setLoadingYears] = useState(true);

    const loadAvailableYears = useCallback(async () => {
        try {
            setLoadingYears(true);
            const response = await transactionApi.getAvailableYears();
            setAvailableYears(response.data.sort((a, b) => b - a));
        } catch (error) {
            console.error('Error loading years:', error);
            const currentYear = new Date().getFullYear();
            setAvailableYears([currentYear, currentYear - 1, currentYear - 2]);
        } finally {
            setLoadingYears(false);
        }
    }, []);

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await transactionApi.getMonthlyTransactions(
                filter.month,
                filter.year
            );
            setTransactions(response.data || []);
        } catch (err) {
            console.error('Error loading transactions:', err);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [filter.month, filter.year]);

    useEffect(() => {
        loadAvailableYears();
    }, [loadAvailableYears]);

    useEffect(() => {
        if (filter.year) {
            loadTransactions();
        }
    }, [loadTransactions, filter.year, refresh]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await transactionApi.delete(id);
                setRefresh(prev => !prev);
                loadAvailableYears();
            } catch (err) {
                alert('Delete failed');
            }
        }
    };

    const handleSuccess = () => {
        setShowForm(false);
        setRefresh(prev => !prev);
    };

    const handleMonthChange = (e) => {
        setFilter({ ...filter, month: parseInt(e.target.value) });
    };

    const handleYearChange = (e) => {
        setFilter({ ...filter, year: parseInt(e.target.value) });
    };

    const handleTypeChange = (e) => {
        setFilter({ ...filter, type: e.target.value });
    };


    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getJarColor = (jarName) => {
        const colors = {
            'Chi tiêu cần thiết': '#4caf50',
            'Giáo dục': '#2196f3',
            'Tiết kiệm dài hạn': '#ff9800',
            'Hưởng thụ': '#9c27b0',
            'Tự do tài chính': '#f44336',
            'Cho đi': '#00bcd4'
        };
        return colors[jarName] || '#999';
    };

    const getJarIcon = (jarName) => {
        const icons = {
            'Chi tiêu cần thiết': '🛒',
            'Giáo dục': '📚',
            'Tiết kiệm dài hạn': '💰',
            'Hưởng thụ': '🎮',
            'Tự do tài chính': '📈',
            'Cho đi': '🎁'
        };
        return icons[jarName] || '📦';
    };
    const filteredTransactions = filter.type === 'all'
        ? transactions
        : transactions.filter(t => t.type === filter.type);

    const incomeTotal = filteredTransactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = filteredTransactions
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = incomeTotal - expenseTotal;

    if (loading) return <div className="loading">⏳ Loading...</div>;


    return (
        <div className="transaction-list-container">
            <div className="transaction-header">
                <h3>📋 Transaction History</h3>
                <button className="btn-new-transaction" onClick={() => setShowForm(true)}>
                    ➕ New Transaction
                </button>
            </div>

            <div className="filters-section">
                <div className="filters">
                    <select value={filter.month} onChange={handleMonthChange}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <option key={m} value={m}>Month {m}</option>
                        ))}
                    </select>

                    <select value={filter.year} onChange={handleYearChange} disabled={loadingYears}>
                        {loadingYears ? (
                            <option>Loading...</option>
                        ) : (
                            availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))
                        )}
                    </select>

                    <select value={filter.type} onChange={handleTypeChange}>
                        <option value="all">📊 All</option>
                        <option value="Income">💰 Income</option>
                        <option value="Expense">💸 Expense</option>
                    </select>
                </div>
            </div>

            {showForm && (
                <TransactionForm
                    onSuccess={handleSuccess}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No transactions yet</h3>
                    <p>Click "New Transaction" to add your first income or expense</p>
                    <button className="btn-new-transaction" onClick={() => setShowForm(true)}>
                        ➕ Add your first transaction
                    </button>
                </div>
            ) : (
                <>
                        <div className="transaction-list">
                            {filteredTransactions.map(transaction => (
                                <div key={transaction.id} className={`transaction-item ${transaction.type.toLowerCase()}`}>
                                    <div className="transaction-info">
                                        <div className="transaction-category">
                                            <strong>{transaction.categoryName}</strong>
                                            <span
                                                className="transaction-jar"
                                                style={{
                                                    backgroundColor: getJarColor(transaction.jarName),
                                                    color: 'white'
                                                }}
                                            >
                                                {getJarIcon(transaction.jarName)} {transaction.jarName}
                                            </span>
                                        </div>
                                        <div className="transaction-date">{formatDate(transaction.transactionDate)}</div>
                                        {transaction.note && <div className="transaction-note">📝 {transaction.note}</div>}
                                    </div>

                                    <div className="transaction-amount">
                                        <span className={transaction.type.toLowerCase()}>
                                            {transaction.type === 'Income' ? '+' : '-'} {formatMoney(transaction.amount)}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(transaction.id)}
                                            className="btn-delete"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    <div className="transaction-summary">
                        <h4>📊 Summary - Month {filter.month}/{filter.year}</h4>
                        <div className="summary-row">
                            <span>Total Income:</span>
                            <strong className="income">+ {formatMoney(incomeTotal)}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Total Expense:</span>
                            <strong className="expense">- {formatMoney(expenseTotal)}</strong>
                        </div>
                        <div className="summary-row total">
                            <span>Remaining:</span>
                            <strong className={balance >= 0 ? 'income' : 'expense'}>
                                {formatMoney(balance)}
                            </strong>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionList;






