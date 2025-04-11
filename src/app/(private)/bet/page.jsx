'use client';

import React from 'react';
import BetCodeList from '@/components/bet/BetCodeList';
import ChatContainer from '@/components/chat/ChatContainer';
import { BetCodeProvider } from '@/context/BetCodeContext';
import { ChatProvider } from '@/context/ChatContext';
import { BetConfigProvider } from '@/context/BetConfigContext';

export default function BetPage() {
  return (
    <BetConfigProvider>
      <BetCodeProvider>
        <ChatProvider>
          <div className="h-screen flex flex-col">
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Bet Codes */}
              <div className="w-1/2 border-r">
                <BetCodeList />
              </div>

              {/* Right Panel - Chat */}
              <div className="w-1/2">
                <ChatContainer />
              </div>
            </div>
          </div>
        </ChatProvider>
      </BetCodeProvider>
    </BetConfigProvider>
  );
}
