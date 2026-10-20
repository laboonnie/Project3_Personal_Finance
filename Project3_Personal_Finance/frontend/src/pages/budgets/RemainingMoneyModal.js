import React, { useState } from 'react';
import { remainingActionApi } from '../../api/remainingActionApi';

const ACTIONS = [
    { value: 'CARRY_OVER', label: 'Carry over to next month' },
    { value: 'JAR', label: 'Add to a jar (next month)' },
    { value: 'KEEP', label: 'Keep as cash (Coming soon)' }
];

const RemainingMoneyModal = ({ month, year, availableAmount, jars = [], onClose, onSuccess }) => {
    const [actionType, setActionType] = useState('CARRY_OVER');
    const [sourceJarId, setSourceJarId] = useState('');
    const [targetJarId, setTargetJarId] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const formatMoney = v => new Intl.NumberFormat('vi-VN').format(v || 0) + 'đ';
    const next = new Date(year, month, 1); // month is 1-based: next month
    const selectedSource = jars.find(j => Number(j.jarId) === Number(sourceJarId));
    const sourceAvailable = selectedSource
        ? Math.max(0, Math.min(Number(selectedSource.remaining || 0), Number(selectedSource.budgetAmount || 0)))
        : 0;
    const maxAmount = actionType === 'JAR'
        ? Math.max(0, Math.min(Number(availableAmount || 0), sourceAvailable))
        : Number(availableAmount || 0);

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > maxAmount) {
            setError('Amount must be positive and cannot exceed the available balance.');
            return;
        }
        if (actionType === 'KEEP') return;
        if (actionType === 'JAR' && (!sourceJarId || !targetJarId || sourceJarId === targetJarId)) {
            setError('Choose two different jars.');
            return;
        }
        if (actionType === 'CARRY_OVER' && !targetJarId) {
            setError('Please select a jar.');
            return;
        }
        try {
            setLoading(true);
            if (actionType === 'JAR') {
                await remainingActionApi.createJarTransfer({
                    month, year, amount: value,
                    sourceJarId: Number(sourceJarId), targetJarId: Number(targetJarId)
                });
            } else {
                await remainingActionApi.createCarryOver({
                    month, year, amount: value, actionType: 'CARRY_OVER',
                    targetJarId: Number(targetJarId)
                });
            }
            if (onSuccess) await onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to transfer money.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content remaining-modal" onClick={e => e.stopPropagation()}>
                <div className="remaining-modal-header">
                    <div><h3>Manage remaining money</h3><p>Month {month}/{year}</p></div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="available-box"><span>Available to manage</span><strong>{formatMoney(availableAmount)}</strong></div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Action</label>
                        <select value={actionType} onChange={e => {
                            setActionType(e.target.value); setSourceJarId(''); setTargetJarId(''); setAmount(''); setError('');
                        }}>
                            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>
                    {actionType === 'JAR' && (
                        <div className="form-group">
                            <label>Source jar (this month)</label>
                            <select value={sourceJarId} onChange={e => { setSourceJarId(e.target.value); setAmount(''); }}>
                                <option value="">Select source jar</option>
                                {jars.map(j => <option key={j.jarId} value={j.jarId}>
                                    {j.jarName} — remaining {formatMoney(j.remaining)}
                                </option>)}
                            </select>
                        </div>
                    )}
                    {(actionType === 'JAR' || actionType === 'CARRY_OVER') && (
                        <div className="form-group">
                            <label>{actionType === 'JAR' ? 'Destination jar (next month)' : 'Jar to carry over'}</label>
                            <select value={targetJarId} onChange={e => setTargetJarId(e.target.value)}>
                                <option value="">Select destination jar</option>
                                {jars.filter(j => actionType !== 'JAR' || String(j.jarId) !== sourceJarId)
                                    .map(j => <option key={j.jarId} value={j.jarId}>{j.jarName}</option>)}
                            </select>
                        </div>
                    )}
                    <p>Destination month: {next.getMonth() + 1}/{next.getFullYear()}</p>
                    <div className="form-group">
                        <div className="amount-label-row"><label>Amount</label>
                            <button type="button" className="use-all-btn" onClick={() => setAmount(String(maxAmount))}>Use all</button>
                        </div>
                        <input type="number" min="1" step="1" max={maxAmount} value={amount}
                               onChange={e => setAmount(e.target.value)} placeholder="Enter amount" required />
                        {amount && Number(amount) > 0 && <small className="amount-preview">{formatMoney(Number(amount))}</small>}
                    </div>
                    {actionType === 'KEEP' && <div className="remaining-error">This action is temporarily unavailable.</div>}
                    {error && <div className="remaining-error">{error}</div>}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn-save" disabled={loading || actionType === 'KEEP'}>
                            {loading ? 'Processing...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RemainingMoneyModal;
