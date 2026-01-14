import React from 'react';
import UniversalHeader from './UniversalHeader';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  searchQuery = '', 
  onSearchChange, 
  showSearch = true 
}) => {
  return (
    <UniversalHeader
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      showSearch={showSearch}
    />
  );
};

export default Header;