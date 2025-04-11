import React from 'react';

const ChatTypingIndicator = () => {
  return (
    <div className="flex items-center space-x-2 p-3 max-w-fit mx-0 my-2 rounded-md bg-muted dark:bg-muted/40">
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-150" />
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-300" />
    </div>
  );
};

export default ChatTypingIndicator;
