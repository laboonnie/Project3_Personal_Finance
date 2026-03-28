import React, { useState } from 'react';
import BudgetList from './BudgetList';
import './Budgets.css';

const Budgets = () => {
    const [refresh, setRefresh] = useState(false);

    const handleSuccess = () => setRefresh(!refresh);

    return (
        <div className="budgets-page">
            <div className="page-container">
                <BudgetList key={refresh} />  {/* ✅ KHÔNG userId */}
            </div>
        </div>
    );
};

export default Budgets;