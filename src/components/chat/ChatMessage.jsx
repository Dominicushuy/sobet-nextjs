import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Định dạng mã cược để hiển thị đẹp hơn
const formatCode = (text) => {
  if (!text) return text;

  // Tách dòng đầu tiên (tên đài) và các dòng còn lại
  const lines = text.split('\n');
  if (lines.length <= 1) return text;

  const stationLine = lines[0];
  const betLines = lines.slice(1);

  return (
    <div className="space-y-1">
      <div className="font-semibold">{stationLine}</div>
      {betLines.map((line, index) => (
        <div
          key={index}
          className="pl-2 border-l-2 border-primary-foreground/30"
        >
          {line}
        </div>
      ))}
    </div>
  );
};

// Hiển thị chi tiết lỗi từ parseResult
const ErrorDetails = ({ parseResult }) => {
  if (!parseResult || !parseResult.errors || parseResult.errors.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-t pt-2 dark:border-gray-700">
      <h4 className="text-sm font-semibold mb-1 flex items-center">
        <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-destructive" />
        Chi tiết lỗi:
      </h4>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {parseResult.errors.map((error, idx) => (
          <li key={idx} className="text-destructive">
            {error.message || error}
          </li>
        ))}
      </ul>

      {parseResult.lines && parseResult.lines.some((line) => !line.valid) && (
        <div className="mt-2">
          <h5 className="text-xs font-medium">Lỗi cụ thể theo dòng:</h5>
          <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
            {parseResult.lines.map((line, idx) =>
              !line.valid && line.error ? (
                <li key={idx} className="text-destructive">
                  <span className="font-semibold">Dòng {idx + 1}:</span>{' '}
                  {line.error.includes(
                    'Tất cả các số trong một dòng cược phải có cùng độ dài'
                  )
                    ? `${line.error} - Các số ${line.numbers?.join(
                        ', '
                      )} có độ dài khác nhau`
                    : line.error}
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}

      {/* Thêm ví dụ để hướng dẫn người dùng */}
      <div className="mt-3 text-xs text-muted-foreground bg-muted p-2 rounded">
        <p className="mb-1 font-medium">Hướng dẫn:</p>
        <p>- Tất cả các số trong cùng một dòng phải có cùng độ dài</p>
        <p>
          - Ví dụ đúng:{' '}
          <span className="text-green-600 dark:text-green-400">11.22.33b1</span>{' '}
          hoặc{' '}
          <span className="text-green-600 dark:text-green-400">
            111.222.333b1
          </span>
        </p>
        <p>
          - Ví dụ sai:{' '}
          <span className="text-red-600 dark:text-red-400">11.222.33b1</span>{' '}
          (kết hợp số 2 và 3 chữ số)
        </p>
      </div>
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const { text, sender, timestamp, error, betCodeInfo, parseResult } = message;
  const isUser = sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép nội dung!');
  };

  return (
    <div
      className={cn(
        'flex w-full mb-4 group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground mr-2">
          B
        </div>
      )}

      <Card
        className={cn(
          'max-w-[85%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-background',
          error && !isUser ? 'border-destructive' : ''
        )}
      >
        <CardContent className="p-3">
          <div className="text-sm whitespace-pre-wrap">
            {isUser ? formatCode(text) : text}

            {/* Display error details if exists */}
            {error && !isUser && parseResult && (
              <ErrorDetails parseResult={parseResult} />
            )}

            {/* Valid bet code info */}
            {betCodeInfo && !isUser && (
              <div className="mt-2 border-t pt-2 dark:border-gray-700">
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 dark:border-green-800"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mã cược hợp lệ
                </Badge>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Đài:</span>{' '}
                    {betCodeInfo.station}
                  </div>
                  <div>
                    <span className="font-medium">Số lượng dòng:</span>{' '}
                    {betCodeInfo.lineCount}
                  </div>
                  <div>
                    <span className="font-medium">Tiền cược:</span>{' '}
                    {betCodeInfo.totalStake.toLocaleString()}đ
                  </div>
                  <div>
                    <span className="font-medium">Tiềm năng thắng:</span>{' '}
                    {betCodeInfo.potentialWin.toLocaleString()}đ
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-1">
            <div className="text-xs opacity-70">
              {format(new Date(timestamp), 'HH:mm:ss')}
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-6 w-6"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground ml-2">
          U
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
