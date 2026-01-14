import React from 'react';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';
import ProfileCompletionPopup from './ProfileCompletionPopup';

const ProfileCompletionModal: React.FC = () => {
  const { isOpen, closeProfileCompletion, onComplete } = useProfileCompletion();

  return (
    <ProfileCompletionPopup
      isOpen={isOpen}
      onClose={closeProfileCompletion}
      onComplete={onComplete}
    />
  );
};

export default ProfileCompletionModal;
