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
            
            // Xóa bỏ các ký tự bôi đậm ** của Markdown để văn bản sạch sẽ, dễ đọc hơn
            let cleanText = res.data.advice.replace(/\*\*/g, '');
            setAdvice(cleanText);
            
        } catch (error) {
            setAdvice('Xin lỗi, AI đang bận hoặc có lỗi kết nối. Vui lòng thử lại sau!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-advisor-container">
            {isOpen ? (
                <div className="ai-chat-box shadow-lg">
                    <div className="ai-header d-flex justify-content-between align-items-center bg-primary text-white p-3 rounded-top">
                        <h6 className="mb-0">🤖 Cố vấn Tài chính AI</h6>
                        <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
                    </div>
                    
                    {/* Thêm maxHeight và overflowY: 'auto' để có thanh cuộn nếu AI trả lời dài */}
                    <div className="ai-body p-3" style={{ minHeight: '150px', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                        {loading ? (
                            <div className="text-center text-muted mt-4">
                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                AI đang suy nghĩ...
                            </div>
                        ) : advice ? (
                            <div className="ai-message p-3 rounded border" style={{ 
                                whiteSpace: 'pre-wrap', 
                                wordBreak: 'break-word',
                                fontSize: '15px', 
                                color: '#1e293b', // ÉP MÀU CHỮ THÀNH XÁM ĐEN ĐỂ KHÔNG BỊ TÀNG HÌNH
                                backgroundColor: '#ffffff',
                                lineHeight: '1.6'
                            }}>
                                {advice}
                            </div>
                        ) : (
                            <div className="text-center text-muted mt-3" style={{ fontSize: '14px' }}>
                                Nhấn nút bên dưới để AI phân tích tình hình thu chi tháng này của bạn.
                            </div>
                        )}
                    </div>
                    
                    <div className="ai-footer p-3 bg-light rounded-bottom text-center border-top">
                        <button 
                            className="btn btn-primary w-100" 
                            onClick={getAiAdvice} 
                            disabled={loading}
                        >
                            <i className="bi bi-magic me-2"></i> {advice ? 'Phân tích lại' : 'Phân tích ngay'}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="ai-floating-btn shadow" 
                    onClick={() => setIsOpen(true)}
                    title="Hỏi Cố vấn AI"
                >
                    ✨
                </button>
            )}
        </div>
    );
};

export default AiAdvisor;