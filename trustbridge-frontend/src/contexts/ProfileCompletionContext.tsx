import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileCompletionContextType {
  isOpen: boolean;
  openProfileCompletion: () => void;
  closeProfileCompletion: () => void;
  onComplete: () => void;
  setOnComplete: (callback: () => void) => void;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextType | undefined>(undefined);

export const useProfileCompletion = () => {
  const context = useContext(ProfileCompletionContext);
  if (!context) {
    throw new Error('useProfileCompletion must be used within a ProfileCompletionProvider');
  }
  return context;
};

interface ProfileCompletionProviderProps {
  children: ReactNode;
}

export const ProfileCompletionProvider: React.FC<ProfileCompletionProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | null>(null);

  const openProfileCompletion = () => {
    console.log('ProfileCompletionContext - Opening profile completion popup');
    setIsOpen(true);
  };

  const closeProfileCompletion = () => {
    console.log('ProfileCompletionContext - Closing profile completion popup');
    setIsOpen(false);
  };

  const onComplete = () => {
    console.log('ProfileCompletionContext - Profile completed');
    setIsOpen(false);
    if (onCompleteCallback) {
      onCompleteCallback();
      setOnCompleteCallback(null);
    }
  };

  const setOnComplete = (callback: () => void) => {
    setOnCompleteCallback(() => callback);
  };

  return (
    <ProfileCompletionContext.Provider
      value={{
        isOpen,
        openProfileCompletion,
        closeProfileCompletion,
        onComplete,
        setOnComplete,
      }}
    >
      {children}
    </ProfileCompletionContext.Provider>
  );
};
