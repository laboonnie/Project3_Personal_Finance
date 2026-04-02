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
            let cleanText = res.data.advice.replace(/\*\*/g, '');
            setAdvice(cleanText);
        } catch (error) {
            setAdvice('Sorry, AI is having trouble analyzing your data right now. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-advisor-container">
            {isOpen ? (
                <div className="ai-chat-box">
                    <div className="ai-theme-header">
                        <h6>🤖 AI Financial Advisor</h6>
                        <button className="btn-close btn-close-white" style={{ fontSize: '12px' }} onClick={() => setIsOpen(false)}></button>
                    </div>
                    
                    <div className="ai-body-content">
                        {loading ? (
                            <div className="text-center mt-4" style={{ color: '#7c6ee6' }}>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                AI is analyzing your data...
                            </div>
                        ) : advice ? (
                            <div className="ai-message">
                                {advice}
                            </div>
                        ) : (
                            <div className="text-center text-muted mt-3" style={{ fontSize: '14px' }}>
                                Click the button below to have the AI analyze your financial situation for this month.
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-white rounded-bottom text-center border-top">
                        <button 
                            className="ai-theme-btn" 
                            onClick={getAiAdvice} 
                            disabled={loading}
                        >
                            <i className="bi bi-magic"></i> {advice ? 'Analyze Again' : 'Analyze Now'}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="ai-floating-btn" 
                    onClick={() => setIsOpen(true)}
                    title="Ask AI Advisor"
                >
                    ✨
                </button>
            )}
        </div>
    );
};

export default AiAdvisor;