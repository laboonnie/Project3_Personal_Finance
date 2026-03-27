import React, { useState, useEffect } from 'react';
import { transactionApi } from '../../api/transactionApi';
import categoryApi from '../../api/categoryApi';
import './Transactions.css';

const TransactionForm = ({ onSuccess, onCancel }) => {  // ✅ BỎ userId
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        type: 'Expense',
        transactionDate: new Date().toISOString().split('T')[0],
        note: ''
    });

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [error, setError] = useState('');
    const [allCategories, setAllCategories] = useState([]);

    useEffect(() => {
        loadAllCategories();
    }, []);

    useEffect(() => {
        if (formData.type && allCategories.length > 0) {
            const filtered = allCategories.filter(cat => cat.type === formData.type);
            setCategories(filtered);
            setLoadingCategories(false);
        }
    }, [formData.type, allCategories]);

    const loadAllCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await categoryApi.getAll();
            setAllCategories(response.data);
        } catch (error) {
            console.error('Error loading categories:', error);
            setAllCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.categoryId) {
            setError('Please select a category');
            setLoading(false);
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            setError('Amount must be greater than 0');
            setLoading(false);
            return;
        }

        try {
            const dataToSend = {
                categoryId: parseInt(formData.categoryId),
                amount: parseFloat(formData.amount),
                type: formData.type,
                transactionDate: formData.transactionDate,
                note: formData.note || ''
            };

            await transactionApi.create(dataToSend);  // ✅ KHÔNG userId

            if (onSuccess) {
                onSuccess();
            }

            setFormData({
                categoryId: '',
                amount: '',
                type: 'Expense',
                transactionDate: new Date().toISOString().split('T')[0],
                note: ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="transaction-form-container">
            <h3> Add New Transaction</h3>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit} className="transaction-form">
                <div className="form-group">
                    <label>Transaction Type</label>
                    <div className="type-buttons">
                        <button
                            type="button"
                            className={`type-btn ${formData.type === 'Income' ? 'active income' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, type: 'Income', categoryId: '' }))}
                        >
                             Income
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${formData.type === 'Expense' ? 'active expense' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, type: 'Expense', categoryId: '' }))}
                        >
                             Expense
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Category</label>
                    {loadingCategories ? (
                        <div>Loading categories...</div>
                    ) : (
                        <select
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">-- Select category --</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="form-group">
                    <label>Amount (VND)</label>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="Enter amount"
                        min="0"
                        step="1000"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Transaction Date</label>
                    <input
                        type="date"
                        name="transactionDate"
                        value={formData.transactionDate}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Note</label>
                    <input
                        type="text"
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        placeholder="Optional note"
                    />
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? 'Processing...' : ' Save Transaction'}
                    </button>
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="btn-cancel">
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default TransactionForm;