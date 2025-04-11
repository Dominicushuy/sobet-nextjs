'use client';

import React from 'react';
import BetCodeList from '@/components/bet/BetCodeList';
import ChatContainer from '@/components/chat/ChatContainer';
import { BetCodeProvider } from '@/contexts/BetCodeContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { BetConfigProvider } from '@/contexts/BetConfigContext';

export default function BetPage() {
  return (
    <BetConfigProvider>
      <BetCodeProvider>
        <ChatProvider>
          <div className="h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex-1 flex overflow-hidden rounded-lg shadow-sm">
              {/* Left Panel - Bet Codes */}
              <div className="w-1/2 border-r dark:border-gray-800">
                <BetCodeList />
              </div>

              {/* Right Panel - Chat */}
              <div className="w-1/2 bg-card">
                <ChatContainer />
              </div>
            </div>
          </div>
        </ChatProvider>
      </BetCodeProvider>
    </BetConfigProvider>
  );
}
