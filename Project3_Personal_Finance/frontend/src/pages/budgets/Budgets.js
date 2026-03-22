// src/pages/Budgets.js
import React, { useState } from 'react';
import BudgetList from './BudgetList';
import './Budgets.css';

const Budgets = () => {
    const [userId] = useState(1);
    const [refresh, setRefresh] = useState(false);

    const handleSuccess = () => setRefresh(!refresh);

    return (
        < div className = "budgets-page" >
            < div className = "page-container" >
                < BudgetList key ={ refresh}
    userId ={ userId} />
            </ div >
        </ div >
    );
};

export default Budgets;