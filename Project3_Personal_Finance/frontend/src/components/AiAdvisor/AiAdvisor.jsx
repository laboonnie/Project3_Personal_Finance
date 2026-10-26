import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/api';
import './AiAdvisor.css';

const AiAdvisor = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: 'model',
            text: 'Xin chào! Tôi là **FinSmart AI** 🤖 - Chuyên gia tư vấn tài chính cá nhân của bạn.\n\nTôi có thể giúp bạn phân tích thu chi thực tế, quản lý ngân sách 6 chiếc lọ, lên kế hoạch xóa nợ, tính quỹ khẩn cấp và hoạch định tự do tài chính. Bạn muốn giải quyết bài toán tài chính nào hôm nay?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, loading]);

    // Gửi câu hỏi chat 2 chiều
    const handleSendMessage = async (customText = null) => {
        const textToSend = (customText || inputMessage).trim();
        if (!textToSend || loading) return;

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMessages = [
            ...messages,
            { role: 'user', text: textToSend, time: currentTime }
        ];
        setMessages(newMessages);
        setInputMessage('');
        setLoading(true);

        try {
            const history = newMessages.slice(-6).map(m => ({
                role: m.role === 'model' ? 'model' : 'user',
                text: m.text
            }));

            const res = await api.post('/AiAdvisor/chat', {
                message: textToSend,
                history: history
            });

            const replyText = res.data.reply || 'Không có phản hồi từ máy chủ AI.';
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: replyText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn AI:', error);
            const errorMsg = error.response?.data?.reply 
                || error.response?.data?.message 
                || (typeof error.response?.data === 'string' ? error.response.data : null)
                || 'Không thể kết nối đến trợ lý AI. Vui lòng kiểm tra lại cấu hình backend!';

            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: `⚠️ ${errorMsg}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Phân tích nhanh 1 chạm
    const handleQuickAnalyze = async () => {
        if (loading) return;

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [
            ...prev,
            {
                role: 'user',
                text: '📊 Phân tích nhanh toàn cảnh tài chính tháng này giúp tôi!',
                time: currentTime
            }
        ]);

        setLoading(true);

        try {
            const res = await api.get('/AiAdvisor/analyze-current-month');
            const adviceText = res.data.advice || 'Không nhận được phân tích.';
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: adviceText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } catch (error) {
            console.error('Lỗi phân tích nhanh:', error);
            const errorMsg = error.response?.data?.advice 
                || error.response?.data?.message 
                || 'Không thể phân tích tài chính lúc này.';

            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: `⚠️ ${errorMsg}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Hàm render Markdown cơ bản (in đậm, ngắt dòng)
    const renderMessageContent = (text) => {
        if (!text) return '';
        const lines = text.split('\n');
        return lines.map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={lineIdx} className="message-line">
                    {parts.map((part, partIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </div>
            );
        });
    };

    return (
        <div className="ai-advisor-container">
            {isOpen ? (
                <div className="ai-chat-box">
                    {/* Header */}
                    <div className="ai-theme-header">
                        <div className="d-flex align-items-center gap-2">
                            <span className="ai-bot-avatar">🤖</span>
                            <div>
                                <h6 className="m-0 fw-bold">FinSmart AI</h6>
                                <span className="ai-online-status">
                                    <span className="status-dot"></span> Tư vấn tài chính cá nhân
                                </span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            {/* Nút Phân tích 1 chạm trên Header */}
                            <button 
                                className="ai-header-action-btn"
                                onClick={handleQuickAnalyze}
                                disabled={loading}
                                title="Bấm để AI tự động phân tích toàn cảnh thu chi tháng này"
                            >
                                ✨ Phân tích nhanh
                            </button>
                            {/* Nút Làm mới chat */}
                            <button 
                                className="ai-header-btn" 
                                title="Xóa lịch sử chat"
                                onClick={() => setMessages([{
                                    role: 'model',
                                    text: 'Đã làm mới cuộc hội thoại! Bạn muốn tôi tư vấn chủ đề nào tiếp theo? 💡',
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }])}
                            >
                                <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                            {/* Nút Đóng */}
                            <button 
                                className="ai-header-btn" 
                                onClick={() => setIsOpen(false)}
                                title="Đóng"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>

                    {/* Chat Body */}
                    <div className="ai-body-content">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`ai-message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
                            >
                                {msg.role === 'model' && <span className="msg-avatar">🤖</span>}
                                <div className="msg-bubble-container">
                                    <div className={`ai-message ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                                        {renderMessageContent(msg.text)}
                                    </div>
                                    <span className="msg-timestamp">{msg.time}</span>
                                </div>
                                {msg.role === 'user' && <span className="msg-avatar user-icon">👤</span>}
                            </div>
                        ))}

                        {loading && (
                            <div className="ai-message-row bot-row">
                                <span className="msg-avatar">🤖</span>
                                <div className="ai-typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar */}
                    <div className="ai-input-bar">
                        <input 
                            type="text" 
                            className="ai-chat-input" 
                            placeholder="Nhập câu hỏi tài chính của bạn..." 
                            value={inputMessage} 
                            onChange={(e) => setInputMessage(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button 
                            className="ai-send-btn" 
                            onClick={() => handleSendMessage()} 
                            disabled={loading || !inputMessage.trim()}
                            title="Gửi câu hỏi"
                        >
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="ai-floating-btn" 
                    onClick={() => setIsOpen(true)}
                    title="Trò chuyện cùng FinSmart AI"
                >
                    <span className="ai-floating-icon">✨</span>
                    <span className="ai-floating-tooltip">FinSmart AI</span>
                </button>
            )}
        </div>
    );
};

export default AiAdvisor;