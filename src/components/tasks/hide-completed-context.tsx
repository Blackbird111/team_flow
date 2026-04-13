"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface HideCompletedContextType {
  hideCompleted: boolean;
  toggleHideCompleted: () => void;
}

const HideCompletedContext = createContext<HideCompletedContextType>({
  hideCompleted: false,
  toggleHideCompleted: () => {},
});

export function HideCompletedProvider({ children }: { children: ReactNode }) {
  const [hideCompleted, setHideCompleted] = useState(false);
  return (
    <HideCompletedContext.Provider
      value={{ hideCompleted, toggleHideCompleted: () => setHideCompleted((v) => !v) }}
    >
      {children}
    </HideCompletedContext.Provider>
  );
}

export function useHideCompleted() {
  return useContext(HideCompletedContext);
}
