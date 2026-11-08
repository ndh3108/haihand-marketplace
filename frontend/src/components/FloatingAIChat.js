import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { trackChatProductClick, getAnonymousId } from '../utils/tracker';

const FloatingAIChat = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'bot',
            text: 'Chào bạn! Mình là Trợ lý AI của sàn HaiHand 🤖. Bạn đang muốn tìm đồ gì, tầm giá bao nhiêu hoặc ở khu vực nào? Nhắn mình tìm giúp bạn nhé!',
            products: []
        }
    ]);
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, loading]);

    const handleSend = async (messageText) => {
        const textToSend = messageText || input;
        if ((!textToSend.trim() && !selectedImage) || loading) return;

        const imageToSend = selectedImage;
        const messageToSend = textToSend.trim() || 'Tìm sản phẩm tương tự hình ảnh này';
        const userMsg = { sender: 'user', text: messageToSend, image: imageToSend, products: [] };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSelectedImage(null);
        setLoading(true);

        try {
            // Lấy 6 tin nhắn gần nhất để làm ngữ cảnh hội thoại
            const historyToSend = messages
                .filter(m => m.text)
                .slice(-6)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text
                }));

            const userStored = (() => {
                try {
                    const u = localStorage.getItem('user');
                    return u ? JSON.parse(u) : null;
                } catch { return null; }
            })();

            const res = await axios.post(`${API_URL}/api/chatbot/ask`, {
                message: messageToSend,
                history: historyToSend,
                image: imageToSend,
                userId: userStored?._id || null,
                anonymousId: getAnonymousId()
            });

            const botReply = res.data.reply || 'Xin lỗi, mình chưa tìm thấy thông tin phù hợp.';
            const botProducts = res.data.products || [];

            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: botReply, products: botProducts }
            ]);
        } catch (error) {
            console.error("Lỗi AI Chatbot:", error);
            setMessages(prev => [
                ...prev,
                {
                    sender: 'bot',
                    text: '⚠️ Không thể kết nối tới mô hình AI. Hãy đảm bảo bạn đã khởi động LM Studio (port 1235) trên máy nhé!',
                    products: []
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.alert('Vui lòng chọn một tệp hình ảnh.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            window.alert('Hình ảnh phải nhỏ hơn 5 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setSelectedImage(reader.result);
        reader.readAsDataURL(file);
    };

    // Helper format chữ: biến **chữ đậm** thành <strong>
    const renderFormattedText = (content) => {
        if (!content) return null;
        const lines = content.split('\n');
        return lines.map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={lineIdx} style={{ minHeight: line.trim() ? 'auto' : '8px' }}>
                    {parts.map((part, pIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx} className="fw-bold">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={pIdx}>{part}</span>;
                    })}
                </div>
            );
        });
    };

    return (
        <div style={{ zIndex: 99999 }}>
            {/* CỬA SỔ CHATBOX */}
            {isOpen && (
                <div 
                    className="shadow-2xl d-flex flex-column"
                    style={{
                        position: 'fixed',
                        bottom: '105px',
                        right: '30px',
                        width: '390px',
                        maxWidth: 'calc(100vw - 40px)',
                        height: '560px',
                        maxHeight: 'calc(100vh - 130px)',
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        zIndex: 99999,
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)'
                    }}
                >
                    {/* 1. Header (Cố định) */}
                    <div 
                        className="d-flex align-items-center justify-content-between px-3 py-3 text-white flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)'
                        }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <div 
                                className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                style={{ width: '38px', height: '38px', fontSize: '20px' }}
                            >
                                🤖
                            </div>
                            <div>
                                <h6 className="m-0 fw-bold" style={{ fontSize: '15px' }}>Trợ lý AI HaiHand</h6>
                                <div className="d-flex align-items-center gap-1" style={{ fontSize: '11px', opacity: 0.9 }}>
                                    <span className="bg-success rounded-circle" style={{ width: '7px', height: '7px' }}></span>
                                    <span>Qwen3-VL + RAG</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="btn btn-sm text-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.2)', border: 'none' }}
                            title="Đóng chat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 2. Vùng tin nhắn (Tự co giãn & cuộn mượt) */}
                    <div 
                        className="flex-grow-1 p-3"
                        style={{ 
                            backgroundColor: '#f8fafc', 
                            fontSize: '14px',
                            overflowY: 'auto',
                            minHeight: 0
                        }}
                    >
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                            >
                                {msg.sender === 'bot' && (
                                    <div 
                                        className="rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0 shadow-sm"
                                        style={{ width: '28px', height: '28px', backgroundColor: '#e0e7ff', fontSize: '14px' }}
                                    >
                                        🤖
                                    </div>
                                )}
                                <div style={{ maxWidth: '85%' }}>
                                    {msg.image && (
                                        <img
                                            src={msg.image}
                                            alt="Hình ảnh tìm kiếm"
                                            className="rounded-3 mb-2 shadow-sm"
                                            style={{ width: '160px', maxHeight: '140px', objectFit: 'cover' }}
                                        />
                                    )}
                                    <div 
                                        className="p-3 shadow-sm"
                                        style={{
                                            borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            backgroundColor: msg.sender === 'user' ? '#6366f1' : '#ffffff',
                                            color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                                            lineHeight: '1.5'
                                        }}
                                    >
                                        {renderFormattedText(msg.text)}
                                    </div>

                                    {/* Danh sách thẻ sản phẩm kèm theo */}
                                    {msg.products && msg.products.length > 0 && (
                                        <div className="mt-2 d-flex flex-column gap-2">
                                            {msg.products.map((prod, pIdx) => (
                                                <div 
                                                    key={pIdx}
                                                    onClick={() => {
                                                        trackChatProductClick(prod);
                                                        if (prod._id) navigate(`/post/${prod._id}`);
                                                    }}
                                                    className="bg-white border rounded-3 p-2 d-flex align-items-center gap-2 shadow-sm transition"
                                                    style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    {prod.image ? (
                                                        <img 
                                                            src={prod.image} 
                                                            alt={prod.name} 
                                                            className="rounded-2 object-fit-cover flex-shrink-0"
                                                            style={{ width: '52px', height: '52px' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/52'; }}
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="rounded-2 bg-light d-flex align-items-center justify-content-center flex-shrink-0"
                                                            style={{ width: '52px', height: '52px', fontSize: '20px' }}
                                                        >
                                                            🛍️
                                                        </div>
                                                    )}
                                                    <div className="flex-grow-1 overflow-hidden">
                                                        <div className="fw-bold text-truncate" style={{ fontSize: '13px', color: '#1e293b' }}>
                                                            {prod.name}
                                                        </div>
                                                        <div className="text-danger fw-bold" style={{ fontSize: '12px' }}>
                                                            {prod.price ? Number(prod.price).toLocaleString('vi-VN') + ' đ' : 'Liên hệ'}
                                                        </div>
                                                        <div className="text-muted text-truncate" style={{ fontSize: '11px' }}>
                                                            📍 {prod.location || 'Toàn quốc'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <div className="d-flex align-items-center gap-2 text-muted mb-2 ps-2" style={{ fontSize: '12px' }}>
                                <span>🤖 AI đang tra cứu kho hàng...</span>
                                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* 3. Gợi ý câu hỏi nhanh (Quick chips - Cố định rõ ràng) */}
                    <div 
                        className="px-3 py-2 bg-white border-top d-flex gap-2 flex-shrink-0"
                        style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}
                    >
                        <button 
                            onClick={() => handleSend("Liệt kê các loại xe có tại cửa hàng")}
                            className="btn btn-sm btn-outline-primary rounded-pill py-1 px-2 border"
                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                        >
                            🚗 Các loại xe
                        </button>
                        <button 
                            onClick={() => handleSend("Kiếm cho tôi xe đạp dưới 3tr")}
                            className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2 border"
                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                        >
                            🚲 Xe đạp &lt; 3tr
                        </button>
                        <button 
                            onClick={() => handleSend("Có mô hình lắp ráp nào không?")}
                            className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2 border"
                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                        >
                            🧩 Mô hình lắp ráp
                        </button>
                    </div>

                    {/* 4. Vùng nhập liệu (Cố định) */}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
                        className="p-2 bg-white border-top d-flex gap-2 align-items-center flex-shrink-0"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="btn rounded-circle bg-light d-flex justify-content-center align-items-center flex-shrink-0"
                            style={{ width: '38px', height: '38px', border: 'none' }}
                            title="Tìm sản phẩm bằng hình ảnh"
                        >
                            📷
                        </button>
                        {selectedImage && (
                            <div className="position-relative flex-shrink-0">
                                <img
                                    src={selectedImage}
                                    alt="Ảnh đã chọn"
                                    className="rounded-2"
                                    style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border-0"
                                    aria-label="Bỏ ảnh đã chọn"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        <input 
                            type="text" 
                            className="form-control rounded-pill bg-light border-0 px-3" 
                            placeholder="Nhập tên món đồ cần tìm..." 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            disabled={loading}
                            style={{ fontSize: '13px' }} 
                        />
                        <button 
                            type="submit" 
                            disabled={loading || (!input.trim() && !selectedImage)}
                            className="btn rounded-circle text-white shadow-sm d-flex justify-content-center align-items-center flex-shrink-0" 
                            style={{ 
                                width: '38px', 
                                height: '38px', 
                                background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                                border: 'none'
                            }}
                        >
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT TRÒN BONG BÓNG AI (CỐ ĐỊNH TRÊN NÚT TAI NGHE) */}
            <div 
                style={{ 
                    position: 'fixed',
                    right: '30px',
                    bottom: '105px',
                    width: '60px', 
                    height: '60px',
                    zIndex: 99998
                }}
            >
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="shadow-lg d-flex align-items-center justify-content-center w-100 h-100 position-relative"
                    style={{
                        background: isOpen 
                            ? '#64748b' 
                            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)', 
                        borderRadius: '50%',
                        cursor: 'pointer', 
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                        border: '3px solid white',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.45)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title="Trợ lý AI HaiHand - Bấm để tư vấn & tìm đồ"
                >
                    {isOpen ? (
                        <span style={{ fontSize: '22px', color: '#fff', fontWeight: 'bold' }}>✕</span>
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center text-white">
                            <span style={{ fontSize: '24px', lineHeight: '1' }}>🤖</span>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>AI</span>
                        </div>
                    )}

                    {/* Dấu chấm phát sáng online */}
                    {!isOpen && (
                        <span 
                            className="position-absolute bg-info border border-2 border-white rounded-circle shadow-sm" 
                            style={{ top: '2px', right: '2px', width: '15px', height: '15px' }}
                        ></span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloatingAIChat;
