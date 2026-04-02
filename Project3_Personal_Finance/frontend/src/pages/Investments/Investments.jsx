import React, { useState } from 'react';
import InvestmentList from './InvestmentList';
import './Investments.css';

const Investments = () => {
    const [refresh, setRefresh] = useState(false);

    return (
        <div className="investments-page">
            <div className="page-container">
                <InvestmentList key={refresh} />
            </div>
        </div>
    );
};

export default Investments;