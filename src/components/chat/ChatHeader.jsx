import React from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, HelpCircle } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { toast } from 'sonner'

const ChatHeader = () => {
  const { clearMessages, addSystemExample } = useChat()

  const handleClearChat = () => {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả tin nhắn?')) {
      clearMessages()
      toast.success('Đã xóa tất cả tin nhắn!')
    }
  }

  const handleShowHelp = () => {
    addSystemExample()
  }

  return (
    <div className='p-4 border-b flex justify-between items-center'>
      <h2 className='text-lg font-bold'>Nhập mã cược</h2>

      <div className='flex items-center space-x-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleShowHelp}
          title='Hướng dẫn'>
          <HelpCircle className='h-4 w-4' />
        </Button>

        <Button
          variant='ghost'
          size='icon'
          onClick={handleClearChat}
          title='Xóa tất cả tin nhắn'>
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

export default ChatHeader
