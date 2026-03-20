import React, { useState } from 'react';
import { budgetApi } from '../../api/budgetApi';

const BudgetForm = ({ jar, userId, month, year, onClose, onSuccess }) => {
    const [budgetAmount, setBudgetAmount] = useState(jar.budgetAmount || '');
    const [loading, setLoading] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [income, setIncome] = useState(10000000);
    const [suggestedAmount, setSuggestedAmount] = useState(null);

    const getSuggestion = async () => {
        try {
            const response = await budgetApi.getSuggestions(userId, income);
            const suggestion = response.data.find(s => s.jarId === jar.jarId);
            if (suggestion) {
                setSuggestedAmount(Math.round(suggestion.suggestedAmount));
                setBudgetAmount(Math.round(suggestion.suggestedAmount));
            }
            setShowSuggestion(false);
        } catch (error) {
            console.error('Error getting suggestion:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!budgetAmount || budgetAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            await budgetApi.create({
                userId,
                jarId: jar.jarId,
                budgetAmount: parseFloat(budgetAmount),
                month,
                year
            });
            alert('Budget saved successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error saving budget:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSuggestion = () => {
        const amount = income * (jar.defaultPercentage / 100);
        setSuggestedAmount(Math.round(amount));
        setBudgetAmount(Math.round(amount));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>
                    {jar.budgetAmount > 0 ? '✏️ Edit Budget' : '➕ Add Budget'} - {jar.jarName}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="month-year-display">
                        Month {month}/{year}
                    </div>

                    <div className="form-group">
                        <label>Budget Amount (VND):</label>
                        <input
                            type="number"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                            placeholder="Enter amount"
                            autoFocus
                        />
                    </div>

                    <div className="suggestion-box">
                        <div className="suggestion-header">
                            <span>💡</span>
                            <span>6-Jar Method Suggestion</span>
                        </div>

                        <div className="suggestion-row">
                            <input
                                type="number"
                                value={income}
                                onChange={(e) => setIncome(parseFloat(e.target.value))}
                                placeholder="Monthly income"
                            />
                            <button
                                type="button"
                                onClick={calculateSuggestion}
                                className="btn-apply"
                            >
                                Apply
                            </button>
                        </div>

                        {suggestedAmount && (
                            <div className="suggestion-note">
                                Suggestion: {jar.defaultPercentage}% of income = {suggestedAmount.toLocaleString()}đ
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-save">
                            {loading ? 'Saving...' : 'Save Budget'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BudgetForm;