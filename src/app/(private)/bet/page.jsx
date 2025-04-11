// src/app/(private)/bet/page.jsx

'use client';

import React from 'react';
import BetCodeList from '@/components/bet/BetCodeList';
import ChatContainer from '@/components/chat/ChatContainer';
import { BetCodeProvider } from '@/contexts/BetCodeContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { BetConfigProvider, useBetConfig } from '@/contexts/BetConfigContext';
import { Loader2 } from 'lucide-react';

// Loading component using Tailwind and Lucide icons
function BetPageLoading() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      <h3 className="text-lg font-medium mb-1">Đang tải dữ liệu cược...</h3>
      <p className="text-sm text-muted-foreground">
        Vui lòng đợi trong giây lát
      </p>
    </div>
  );
}

// Main content component that uses the BetConfig context
function BetPageContent() {
  const { loading, error } = useBetConfig();

  // Show loading state
  if (loading) {
    return <BetPageLoading />;
  }

  // Show error state if needed
  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md text-center">
          <h3 className="font-medium mb-2">Lỗi tải dữ liệu</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  // Main content when data is loaded
  return (
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
  );
}

export default function BetPage() {
  return (
    <BetConfigProvider>
      <BetCodeProvider>
        <ChatProvider>
          <BetPageContent />
        </ChatProvider>
      </BetCodeProvider>
    </BetConfigProvider>
  );
}
