import React, { useState, useEffect } from 'react';
import { budgetApi } from '../../api/budgetApi';
import { transactionApi } from '../../api/transactionApi';
import BudgetForm from './BudgetForm';
import './Budgets.css';

const BudgetList = ({ userId }) => {
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
    const [showDistribute, setShowDistribute] = useState(false);

    useEffect(() => {
        loadAvailableYears();
    }, [userId]);

    useEffect(() => {
        if (year) {
            loadData();
        }
    }, [userId, month, year]);

    const loadAvailableYears = async () => {
        try {
            setLoadingYears(true);
            const response = await budgetApi.getAvailableYears(userId);
            setAvailableYears(response.data.sort((a, b) => b - a));
        } catch (error) {
            console.error('Error loading years:', error);
            const currentYear = new Date().getFullYear();
            setAvailableYears([currentYear + 1, currentYear, currentYear - 1, currentYear - 2]);
        } finally {
            setLoadingYears(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [budgetsRes, incomeRes] = await Promise.all([
                budgetApi.getMonthlyBudgets(userId, month, year),
                transactionApi.getTotalIncome(userId, month, year)
            ]);

            setBudgets(budgetsRes.data);
            setTotalIncome(incomeRes.data.total || 0);

            const totalBudget = budgetsRes.data.reduce((sum, b) => sum + b.budgetAmount, 0);
            const totalSpent = budgetsRes.data.reduce((sum, b) => sum + b.spent, 0);
            setSummary({ totalBudget, totalSpent, totalRemaining: totalBudget - totalSpent });
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const distributeBudget = async () => {
        if (totalIncome <= 0) {
            alert('No income this month!');
            return;
        }

        let successCount = 0;
        for (const jar of budgets) {
            const amount = totalIncome * (jar.defaultPercentage / 100);
            if (amount > 0) {
                try {
                    await budgetApi.create({
                        userId,
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

        alert( "Successfully distributed budget for ${successCount}/6 jars!");
        loadData();
        setShowDistribute(false);
    };

    const handleMonthChange = (e) => setMonth(parseInt(e.target.value));
    const handleYearChange = (e) => setYear(parseInt(e.target.value));
    const handleEditBudget = (jar) => {
        setSelectedJar(jar);
        setShowForm(true);
    };

    const handleDeleteBudget = async (jarId) => {
        if (window.confirm('Are you sure you want to delete this budget?')) {
            try {
                const budget = budgets.find(b => b.jarId === jarId);
                if (budget?.id) {
                    await budgetApi.delete(budget.id);
                    loadData();
                }
            } catch (error) {
                console.error('Error deleting budget:', error);
            }
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
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
                <h3>💰 TOTAL INCOME - Month {month}/{year}</h3>
                <p className="amount">{formatMoney(totalIncome)}</p>
                {totalIncome > 0 && (
                    <button onClick={() => setShowDistribute(true)} className="btn-distribute">
                        ✨ AUTO DISTRIBUTE TO 6 JARS
                    </button>
                )}
            </div>

            {showDistribute && (
                <div className="modal-overlay" onClick={() => setShowDistribute(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>💰 Confirm Budget Distribution</h3>
                        <p>Income: <strong>{formatMoney(totalIncome)}</strong></p>

                        <div className="distribution-list">
                            {budgets.map(jar => {
                                const amount = totalIncome * (jar.defaultPercentage / 100);
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
                                    <button className="btn-edit" onClick={() => handleEditBudget(jar)}>
                                        Edit
                                    </button>
                                    <button className="btn-delete" onClick={() => handleDeleteBudget(jar.jarId)}>
                                        Delete
                                    </button>
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
                    userId={userId}
                    month={month}
                    year={year}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

export default BudgetList;
