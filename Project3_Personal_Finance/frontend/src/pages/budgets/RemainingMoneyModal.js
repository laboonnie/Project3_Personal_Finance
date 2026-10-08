import React, { useEffect, useState } from 'react';
import { remainingActionApi } from '../../api/remainingActionApi';

const ACTIONS = [
    {
        value: 'CARRY_OVER',
        label: 'Carry over to next month'
    },
    {
        value: 'JAR',
        label: 'Add to a jar'
    },
    {
        value: 'GOAL',
        label: 'Add to a goal'
    },
    {
        value: 'DEBT',
        label: 'Pay debt'
    },
    {
        value: 'INVESTMENT',
        label: 'Add to investment'
    },
    {
        value: 'KEEP',
        label: 'Keep as cash'
    }
];

const RemainingMoneyModal = ({
                                 month,
                                 year,
                                 availableAmount,
                                 jars = [],
                                 goals = [],
                                 debts = [],
                                 investments = [],
                                 onClose,
                                 onSuccess
                             }) => {
    const [actionType, setActionType] =
        useState('CARRY_OVER');

    const [amount, setAmount] =
        useState('');

    const [targetJarId, setTargetJarId] =
        useState('');

    const [goalId, setGoalId] =
        useState('');

    const [debtId, setDebtId] =
        useState('');

    const [investmentId, setInvestmentId] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState('');

    useEffect(() => {
        setError('');
        setTargetJarId('');
        setGoalId('');
        setDebtId('');
        setInvestmentId('');
    }, [actionType]);

    const formatMoney = (value) => {
        return new Intl.NumberFormat('vi-VN')
            .format(value || 0) + 'đ';
    };

    const handleUseAll = () => {
        setAmount(availableAmount);
    };

    const validate = () => {
        const numericAmount =
            Number(amount);

        if (!numericAmount ||
            numericAmount <= 0) {
            return 'Please enter a valid amount.';
        }

        if (numericAmount >
            availableAmount) {
            return 'Amount cannot exceed the available balance.';
        }

        if (actionType === 'JAR' &&
            !targetJarId) {
            return 'Please select a jar.';
        }

        if (actionType === 'GOAL' &&
            !goalId) {
            return 'Please select a goal.';
        }

        if (actionType === 'DEBT' &&
            !debtId) {
            return 'Please select a debt.';
        }

        if (actionType === 'INVESTMENT' &&
            !investmentId) {
            return 'Please select an investment.';
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');

        const validationError =
            validate();

        if (validationError) {
            setError(validationError);
            return;
        }

        const payload = {
            month,
            year,
            amount: Number(amount),
            actionType,

            targetJarId:
                actionType === 'JAR'
                    ? Number(targetJarId)
                    : null,

            goalId:
                actionType === 'GOAL'
                    ? Number(goalId)
                    : null,

            debtId:
                actionType === 'DEBT'
                    ? Number(debtId)
                    : null,

            investmentId:
                actionType === 'INVESTMENT'
                    ? Number(investmentId)
                    : null
        };

        try {
            setLoading(true);

            await remainingActionApi.create(
                payload
            );

            onSuccess();
        } catch (err) {
            console.error(
                'Error managing remaining money:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Unable to manage remaining money.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
        >
            <div
                className="modal-content remaining-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                <div className="remaining-modal-header">
                    <div>
                        <h3>
                            Manage remaining money
                        </h3>

                        <p>
                            Month {month}/{year}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="available-box">
                    <span>
                        Available to manage
                    </span>

                    <strong>
                        {formatMoney(
                            availableAmount
                        )}
                    </strong>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label>
                            Action
                        </label>

                        <select
                            value={actionType}
                            onChange={(e) =>
                                setActionType(
                                    e.target.value
                                )
                            }
                        >
                            {ACTIONS.map(action => (
                                <option
                                    key={action.value}
                                    value={action.value}
                                >
                                    {action.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {actionType === 'JAR' && (
                        <div className="form-group">
                            <label>
                                Jar
                            </label>

                            <select
                                value={targetJarId}
                                onChange={(e) =>
                                    setTargetJarId(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select a jar
                                </option>

                                {jars.map(jar => (
                                    <option
                                        key={jar.jarId}
                                        value={jar.jarId}
                                    >
                                        {jar.jarName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {actionType === 'GOAL' && (
                        <div className="form-group">
                            <label>
                                Goal
                            </label>

                            <select
                                value={goalId}
                                onChange={(e) =>
                                    setGoalId(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select a goal
                                </option>

                                {goals.map(goal => (
                                    <option
                                        key={goal.id}
                                        value={goal.id}
                                    >
                                        {goal.goalName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {actionType === 'DEBT' && (
                        <div className="form-group">
                            <label>
                                Debt
                            </label>

                            <select
                                value={debtId}
                                onChange={(e) =>
                                    setDebtId(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select a debt
                                </option>

                                {debts.map(debt => (
                                    <option
                                        key={debt.id}
                                        value={debt.id}
                                    >
                                        {debt.debtName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {actionType ===
                        'INVESTMENT' && (
                            <div className="form-group">
                                <label>
                                    Investment
                                </label>

                                <select
                                    value={investmentId}
                                    onChange={(e) =>
                                        setInvestmentId(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        Select an investment
                                    </option>

                                    {investments.map(
                                        investment => (
                                            <option
                                                key={
                                                    investment.id
                                                }
                                                value={
                                                    investment.id
                                                }
                                            >
                                                {
                                                    investment.assetName
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        )}

                    <div className="form-group">
                        <div className="amount-label-row">
                            <label>
                                Amount
                            </label>

                            <button
                                type="button"
                                className="use-all-btn"
                                onClick={
                                    handleUseAll
                                }
                            >
                                Use all
                            </button>
                        </div>

                        <input
                            type="number"
                            min="1"
                            max={availableAmount}
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            required
                        />
                        {amount &&
                            Number(amount) > 0 && (
                                <small className="amount-preview">
                                    {
                                        formatMoney(
                                            Number(amount)
                                        )
                                    }
                                </small>
                            )}
                    </div>

                    {error && (
                        <div className="remaining-error">
                            {error}
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn-save"
                            disabled={loading}
                        >
                            {loading
                                ? 'Processing...'
                                : 'Confirm'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default RemainingMoneyModal;