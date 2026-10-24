import React, { useCallback, useEffect, useState } from 'react';
import { budgetApi } from '../../api/budgetApi';
import { transactionApi } from '../../api/transactionApi';
import { remainingActionApi } from '../../api/remainingActionApi';
import RemainingMoneyModal from './RemainingMoneyModal';
import './Budgets.css';

const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';

export default function BudgetList() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [totalIncome, setTotalIncome] = useState(0);
    const [remainingSummary, setRemainingSummary] = useState({});
    const [remainingHistory, setRemainingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [distributionMode, setDistributionMode] = useState('manual');
    const [amounts, setAmounts] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showRemainingModal, setShowRemainingModal] = useState(false);
    const [showJarHistory, setShowJarHistory] = useState(false);
    const [selectedJarName, setSelectedJarName] = useState('');
    const [selectedJarTransactions, setSelectedJarTransactions] = useState([]);

    const refreshData = () => setRefresh(v => v + 1);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [b, i, r, h] = await Promise.all([
                budgetApi.getMonthlyBudgets(month, year),
                transactionApi.getTotalIncome(month, year),
                remainingActionApi.getSummary(month, year),
                remainingActionApi.getActions(month, year)
            ]);
            setBudgets(b.data || []);
            setTotalIncome(Number(i.data?.total || 0));
            setRemainingSummary(r.data || {});
            setRemainingHistory(h.data || []);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Unable to load budget data.');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => { loadData(); }, [loadData, refresh]);
    useEffect(() => {
        budgetApi.getAvailableYears().then(r => setAvailableYears(r.data || []))
            .catch(() => setAvailableYears([new Date().getFullYear()]));
    }, []);

    const openAuto = () => {
        if (budgets.length === 0) {
            alert('No jars found.');
            return;
        }

        const autoAmounts = {};
        let allocated = 0;

        budgets.forEach((jar, index) => {
            const percentage = Number(jar.defaultPercentage || 0);

            let amount = Math.round(
                totalIncome * percentage / 100
            );

            if (index === budgets.length - 1) {
                const totalPercentage = budgets.reduce(
                    (sum, j) => sum + Number(j.defaultPercentage || 0),
                    0
                );

                if (Math.abs(totalPercentage - 100) < 0.0001) {
                    amount = totalIncome - allocated;
                }
            }

            autoAmounts[jar.jarId] = String(amount);
            allocated += amount;
        });

        setAmounts(autoAmounts);
        setDistributionMode('auto');
        setError('');
        setShowManual(true);
    };

    const openManual = () => {
        setAmounts(
            Object.fromEntries(
                budgets.map(jar => [
                    jar.jarId,
                    String(jar.budgetAmount ?? 0)
                ])
            )
        );

        setDistributionMode('manual');
        setError('');
        setShowManual(true);
    };

    const totalAllocated = budgets.reduce((s, j) => s + (Number(amounts[j.jarId]) || 0), 0);

    const invalidAmounts = budgets.some(jar => {
        const value = amounts[jar.jarId];
        if (value === '' || value === null || value === undefined) {
            return false;
        }
        const number = Number(value);
        return !Number.isFinite(number) || number < 0;
    });

    const saveManual = async (e) => {
        e.preventDefault();
        setError('');
        if (invalidAmounts || totalAllocated > totalIncome) {
            setError('All amounts must be non-negative and the total cannot exceed monthly income.');
            return;
        }
        setSaving(true);
        try {
            await budgetApi.manualDistribute({
                month,
                year,
                allocations: budgets.map(jar => ({
                    jarId: jar.jarId,
                    amount: Number(amounts[jar.jarId] || 0)
                }))
            });

            setShowManual(false);
            refreshData();
        } catch (e) {
            setError(e.response?.data?.message || 'Unable to save manual distribution.');
        } finally {
            setSaving(false);
        }
    };

    const handleSeeDetails = async (jar) => {
        try {
            const res = await transactionApi.getMonthlyTransactions(month, year);
            const rows = Array.isArray(res.data) ? res.data : (res.data?.items || []);
            setSelectedJarTransactions(rows.filter(t => Number(t.jarId) === Number(jar.jarId)));
            setSelectedJarName(jar.jarName);
            setShowJarHistory(true);
        } catch (e) {
            alert(e.response?.data?.message || 'Unable to load transactions.');
        }
    };

    if (loading) return <div className="budgets-page"><div className="loading">Loading data...</div></div>;

    return (
        <div className="budgets-page">
            <div className="budget-container">
                <div className="budget-page-header">
                    <div>
                        <h2>6 Jars Budget Management</h2>
                        <p className="budget-page-subtitle">Track, allocate, and control your monthly financial system</p>
                    </div>
                    <div className="filter-section">
                        <div className="filter-group">
                            <label>Month:</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                                    <option key={m} value={m}>Month {m}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Year:</label>
                            <select value={year} onChange={e => setYear(Number(e.target.value))}>
                                {[...new Set([...availableYears, year])].sort((a, b) => b - a).map(y =>
                                    <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="income-summary">
                    <h3>TOTAL INCOME · MONTH {month}/{year}</h3>
                    <div className="amount">{formatMoney(totalIncome)}</div>
                    
                    <div className="income-details-grid">
                        <div className="income-detail-item">
                            Carried from previous month
                            <strong>{formatMoney(remainingSummary.carriedIn)}</strong>
                        </div>
                        <div className="income-detail-item">
                            Income available for budgeting
                            <strong>{formatMoney(totalIncome)}</strong>
                        </div>
                    </div>

                    <div className="distribution-actions">
                        <button type="button" className="btn-distribute" onClick={openAuto}>
                            ⚡ AUTO DISTRIBUTE
                        </button>
                        <button type="button" className="btn-distribute" onClick={openManual}>
                            ✏️ MANUAL DISTRIBUTE
                        </button>
                    </div>
                </div>

                <div className="remaining-section">
                    <div className="remaining-section-header">
                        <div>
                            <h3>Monthly balance</h3>
                            <p>Actual income and expenses summary for {month}/{year}</p>
                        </div>
                        {Number(remainingSummary.availableRemaining || 0) > 0 &&
                            <button type="button" className="btn-manage-remaining" onClick={() => setShowRemainingModal(true)}>
                                Manage remaining
                            </button>}
                    </div>

                    <div className="remaining-overview">
                        {[
                            ['Income', remainingSummary.totalIncome],
                            ['Expenses', remainingSummary.totalExpense],
                            ['Carried from prev month', remainingSummary.carriedIn],
                            ['Monthly balance', remainingSummary.monthlyRemaining],
                            ['Already managed', remainingSummary.processedAmount],
                            ['Available to manage', remainingSummary.availableRemaining]
                        ].map(([label, value]) =>
                            <div className="remaining-stat" key={label}>
                                <span>{label}</span>
                                <strong>{formatMoney(value)}</strong>
                            </div>)}
                    </div>

                    {remainingHistory.length > 0 &&
                        <div className="remaining-history">
                            <div className="remaining-history-title">Allocation History</div>
                            {remainingHistory.map((item, index) =>
                                <div className="remaining-history-row" key={item.id ?? index}>
                                    <div>
                                        <strong>{(item.actionType || 'CARRY_OVER').replaceAll('_', ' ')}</strong>
                                        {(item.sourceJarName || item.targetJarName) &&
                                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                {item.sourceJarName || ''} → {item.targetJarName || ''}
                                            </p>}
                                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}</span>
                                    </div>
                                    <strong style={{ fontSize: '15px' }}>{formatMoney(item.amount)}</strong>
                                </div>)}
                        </div>}
                </div>

                <div className="jars-grid">
                    {budgets.map(jar =>
                        <div className={`jar-card ${jar.isOverBudget ? 'over-budget' : ''}`} key={jar.jarId}>
                            <div className="jar-header">
                                <h3>{jar.jarName}</h3>
                                <span className="jar-code">{jar.jarCode}</span>
                            </div>

                            <div className="jar-details">
                                <div className="amount-row"><span>Budget:</span><strong>{formatMoney(jar.budgetAmount)}</strong></div>
                                <div className="amount-row"><span>Carried in:</span><strong>{formatMoney(jar.carriedIn)}</strong></div>
                                <div className="amount-row"><span>Spent:</span><strong>{formatMoney(jar.spent)}</strong></div>
                                <div className="amount-row"><span>Remaining:</span><strong>{formatMoney(jar.remaining)}</strong></div>
                            </div>

                            <div className="progress-container">
                                <div className="progress-header">
                                    <span>Progress</span>
                                    <span>{jar.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className={`progress-fill ${jar.progress > 100 ? 'danger' : ''}`}
                                        style={{ width: `${Math.min(100, Math.max(0, Number(jar.progress) || 0))}%` }} 
                                    />
                                </div>
                            </div>

                            <div className="jar-status">
                                <span className={`status-badge ${jar.isOverBudget ? 'danger' : 'success'}`}>
                                    {jar.status}
                                </span>
                            </div>

                            <div className="jar-actions">
                                <button className="btn-edit" onClick={() => handleSeeDetails(jar)}>
                                    See details
                                </button>
                            </div>
                        </div>)}
                </div>

                {showManual && <div className="modal-overlay" onClick={() => !saving && setShowManual(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>
                            {distributionMode === 'auto'
                                ? 'Auto Budget Distribution'
                                : 'Manual Budget Distribution'}
                        </h3>
                        <p className="modal-subtitle">Month {month}/{year} · Income: <strong>{formatMoney(totalIncome)}</strong></p>
                        <form onSubmit={saveManual}>
                            {budgets.map(jar => <div className="form-group" key={jar.jarId}>
                                <label>{jar.jarName} ({jar.jarCode})</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={amounts[jar.jarId] ?? ''}
                                    onChange={e =>
                                        setAmounts(prev => ({
                                            ...prev,
                                            [jar.jarId]: e.target.value
                                        }))
                                    }
                                />
                                <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                                    Spent: {formatMoney(jar.spent)} · Carried in: {formatMoney(jar.carriedIn)}
                                </small>
                            </div>)}
                            
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', margin: '16px 0', fontSize: '13px' }}>
                                <div><strong>Total allocated:</strong> {formatMoney(totalAllocated)}</div>
                                <div><strong>Unallocated:</strong> {formatMoney(totalIncome - totalAllocated)}</div>
                            </div>

                            {error && <div className="remaining-error">{error}</div>}
                            
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" disabled={saving} onClick={() => setShowManual(false)}>Cancel</button>
                                <button type="submit" className="btn-save" disabled={saving || invalidAmounts || totalAllocated > totalIncome}>
                                    {saving
                                        ? 'Saving...'
                                        : distributionMode === 'auto'
                                            ? 'Confirm Auto Distribution'
                                            : 'Save Manual Distribution'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>}

                {showJarHistory && <div className="modal-overlay" onClick={() => setShowJarHistory(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Transaction History</h3>
                        <p className="modal-subtitle">{selectedJarName}</p>
                        
                        <div style={{ maxHeight: '360px', overflowY: 'auto', marginBottom: '20px' }}>
                            {selectedJarTransactions.length === 0 ? <p style={{ color: '#64748b', fontSize: '14px' }}>No transactions found</p> :
                                selectedJarTransactions.map((t, index) =>
                                    <div className="history-row" key={t.id ?? index}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{t.categoryName}</div>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {new Date(t.transactionDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <strong style={{ color: t.type === 'Income' ? '#10b981' : '#ef4444' }}>
                                            {t.type === 'Income' ? '+' : '-'}{formatMoney(t.amount)}
                                        </strong>
                                    </div>)}
                        </div>

                        <div className="form-actions">
                            <button className="btn-cancel" onClick={() => setShowJarHistory(false)}>Close</button>
                        </div>
                    </div>
                </div>}

                {showRemainingModal && <RemainingMoneyModal
                    month={month} year={year} availableAmount={remainingSummary.availableRemaining || 0}
                    jars={budgets} onClose={() => setShowRemainingModal(false)}
                    onSuccess={() => { setShowRemainingModal(false); refreshData(); }} />}
            </div>
        </div>
    );
}