import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useChat } from '@/contexts/ChatContext';

const ChatInput = () => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const { addMessage, isTyping } = useChat();
  const textareaRef = useRef(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isTyping && !isComposing) {
      addMessage(input.trim());
      setInput('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;

    // If it's a text paste, let the default handler work
    if (!clipboardData.files.length) return;

    // Handle file paste
    e.preventDefault();
    const file = clipboardData.files[0];

    if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInput((prev) => prev + e.target.result);
      };
      reader.readAsText(file);
      toast.success('Đã nhập nội dung từ file!');
    } else {
      toast.error('Chỉ hỗ trợ dán file văn bản!');
    }
  };

  const handleLoadExample = () => {
    const examples = [
      'mb\n23.45.67dd10',
      'vl.ct\n12.34.56b10\n78.90da5',
      '2dmn\n123.456.789xc2',
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setInput(randomExample);
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 border-t dark:border-gray-800">
      <div className="flex items-start space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Nhập mã cược..."
            className="min-h-[40px] max-h-[200px] resize-none pr-10 focus-visible:ring-primary"
            disabled={isTyping}
          />
          <div className="absolute right-2 bottom-2 flex space-x-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={handleLoadExample}
              title="Tải mẫu mã cược"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={isTyping || !input.trim()}
          className="h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <div>Nhấn Enter để gửi, Shift+Enter để xuống dòng</div>
        <div className="flex items-center">
          <Paperclip className="h-3 w-3 mr-1" />
          <span>Có thể dán nội dung từ tệp</span>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
