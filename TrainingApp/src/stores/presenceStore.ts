/**
 * Presence Store — Tracks which users are currently online.
 */

import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: number[];
  setOnlineUsers: (userIds: number[]) => void;
  isUserOnline: (userId: number) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: [],
  
  setOnlineUsers: (userIds) => {
    set({ onlineUserIds: userIds });
  },
  
  isUserOnline: (userId) => {
    return get().onlineUserIds.includes(userId);
  }
}));
