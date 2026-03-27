import React, { useState } from 'react';
import TransactionList from './TransactionList';
import './Transactions.css';

const Transactions = () => {
    const [refresh, setRefresh] = useState(false);

    const handleSuccess = () => setRefresh(!refresh);

    return (
        <div className="transactions-page">
            <div className="page-container">
                <TransactionList key={refresh} />  {/* ✅ KHÔNG userId */}
            </div>
        </div>
    );
};

export default Transactions;