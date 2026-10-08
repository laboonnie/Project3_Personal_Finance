import React, { useState, useEffect, useCallback } from 'react';
import { budgetApi } from '../../api/budgetApi';
import { transactionApi } from '../../api/transactionApi';
import RemainingMoneyModal from './RemainingMoneyModal';
import { remainingActionApi } from '../../api/remainingActionApi';
import BudgetForm from './BudgetForm';
import './Budgets.css';


const BudgetList = () => {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const [loadingYears, setLoadingYears] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedJar, setSelectedJar] = useState(null);
    const [summary, setSummary] = useState({ totalBudget: 0, totalSpent: 0, totalRemaining: 0 });
    const [totalIncome, setTotalIncome] = useState(0);
    const [remainingSummary, setRemainingSummary] = useState({
        totalIncome: 0,
        totalExpense: 0,
        monthlyRemaining: 0,
        carriedIn: 0,
        totalAvailableBeforeProcessing: 0,
        processedAmount: 0,
        availableRemaining: 0,
        hasRemaining: false
    });
    const distributableAmount =
        Number(totalIncome || 0) +
        Number(remainingSummary.carriedIn || 0);
    const [showRemainingModal, setShowRemainingModal] =
        useState(false);

    const [remainingHistory, setRemainingHistory] =
        useState([]);
    const [showDistribute, setShowDistribute] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [showJarHistory, setShowJarHistory] = useState(false);
    const [selectedJarTransactions, setSelectedJarTransactions] = useState([]);
    const [selectedJarName, setSelectedJarName] = useState("");

    const loadAvailableYears = useCallback(async () => {
        try {
            setLoadingYears(true);
            const response = await budgetApi.getAvailableYears();
            setAvailableYears(response.data.sort((a, b) => b - a));
        } catch (error) {
            console.error('Error loading years:', error);
            const currentYear = new Date().getFullYear();
            setAvailableYears([currentYear + 1, currentYear, currentYear - 1]);
        } finally {
            setLoadingYears(false);
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);

        try {
            const [
                budgetsRes,
                incomeRes,
                remainingRes,
                remainingHistoryRes
            ] = await Promise.all([
                budgetApi.getMonthlyBudgets(
                    month,
                    year
                ),

                transactionApi.getTotalIncome(
                    month,
                    year
                ),

                remainingActionApi.getSummary(
                    month,
                    year
                ),

                remainingActionApi.getActions(
                    month,
                    year
                )
            ]);

            const budgetData =
                budgetsRes.data || [];

            setBudgets(budgetData);

            setTotalIncome(
                incomeRes.data.total || 0
            );

            setRemainingSummary(
                remainingRes.data || {
                    totalIncome: 0,
                    totalExpense: 0,
                    monthlyRemaining: 0,
                    processedAmount: 0,
                    availableRemaining: 0,
                    hasRemaining: false
                }
            );

            setRemainingHistory(
                remainingHistoryRes.data || []
            );

            const totalBudget =
                budgetData.reduce(
                    (sum, b) =>
                        sum +
                        (b.budgetAmount || 0),
                    0
                );

            const totalSpent =
                budgetData.reduce(
                    (sum, b) =>
                        sum +
                        (b.spent || 0),
                    0
                );

            setSummary({
                totalBudget,
                totalSpent,
                totalRemaining:
                    totalBudget - totalSpent
            });

        } catch (error) {
            console.error(
                'Error loading budget data:',
                error
            );
        } finally {
            setLoading(false);
        }
    }, [month, year]);    const refreshData = useCallback(() => {
        setRefresh(prev => !prev);
    }, []);

    useEffect(() => {
        loadAvailableYears();
    }, [loadAvailableYears]);

    useEffect(() => {
        if (year) {
            loadData();
        }
    }, [loadData, year, refresh]);

    const distributeBudget = async () => {
        if (distributableAmount <= 0) {
            alert('No income this month!');
            return;
        }

        let successCount = 0;
        for (const jar of budgets) {
            const percentage = jar.defaultPercentage || 0;
            if (percentage > 0) {
                const amount = distributableAmount * (percentage / 100);
                if (amount > 0) {
                    try {
                        await budgetApi.create({
                            jarId: jar.jarId,
                            budgetAmount: Math.round(amount),
                            month,
                            year
                        });
                        successCount++;
                    } catch (error) {
                        console.error('Error saving budget:', error);
                    }
                }
            }
        }

        alert(`✅ Successfully distributed budget for ${successCount}/6 jars!`);
        refreshData();
        setShowDistribute(false);
    };
    const handleMonthChange = (e) => setMonth(parseInt(e.target.value));
    const handleYearChange = (e) => setYear(parseInt(e.target.value));
    const handleEditBudget = (jar) => {
        setSelectedJar(jar);
        setShowForm(true);
    };

    // const handleDeleteBudget = async (jarId) => {
    //     if (window.confirm('Are you sure you want to delete this budget?')) {
    //         try {
    //             const budget = budgets.find(b => b.jarId === jarId);
    //             if (budget?.id) {
    //                 await budgetApi.delete(budget.id);
    //                 loadData();
    //             }
    //         } catch (error) {
    //             console.error('Error deleting budget:', error);
    //         }
    //     }
    // };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    const handleSeeDetails = async (jar) => {

        try {

            const response = await transactionApi.getMonthlyTransactions(month, year);

            const filtered = response.data.filter(t => t.jarId === jar.jarId);

            setSelectedJarTransactions(filtered);

            setSelectedJarName(jar.jarName);

            setShowJarHistory(true);

        } catch (error) {

            console.error("Error loading jar history:", error);

        }

    };

    if (loading) return <div className="loading">Loading data...</div>;

    return (
        <div className="budget-container">
            <h2>6 Jars Budget Management</h2>

            <div className="filter-section">
                <label>Month:</label>
                <select value={month} onChange={handleMonthChange}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Month {m}</option>
                    ))}
                </select>

                <label>Year:</label>
                <select value={year} onChange={handleYearChange} disabled={loadingYears}>
                    {loadingYears ? (
                        <option>Loading...</option>
                    ) : (
                        availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))
                    )}
                </select>
            </div>

            <div className="income-summary">
                <h3>TOTAL INCOME - Month {month}/{year}</h3>

                <p className="amount">
                    {formatMoney(totalIncome)}
                </p>

                {remainingSummary.carriedIn > 0 && (
                    <p>
                        Carried from previous month:
                        <strong>
                            {formatMoney(remainingSummary.carriedIn)}
                        </strong>
                    </p>
                )}

                <p>
                    Total available for budgeting:
                    <strong>
                        {formatMoney(distributableAmount)}
                    </strong>
                </p>

                {distributableAmount > 0 && (
                    <button
                        onClick={() => setShowDistribute(true)}
                        className="btn-distribute"
                    >
                        AUTO DISTRIBUTE TO 6 JARS
                    </button>
                )}
            </div>

            {showDistribute && (
                <div className="modal-overlay" onClick={() => setShowDistribute(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>💰 Confirm Budget Distribution</h3>
                        <p>
                            New income: <strong>{formatMoney(totalIncome)}</strong>
                        </p>

                        <p>
                            Carried from previous month:
                            <strong>
                                {formatMoney(remainingSummary.carriedIn)}
                            </strong>
                        </p>

                        <p>
                            Total to distribute:
                            <strong>{formatMoney(distributableAmount)}</strong>
                        </p>

                        <div className="distribution-list">
                            {budgets.map(jar => {
                                const amount = distributableAmount * (jar.defaultPercentage / 100);
                                return (
                                    <div key={jar.jarId} className="distribution-row">
                                        <span>{jar.jarName} ({jar.defaultPercentage}%)</span>
                                        <strong>{formatMoney(Math.round(amount))}</strong>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="form-actions">
                            <button onClick={() => setShowDistribute(false)} className="btn-cancel">
                                Cancel
                            </button>
                            <button onClick={distributeBudget} className="btn-save">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="summary-cards">
                <div className="summary-card">
                    <h4>Total Budget</h4>
                    <p className="amount">{formatMoney(summary.totalBudget)}</p>
                </div>
                <div className="summary-card total-spent">
                    <h4>Spent</h4>
                    <p className="amount">{formatMoney(summary.totalSpent)}</p>
                </div>
                <div className="summary-card total-remaining">
                    <h4>Remaining</h4>
                    <p className="amount">{formatMoney(summary.totalRemaining)}</p>
                </div>
            </div>

            <div className="remaining-section">

                <div className="remaining-section-header">
                    <div>
                        <h3>Monthly balance</h3>

                        <p>
                            Actual income and expenses
                            for {month}/{year}
                        </p>
                    </div>

                    {remainingSummary.availableRemaining > 0 && (
                        <button
                            type="button"
                            className="btn-manage-remaining"
                            onClick={() =>
                                setShowRemainingModal(true)
                            }
                        >
                            Manage remaining
                        </button>
                    )}
                </div>

                <div className="remaining-overview">
                    {remainingSummary.carriedIn > 0 && (
                        <div className="remaining-stat carried-in">
                            <span>Carried from previous month</span>
                            <strong>
                                {formatMoney(remainingSummary.carriedIn)}
                            </strong>
                        </div>
                    )}

                    <div className="remaining-stat">
                        <span>Income</span>

                        <strong>
                            {formatMoney(
                                remainingSummary.totalIncome
                            )}
                        </strong>
                    </div>

                    <div className="remaining-stat">
                        <span>Expenses</span>

                        <strong>
                            {formatMoney(
                                remainingSummary.totalExpense
                            )}
                        </strong>
                    </div>

                    <div className="remaining-stat">
                        <span>Monthly balance</span>

                        <strong
                            className={
                                remainingSummary
                                    .monthlyRemaining >= 0
                                    ? 'positive'
                                    : 'negative'
                            }
                        >
                            {formatMoney(
                                remainingSummary
                                    .monthlyRemaining
                            )}
                        </strong>
                    </div>

                    <div className="remaining-stat">
                        <span>Already managed</span>

                        <strong>
                            {formatMoney(
                                remainingSummary
                                    .processedAmount
                            )}
                        </strong>
                    </div>

                    <div className="remaining-stat highlight">
                        <span>Available to manage</span>

                        <strong>
                            {formatMoney(
                                remainingSummary
                                    .availableRemaining
                            )}
                        </strong>
                    </div>

                </div>

                {remainingHistory.length > 0 && (
                    <div className="remaining-history">

                        <div className="remaining-history-title">
                            Allocation history
                        </div>

                        {remainingHistory.map(item => (
                            <div
                                className="remaining-history-row"
                                key={item.id}
                            >
                                <div>
                                    <strong>
                                        {
                                            item.actionType
                                                .replaceAll(
                                                    '_',
                                                    ' '
                                                )
                                        }
                                    </strong>

                                    <span>
                            {new Date(
                                item.createdAt
                            ).toLocaleString(
                                'vi-VN'
                            )}
                        </span>
                                </div>

                                <strong>
                                    {formatMoney(
                                        item.amount
                                    )}
                                </strong>
                            </div>
                        ))}

                    </div>
                )}

            </div>
            <div className="jars-grid">
                {budgets.map((jar) => (
                    <div key={jar.jarId} className={`jar-card ${jar.isOverBudget ? 'over-budget' : ''}`}>
                        <div className="jar-header">
                            <h3>{jar.jarName}</h3>
                            <span className="jar-code">{jar.jarCode}</span>
                        </div>

                        <div className="jar-details">
                            <div className="amount-row">
                                <span>Budget:</span>
                                <strong>{formatMoney(jar.budgetAmount)}</strong>
                            </div>
                            <div className="amount-row">
                                <span>Spent:</span>
                                <strong>{formatMoney(jar.spent)}</strong>
                            </div>
                            <div className="amount-row">
                                <span>Remaining:</span>
                                <strong className={jar.remaining < 0 ? 'negative' : ''}>
                                    {formatMoney(jar.remaining)}
                                </strong>
                            </div>
                        </div>

                        <div className="progress-container">
                            <div className="progress-bar">
                                <div
                                    className={`progress-fill ${jar.progress > 100 ? 'danger' : ''}`}
                                    style={{ width: `${Math.min(jar.progress, 100)}%` }}
                                />
                            </div>
                            <span className="progress-text">{jar.progress}%</span>
                        </div>

                        <div className="jar-status">
                            <span className={`status-badge ${jar.isOverBudget ? 'danger' : 'success'}`}>
                                {jar.status}
                            </span>
                        </div>

                        <div className="jar-actions">
                            {jar.budgetAmount > 0 ? (
                                <>
                                    <button className="btn-edit" onClick={() => handleSeeDetails(jar)}>
                                        See details...
                                    </button>
                                    {/* <button className="btn-delete" onClick={() => handleDeleteBudget(jar.jarId)}>
                                        Delete
                                    </button> */}
                                </>
                            ) : (
                                <button className="btn-add" onClick={() => handleEditBudget(jar)}>
                                    + Add Budget
                                </button>
                            )}
                        </div>

                        {jar.budgetAmount === 0 && (
                            <div className="suggestion">
                                Suggestion: {jar.defaultPercentage}% of income
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showForm && (
                <BudgetForm
                    jar={selectedJar}
                    month={month}
                    year={year}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        loadData();
                    }}
                />
            )}
            {
                showJarHistory && (

                    <div className="modal-overlay" onClick={() => setShowJarHistory(false)}>

                        <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <h3>📜 Transaction History - {selectedJarName}</h3>

                            {
                                selectedJarTransactions.length === 0 ? (

                                    <p>No transactions found</p>

                                ) : (

                                    selectedJarTransactions.map(t => (

                                        <div
                                            key={t.id}
                                            className="history-row"
                                        >

                                            <span>
                                                {new Date(t.transactionDate)
                                                    .toLocaleDateString("vi-VN")}
                                            </span>

                                            <span>
                                                {t.categoryName}
                                            </span>

                                            <strong>

                                                {t.type === "Income" ? "+" : "-"}

                                                {new Intl.NumberFormat("vi-VN")
                                                    .format(t.amount)}đ

                                            </strong>

                                        </div>

                                    ))

                                )
                            }

                            <div className="form-actions">

                                <button
                                    className="btn-cancel"
                                    onClick={() => setShowJarHistory(false)}
                                >
                                    Close
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }
            {showRemainingModal && (
                <RemainingMoneyModal
                    month={month}
                    year={year}

                    availableAmount={
                        remainingSummary
                            .availableRemaining
                    }

                    jars={budgets}

                    goals={[]}
                    debts={[]}
                    investments={[]}

                    onClose={() =>
                        setShowRemainingModal(false)
                    }

                    onSuccess={() => {
                        setShowRemainingModal(false);
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

export default BudgetList;
