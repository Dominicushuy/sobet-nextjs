import React, { useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatTypingIndicator from './ChatTypingIndicator';
import { useChat } from '@/contexts/ChatContext';
import { Card } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

const ChatContainer = () => {
  const { messages, isTyping, messagesEndRef } = useChat();
  const containerRef = useRef(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2">
              Chào mừng đến với hệ thống
            </h3>
            <p className="text-muted-foreground mb-4">
              Nhập mã cược vào ô bên dưới để bắt đầu. Hệ thống sẽ phân tích và
              thêm vào danh sách mã cược.
            </p>
            <p className="text-sm">
              Nhấn vào nút <HelpCircle className="h-3 w-3 inline" /> ở góc phải
              để xem các ví dụ mã cược.
            </p>
          </Card>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col"
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isTyping && <ChatTypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      )}

      <ChatInput />
    </div>
  );
};

export default ChatContainer;
