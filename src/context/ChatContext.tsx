import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ChatContextPayload {
  problemSlug?: string;
  problemTitle?: string;
  difficulty?: string;
  category?: string;
  userCode?: string;
  pseudocode?: string;
  compilerOutput?: string;
  currentStep?: number;
  totalSteps?: number;
  stepDesc?: string;
  stepVariables?: any;
  customPrompt?: string;
  route?: string;
  pageTitle?: string;
  activeTab?: string;
  role?: "interviewer" | "step_doubts" | "evaluator" | "mistake_analyzer" | "general" | "solutions";
  [key: string]: any;
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (payload?: ChatContextPayload) => void;
  closeChat: () => void;
  toggleChat: () => void;
  activeContext: ChatContextPayload | null;
  updateContext: (payload: Partial<ChatContextPayload>) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContext, setActiveContext] = useState<ChatContextPayload | null>(null);

  const openChat = useCallback((payload?: ChatContextPayload) => {
    if (payload) {
      setActiveContext(payload);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const updateContext = useCallback((payload: Partial<ChatContextPayload>) => {
    setActiveContext((prev) => ({ ...(prev || {}), ...payload }));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        toggleChat,
        activeContext,
        updateContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
