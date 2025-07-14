"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Brain, Eye, MousePointer, MessageCircle, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('./auth-modal'), { ssr: false });

interface ShowroomStats {
  views: number;
  clicks: number;
  chats: number;
}

interface ShowroomLink {
  type: 'shopper' | 'personal';
  name: string;
  url?: string;
}

type TabType = 'dashboard' | 'showrooms' | 'inventory' | 'chats';

export default function AppSidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [linkCopied, setLinkCopied] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showroomStats] = useState<ShowroomStats>({
    views: 981,
    clicks: 246,
    chats: 67
  });
  const [recentShowrooms] = useState<ShowroomLink[]>([
    { type: 'shopper', name: 'Andy Cole' },
    { type: 'shopper', name: 'Allie Davis' },
    { type: 'personal', name: 'Jake Carter' }
  ]);
  // TODO: Replace with real session/auth state as needed
  const isAuthenticated = false;
  const sessionData = { tokens_remaining: 66 };

  const handleCopyShareLink = async () => {
    const shareLink = `https://drift.ai/share/demo`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo and Navigation */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <img 
            src="https://framerusercontent.com/images/9Rn7ffrmMVfnT3aVCmGKZySRL0.png" 
            alt="Drift" 
            className="h-8"
          />
        </div>
        <div className="flex items-center justify-between text-sm mb-6">
          <h2 className="font-semibold text-gray-900">Mission Control</h2>
          {!isAuthenticated && (
            <div className="flex gap-2">
              <button className="rounded px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 transition" onClick={() => setAuthModalOpen(true)}>
                Log in
              </button>
              <button className="rounded px-3 py-1 bg-[#fe3500] text-white hover:bg-[#e62e00] transition" onClick={() => setAuthModalOpen(true)}>
                Sign Up
              </button>
            </div>
          )}
        </div>
        {/* Navigation Tabs */}
        <div className="flex gap-6 text-sm overflow-x-auto whitespace-nowrap pt-2 [&::-webkit-scrollbar]:h-1 [::-webkit-scrollbar]:hidden">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2 transition ${
              activeTab === 'dashboard' 
                ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('showrooms')}
            className={`pb-2 transition ${
              activeTab === 'showrooms' 
                ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Showrooms
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`pb-2 transition ${
              activeTab === 'inventory' 
                ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`pb-2 transition ${
              activeTab === 'chats' 
                ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Chats
          </button>
        </div>
      </div>
      {/* Tab Content */}
      {activeTab === 'dashboard' ? (
        <>
          {/* Token and Model Info */}
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#fe3500] bg-opacity-10 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#fe3500]" />
                </div>
                <span className="text-sm text-gray-600">Tokens Remaining</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{sessionData?.tokens_remaining || 66}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">driftAI Model</span>
              </div>
              <span className="text-sm font-medium text-gray-700">driftAI-4</span>
            </div>
          </div>
          {/* Share Link */}
          <div className="px-6 py-3">
            <button 
              onClick={handleCopyShareLink}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#fe3500] text-white rounded-lg hover:bg-[#e62e00] transition group"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Share with a friend and get 100 additional tokens!
                </span>
              </div>
              {linkCopied ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {linkCopied ? 'Link copied!' : 'Click to copy your share link.'}
            </p>
          </div>
          {/* Showroom Engagement Stats */}
          <div className="px-6 py-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Drift Showroom Engagement
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xs text-blue-600 mb-1">Views</div>
                <div className="text-lg font-bold text-blue-900">{showroomStats.views}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <MousePointer className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xs text-purple-600 mb-1">Clicks</div>
                <div className="text-lg font-bold text-purple-900">{showroomStats.clicks}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-xs text-orange-600 mb-1">Chats</div>
                <div className="text-lg font-bold text-orange-900">{showroomStats.chats}</div>
              </div>
            </div>
          </div>
          {/* Recent Showrooms */}
          <div className="px-6 py-4 border-t border-gray-100 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Recent Showrooms
            </h3>
            <div className="space-y-2">
              {recentShowrooms.map((showroom, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      showroom.type === 'shopper' ? 'bg-blue-500' : 'bg-[#fe3500]'
                    }`} />
                    <div>
                      <div className="text-xs text-gray-500 capitalize">
                        {showroom.type}:
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {showroom.name}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Empty state for other tabs
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">🚧</div>
            <p className="text-sm">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon</p>
          </div>
        </div>
      )}
      {/* Footer */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={() => window.location.reload()} />
    </div>
  );
}
