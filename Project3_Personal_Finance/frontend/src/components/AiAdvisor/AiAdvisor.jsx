import React, { useState } from 'react';
import api from '../../api/api';
import './AiAdvisor.css';

const AiAdvisor = () => {
    const [advice, setAdvice] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const getAiAdvice = async () => {
        setLoading(true);
        try {
            const res = await api.get('/AiAdvisor/analyze-current-month');
            // Lấy chuỗi tư vấn trả về từ Backend
            let text = res.data.advice || 'Không nhận được dữ liệu phản hồi.';
            setAdvice(text);
        } catch (error) {
            console.error('Lỗi gọi AI Advisor:', error);
            
            // Xử lý đọc thông điệp lỗi dạng object hoặc string từ Backend
            const errorData = error.response?.data;
            let displayMsg = 'Không thể kết nối với AI lúc này. Vui lòng kiểm tra lại kết nối Backend!';

            if (typeof errorData === 'string') {
                displayMsg = errorData;
            } else if (errorData && typeof errorData === 'object') {
                displayMsg = errorData.advice || errorData.message || JSON.stringify(errorData);
            }

            setAdvice(displayMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-advisor-container">
            {isOpen ? (
                <div className="ai-chat-box">
                    <div className="ai-theme-header d-flex justify-content-between align-items-center">
                        <h6 className="m-0">🤖 AI Financial Advisor</h6>
                        <button 
                            className="btn-close btn-close-white" 
                            style={{ fontSize: '12px' }} 
                            onClick={() => setIsOpen(false)}
                        ></button>
                    </div>
                    
                    <div className="ai-body-content p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="text-center my-4" style={{ color: '#7c6ee6' }}>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                 AI is analyzing your income and expenses...
                            </div>
                        ) : advice ? (
                            <div className="ai-message style-advice" style={{ whiteSpace: 'pre-line' }}>
                                {advice}
                            </div>
                        ) : (
                            <div className="text-center text-muted my-3" style={{ fontSize: '14px' }}>
                                 Click the button below to let AI analyze your financial situation for the current month.
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-white rounded-bottom text-center border-top">
                        <button 
                            className="ai-theme-btn btn btn-primary w-100" 
                            onClick={getAiAdvice} 
                            disabled={loading}
                        >
                            <i className="bi bi-magic me-1"></i> {advice ? 'Analyze Again' : 'Analyze Now'}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="ai-floating-btn" 
                    onClick={() => setIsOpen(true)}
                    title="Ask AI Financial Advisor"
                >
                    ✨
                </button>
            )}
        </div>
    );
};

export default AiAdvisor;