import React from 'react';
import { motion } from 'framer-motion';
import Navigation from './Navigation';
import Header from './Header';
import Footer from './Footer';
import AIChatbot from '../AI/AIChatbot';
import { cn } from '../../utils/helpers';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen bg-black text-off-white">
      {/* Custom Cursor */}
      <div className="cursor hidden lg:block" />
      <div className="cursor-follower hidden lg:block" />
      
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content - Full Width (Sidebar is Overlay) */}
      <div className="w-full">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <motion.main
          className={cn('min-h-screen', className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.main>
        
        {/* Footer */}
        <Footer />
      </div>
      
      {/* AI Chatbot - Available on all pages */}
      <AIChatbot />
    </div>
  );
};

export default Layout;
