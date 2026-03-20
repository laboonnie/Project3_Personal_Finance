import React, { useState } from 'react';
import TransactionForm from '../transactions/TransactionForm';
import TransactionList from '../transactions/TransactionList';
import BudgetList from '../budgets/BudgetList';

const DashboardLinh = () => {  
const [userId] = useState(1);
const [refresh, setRefresh] = useState(false);
const [activeTab, setActiveTab] = useState('transactions');

const handleSuccess = () => setRefresh(!refresh);

return (

    < div className = "dashboard" >

        < header className = "dashboard-header" >

            < h1 > Personal Finance Dashboard - Linh </ h1 >  {}
                < p > Smart expense management with 6 - Jar Method </ p >
            </ header >
            < div className = "tab-navigation" >
                < button
                    className ={`tab - btn ${ activeTab === 'transactions' ? 'active' : ''}`}
onClick ={ () => setActiveTab('transactions')}
                > Transactions </ button >
                < button
                    className ={`tab - btn ${ activeTab === 'budgets' ? 'active' : ''}`}
onClick ={ () => setActiveTab('budgets')}
                > 6 Jars Budget</ button >
            </ div >
            < div className = "dashboard-container" >
                {
    activeTab === 'transactions' ? (
                    <>
                        < TransactionForm userId ={ userId}
    onSuccess ={ handleSuccess} />
                        < TransactionList key ={ refresh}
    userId ={ userId} />
                    </>
                ) : (
                    < BudgetList key ={ refresh}
userId ={ userId} />
                )}
            </ div >
        </ div >
    );
};

export default DashboardLinh; 