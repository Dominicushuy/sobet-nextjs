'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const BetMessage = ({ message }) => {
  const isUser = message.type === 'user';
  const isError = message.isError;

  return (
    <div
      className={cn(
        'flex items-start gap-2 max-w-[80%]',
        isUser ? 'ml-auto' : 'mr-auto'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            B
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
            isError && 'bg-destructive text-destructive-foreground'
          )}
        >
          {message.content}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.timestamp), 'HH:mm')}
        </span>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default BetMessage;
