// src/pages/Transactions.js
import React, { useState } from 'react';
import TransactionList from './TransactionList';
import './Transactions.css';

const Transactions = () => {
    const [userId] = useState(1);
    const [refresh, setRefresh] = useState(false);

    const handleSuccess = () => setRefresh(!refresh);

    return (
        <div className="transactions-page">
            <header className="page-header">
                <h1>💰 Transactions</h1>
                <p>Manage your income and expenses</p>
            </header>
            <div className="page-container">
                <TransactionList key={refresh} userId={userId} />
            </div>
        </div>
    );
};

export default Transactions;