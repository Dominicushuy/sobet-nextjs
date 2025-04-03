import React from 'react'

const ChatTypingIndicator = () => {
  return (
    <div className='flex items-center space-x-2 p-3 max-w-fit mx-0 my-2 rounded-md bg-muted'>
      <div className='w-2 h-2 rounded-full bg-muted-foreground animate-bounce' />
      <div className='w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-150' />
      <div className='w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-300' />
    </div>
  )
}

export default ChatTypingIndicator
