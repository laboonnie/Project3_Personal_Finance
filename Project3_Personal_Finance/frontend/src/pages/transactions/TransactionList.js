import React, { useState, useEffect, useCallback } from 'react';
import { transactionApi } from '../../api/transactionApi';
import TransactionForm from './TransactionForm';
import './Transactions.css';

const TransactionList = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState(null);

    const [historyTransactionId, setHistoryTransactionId] = useState(null);
    const [editHistory, setEditHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [refresh, setRefresh] = useState(false);

    const [filter, setFilter] = useState({
        month: 'all',
        year: 'all',
        type: 'all'
    });

    const [availableYears, setAvailableYears] = useState([]);
    const [loadingYears, setLoadingYears] = useState(true);

    // ==================== LOAD YEARS ====================

    const loadAvailableYears = useCallback(async () => {
        try {
            setLoadingYears(true);

            const response = await transactionApi.getAvailableYears();

            setAvailableYears(
                (response.data || []).sort((a, b) => b - a)
            );
        } catch (error) {
            console.error('Error loading years:', error);

            const currentYear = new Date().getFullYear();

            setAvailableYears([
                currentYear,
                currentYear - 1,
                currentYear - 2
            ]);
        } finally {
            setLoadingYears(false);
        }
    }, []);

    // ==================== LOAD TRANSACTIONS ====================

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);

            let response;

            if (filter.month === 'all' || filter.year === 'all') {
                response = await transactionApi.getAll();
            } else {
                response = await transactionApi.getMonthlyTransactions(
                    filter.month,
                    filter.year
                );
            }

            setTransactions(response.data || []);
        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [filter.month, filter.year]);

    useEffect(() => {
        loadAvailableYears();
    }, [loadAvailableYears]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions, refresh]);

    // ==================== EDIT ====================

    const handleEdit = (transaction) => {
        setTransactionToEdit(transaction);
        setShowForm(true);
    };

    const handleSuccess = () => {
        setShowForm(false);
        setTransactionToEdit(null);

        // Đóng history cũ sau khi transaction thay đổi
        setHistoryTransactionId(null);
        setEditHistory([]);

        setRefresh(prev => !prev);
    };

    const handleCancel = () => {
        setShowForm(false);
        setTransactionToEdit(null);
    };

    // ==================== HISTORY ====================

    const handleViewHistory = async (transactionId) => {
        // Bấm lại transaction đang mở -> đóng
        if (historyTransactionId === transactionId) {
            setHistoryTransactionId(null);
            setEditHistory([]);
            return;
        }

        try {
            setLoadingHistory(true);

            const response =
                await transactionApi.getEditHistory(transactionId);

            setEditHistory(response.data || []);
            setHistoryTransactionId(transactionId);
        } catch (error) {
            console.error('Error loading edit history:', error);

            alert(
                error.response?.data?.message ||
                'Cannot load edit history'
            );
        } finally {
            setLoadingHistory(false);
        }
    };

    // ==================== FILTER ====================

    const handleMonthChange = (e) => {
        const value = e.target.value;

        setFilter(prev => ({
            ...prev,
            month: value === 'all'
                ? 'all'
                : parseInt(value, 10)
        }));
    };

    const handleYearChange = (e) => {
        const value = e.target.value;

        setFilter(prev => ({
            ...prev,
            year: value === 'all'
                ? 'all'
                : parseInt(value, 10)
        }));
    };

    const handleTypeChange = (e) => {
        setFilter(prev => ({
            ...prev,
            type: e.target.value
        }));
    };

    // ==================== FORMAT ====================

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';

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

        return colors[jarName] || '#64748b';
    };

    // ==================== DATA ====================

    const filteredTransactions =
        filter.type === 'all'
            ? transactions
            : transactions.filter(
                transaction => transaction.type === filter.type
            );

    /*
        Transaction mới nhất = ID lớn nhất.

        Không dùng TransactionDate vì người dùng có thể
        tạo transaction hôm nay nhưng chọn ngày giao dịch cũ.
    */
    const latestTransactionId =
        transactions.length > 0
            ? Math.max(...transactions.map(transaction => transaction.id))
            : null;

    const incomeTotal = filteredTransactions
        .filter(transaction => transaction.type === 'Income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expenseTotal = filteredTransactions
        .filter(transaction => transaction.type === 'Expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const balance = incomeTotal - expenseTotal;

    // ==================== LOADING ====================

    if (loading) {
        return (
            <div className="transactions-loading">
                Loading transactions...
            </div>
        );
    }

    // ==================== UI ====================

    return (
        <div className="transaction-list-container">

            {/* HEADER */}
            <div className="transaction-header">
                <div>
                    <h2>Transactions</h2>
                    <p>
                        View and manage your income and expenses
                    </p>
                </div>

                <button
                    className="btn-new-transaction"
                    onClick={() => {
                        setTransactionToEdit(null);
                        setShowForm(true);
                    }}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>New transaction</span>
                </button>
            </div>

            {/* FILTERS */}
            <div className="filters-section">
                <div className="filters">

                    <select
                        value={filter.month}
                        onChange={handleMonthChange}
                    >
                        <option value="all">All months</option>

                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                            .map(month => (
                                <option
                                    key={month}
                                    value={month}
                                >
                                    Month {month}
                                </option>
                            ))}
                    </select>

                    <select
                        value={filter.year}
                        onChange={handleYearChange}
                        disabled={loadingYears}
                    >
                        <option value="all">All years</option>

                        {availableYears.map(year => (
                            <option
                                key={year}
                                value={year}
                            >
                                {year}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filter.type}
                        onChange={handleTypeChange}
                    >
                        <option value="all">
                            All transactions
                        </option>

                        <option value="Income">
                            Income
                        </option>

                        <option value="Expense">
                            Expense
                        </option>
                    </select>

                </div>
            </div>

            {/* FORM */}
            {showForm && (
                <TransactionForm
                    transactionToEdit={transactionToEdit}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            )}

            {/* EMPTY */}
            {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                    <h3>No transactions yet</h3>

                    <p>
                        Add your first transaction to start tracking
                        your finances.
                    </p>

                    <button
                        className="btn-new-transaction"
                        onClick={() => {
                            setTransactionToEdit(null);
                            setShowForm(true);
                        }}
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span>Add transaction</span>
                    </button>
                </div>
            ) : (
                <>
                    {/* TRANSACTION LIST */}
                    <div className="transaction-list">

                        {filteredTransactions.map(transaction => (
                            <div
                                key={transaction.id}
                                className={`transaction-item ${transaction.type.toLowerCase()}`}
                            >
                                {/* LEFT */}
                                <div className="transaction-info">

                                    <div className="transaction-category">

                                        <strong>
                                            {transaction.categoryName}
                                        </strong>

                                        {transaction.jarName && (
                                            <span
                                                className="transaction-jar"
                                                style={{
                                                    borderColor:
                                                        getJarColor(transaction.jarName),
                                                    color:
                                                        getJarColor(transaction.jarName)
                                                }}
                                            >
                                                {transaction.jarName}
                                            </span>
                                        )}

                                    </div>

                                    <div className="transaction-meta">

                                        <span>
                                            {formatDate(
                                                transaction.transactionDate
                                            )}
                                        </span>

                                        {transaction.note && (
                                            <>
                                                <span className="meta-separator">
                                                    ·
                                                </span>

                                                <span className="transaction-note">
                                                    {transaction.note}
                                                </span>
                                            </>
                                        )}

                                    </div>

                                </div>

                                {/* RIGHT */}
                                <div className="transaction-right">

                                    <div
                                        className={`transaction-value ${transaction.type.toLowerCase()}`}
                                    >
                                        {transaction.type === 'Income'
                                            ? '+'
                                            : '-'}
                                        {formatMoney(transaction.amount)}
                                    </div>

                                    <div className="transaction-actions">

                                        {/* History available for every transaction */}
                                        <button
                                            type="button"
                                            className={`action-btn ${
                                                historyTransactionId === transaction.id
                                                    ? 'active'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                handleViewHistory(transaction.id)
                                            }
                                            title="View edit history"
                                        >
                                            <i className="bi bi-clock-history"></i>
                                        </button>

                                        {/* Only latest transaction can be edited */}
                                        {transaction.id === latestTransactionId && (
                                            <button
                                                type="button"
                                                className="action-btn"
                                                onClick={() =>
                                                    handleEdit(transaction)
                                                }
                                                title="Edit transaction"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        )}

                                    </div>

                                </div>

                                {/* EDIT HISTORY */}
                                {historyTransactionId === transaction.id && (
                                    <div className="edit-history">

                                        <div className="history-header">
                                            <span>Edit history</span>

                                            {!loadingHistory && (
                                                <span className="history-count">
                                                    {editHistory.length}{' '}
                                                    {editHistory.length === 1
                                                        ? 'change'
                                                        : 'changes'}
                                                </span>
                                            )}
                                        </div>

                                        {loadingHistory ? (
                                            <div className="history-empty">
                                                Loading history...
                                            </div>
                                        ) : editHistory.length === 0 ? (
                                            <div className="history-empty">
                                                This transaction has not been edited.
                                            </div>
                                        ) : (
                                            <div className="history-list">

                                                {editHistory.map(history => (
                                                    <div
                                                        key={history.id}
                                                        className="history-item"
                                                    >
                                                        <div className="history-change">

                                                            <span className="history-label">
                                                                Amount
                                                            </span>

                                                            <span className="history-old">
                                                                {formatMoney(
                                                                    history.oldAmount
                                                                )}
                                                            </span>

                                                            <i className="bi bi-arrow-right"></i>

                                                            <span className="history-new">
                                                                {formatMoney(
                                                                    history.newAmount
                                                                )}
                                                            </span>

                                                        </div>

                                                        {history.oldType !==
                                                            history.newType && (
                                                                <div className="history-change">

                                                                <span className="history-label">
                                                                    Type
                                                                </span>

                                                                    <span className="history-old">
                                                                    {history.oldType}
                                                                </span>

                                                                    <i className="bi bi-arrow-right"></i>

                                                                    <span className="history-new">
                                                                    {history.newType}
                                                                </span>

                                                                </div>
                                                            )}

                                                        {history.oldNote !==
                                                            history.newNote && (
                                                                <div className="history-change">

                                                                <span className="history-label">
                                                                    Note
                                                                </span>

                                                                    <span className="history-old">
                                                                    {history.oldNote || 'Empty'}
                                                                </span>

                                                                    <i className="bi bi-arrow-right"></i>

                                                                    <span className="history-new">
                                                                    {history.newNote || 'Empty'}
                                                                </span>

                                                                </div>
                                                            )}

                                                        {history.oldTransactionDate !==
                                                            history.newTransactionDate && (
                                                                <div className="history-change">

                                                                <span className="history-label">
                                                                    Date
                                                                </span>

                                                                    <span className="history-old">
                                                                    {formatDate(
                                                                        history.oldTransactionDate
                                                                    )}
                                                                </span>

                                                                    <i className="bi bi-arrow-right"></i>

                                                                    <span className="history-new">
                                                                    {formatDate(
                                                                        history.newTransactionDate
                                                                    )}
                                                                </span>

                                                                </div>
                                                            )}

                                                        <div className="history-time">
                                                            {new Date(
                                                                history.editedAt
                                                            ).toLocaleString('vi-VN')}
                                                        </div>

                                                    </div>
                                                ))}

                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>
                        ))}

                    </div>

                    {/* SUMMARY */}
                    <div className="transaction-summary">

                        <div className="summary-header">
                            <h3>Summary</h3>

                            <span>
                                {filter.month === 'all'
                                    ? 'All months'
                                    : `Month ${filter.month}`}
                                {' · '}
                                {filter.year === 'all'
                                    ? 'All years'
                                    : filter.year}
                            </span>
                        </div>

                        <div className="summary-grid">

                            <div className="summary-item">
                                <span>Income</span>

                                <strong className="income">
                                    +{formatMoney(incomeTotal)}
                                </strong>
                            </div>

                            <div className="summary-item">
                                <span>Expenses</span>

                                <strong className="expense">
                                    -{formatMoney(expenseTotal)}
                                </strong>
                            </div>

                            <div className="summary-item">
                                <span>Remaining</span>

                                <strong
                                    className={
                                        balance >= 0
                                            ? 'income'
                                            : 'expense'
                                    }
                                >
                                    {formatMoney(balance)}
                                </strong>
                            </div>

                        </div>

                    </div>
                </>
            )}

        </div>
    );
};

export default TransactionList;