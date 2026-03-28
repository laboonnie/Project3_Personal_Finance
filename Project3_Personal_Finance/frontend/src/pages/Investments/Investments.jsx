import React, { useState } from 'react';
import InvestmentList from './InvestmentList';
import './Investments.css';

const Investments = () => {
    // Nếu bạn muốn giật cấp refresh từ layout cao hơn thì dùng state này
    // Tuy nhiên logic tải lại đã được gói gọn rất tốt bên trong InvestmentList rồi
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