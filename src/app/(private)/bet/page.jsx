'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BetMessage from '@/components/betting/BetMessage';
import BetResultMessage from '@/components/betting/BetResultMessage';
import { useBetValidator } from '@/hooks/useBetValidator';

export default function BetPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollAreaRef = useRef(null);
  const lastMessageRef = useRef(null);

  const { isLoadingData, isProcessing, processBetCode } = useBetValidator();

  // Initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: '0',
        type: 'bot',
        content: 'Xin chào! Tôi là Bot đặt cược, hãy gửi mã đặt cược của bạn.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      // Process the bet code (validate + submit)
      const result = await processBetCode(input);

      if (result.error) {
        // Show error message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'bot',
            content: result.error,
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } else {
        // Show formatted bet code
        const formattedBetCode = result.data;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'bot',
            content: 'Tôi đã định dạng mã cược của bạn:',
            timestamp: new Date(),
          },
          {
            id: Date.now().toString() + '-result',
            type: 'result',
            betCode: formattedBetCode,
            timestamp: new Date(),
          },
        ]);

        toast.success('Đặt cược thành công!');
      }
    } catch (error) {
      console.error('Error processing bet code:', error);
      toast.error('Có lỗi xảy ra khi xử lý mã cược');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Có lỗi xảy ra khi xử lý mã cược. Vui lòng thử lại.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    }
  };

  return (
    <div className="container py-6 max-w-4xl">
      <Card className="h-[calc(100vh-170px)] flex flex-col">
        <CardContent className="flex flex-col h-full p-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isLastMessage = index === messages.length - 1;

                if (msg.type === 'result') {
                  return (
                    <div
                      key={msg.id}
                      ref={isLastMessage ? lastMessageRef : null}
                    >
                      <BetResultMessage betCode={msg.betCode} />
                    </div>
                  );
                }

                return (
                  <div key={msg.id} ref={isLastMessage ? lastMessageRef : null}>
                    <BetMessage message={msg} />
                  </div>
                );
              })}
              {(isProcessing || isLoadingData) && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isLoadingData
                      ? 'Đang tải dữ liệu cược...'
                      : 'Bot đang xử lý...'}
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Nhập mã đặt cược của bạn (ví dụ: mb 23.45.67dd10)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[60px]"
                disabled={isLoadingData || isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isProcessing || isLoadingData || !input.trim()}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isProcessing || isLoadingData ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
