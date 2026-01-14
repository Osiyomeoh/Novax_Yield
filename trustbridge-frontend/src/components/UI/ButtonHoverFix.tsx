import { useEffect } from 'react';

/**
 * Component that injects CSS to fix button hover states
 * This ensures our overrides load after all other CSS
 */
export const ButtonHoverFix: React.FC = () => {
  useEffect(() => {
    // Function to apply styles directly to elements
    const applyStyles = () => {
      // First, clear inline styles from all buttons that don't have bg-black
      const allButtons = document.querySelectorAll('button:not([data-rk])');
      allButtons.forEach((button) => {
        const htmlButton = button as HTMLElement;
        const classList = htmlButton.className || '';
        
        // If button doesn't have bg-black class, clear inline styles
        if (!classList.includes('bg-black')) {
          htmlButton.style.removeProperty('background-color');
          htmlButton.style.removeProperty('background');
          htmlButton.style.removeProperty('color');
          
          // Clear styles from children too
          const children = htmlButton.querySelectorAll('*');
          children.forEach((child) => {
            const htmlChild = child as HTMLElement;
            htmlChild.style.removeProperty('color');
            htmlChild.style.removeProperty('fill');
            htmlChild.style.removeProperty('stroke');
          });
        }
      });
      
      // Then, apply black background to buttons that DO have bg-black class
      const buttonsWithBlack = document.querySelectorAll('button.bg-black, button[class*="bg-black"]');
      buttonsWithBlack.forEach((button) => {
        const htmlButton = button as HTMLElement;
        if (htmlButton && !htmlButton.hasAttribute('data-rk')) {
          const classList = htmlButton.className || '';
          // Only apply if it actually has bg-black class
          if (classList.includes('bg-black')) {
            htmlButton.style.setProperty('background-color', '#000000', 'important');
            htmlButton.style.setProperty('background', '#000000', 'important');
            htmlButton.style.setProperty('color', '#FFFFFF', 'important');
            
            // Apply white color to all children
            const children = htmlButton.querySelectorAll('*');
            children.forEach((child) => {
              const htmlChild = child as HTMLElement;
              htmlChild.style.setProperty('color', '#FFFFFF', 'important');
              htmlChild.style.setProperty('fill', '#FFFFFF', 'important');
              htmlChild.style.setProperty('stroke', '#FFFFFF', 'important');
            });
          }
        }
      });
    };
    
    // Apply styles immediately
    applyStyles();
    
    // Watch for new buttons being added
    const observer = new MutationObserver(() => {
      applyStyles();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Create a style element and inject it into the document head
    const styleId = 'button-hover-fix';
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create new style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* ULTIMATE BUTTON HOVER OVERRIDE - Loads after everything - MAXIMUM PRIORITY */
      /* Override ALL dark hover states on buttons - Use attribute selectors to catch Tailwind classes */
      html body button:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]):not([class*="variant-default"]):not([class*="variant-primary"]):not([class*="variant-destructive"]) {
        background-color: #F5F5F5 !important;
        background: #F5F5F5 !important;
        background-image: none !important;
        color: #000000 !important;
      }
      
      /* Override specific Tailwind hover classes with attribute selectors */
      html body button[class*="hover:bg-gray-700"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[class*="hover:bg-gray-800"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[class*="hover:bg-gray-900"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[class*="hover:bg-black"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[class*="hover:bg-midnight"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[class*="hover:bg-dark"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]) {
        background-color: #F5F5F5 !important;
        background: #F5F5F5 !important;
        background-image: none !important;
        color: #000000 !important;
      }
      
      /* Force outline variant buttons to have light hover */
      html body button[class*="outline"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button[data-variant="outline"]:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]),
      html body button.variant-outline:hover:not(.bg-black):not([class*="bg-black"]):not([class*="rk-connectButton"]) {
        background-color: #F5F5F5 !important;
        background: #F5F5F5 !important;
        background-image: none !important;
        color: #000000 !important;
      }
      
      /* Override buttons with white/transparent backgrounds */
      /* BUT exclude buttons with bg-black class to preserve selected tab state */
      html body button.bg-white:hover:not([class*="rk-connectButton"]):not(.bg-black):not([class*="bg-black"]),
      html body button[class*="bg-white"]:hover:not([class*="rk-connectButton"]):not(.bg-black):not([class*="bg-black"]),
      html body button.bg-transparent:hover:not([class*="rk-connectButton"]):not(.bg-black):not([class*="bg-black"]) {
        background-color: #F5F5F5 !important;
        background: #F5F5F5 !important;
        color: #000000 !important;
      }
      
      /* Force black background on selected/active tabs - MAXIMUM PRIORITY */
      /* This must override all other rules including outline, neon, ghost variants */
      /* Target ANY button with bg-black class, regardless of other classes */
      html body button.bg-black,
      html body button[class*="bg-black"],
      html body button[class*="bg-black"]:not(:hover),
      html body button.bg-gray-900,
      html body button[class*="bg-gray-900"]:not(:hover),
      html body button.bg-black:not(:hover),
      html body button[class*="bg-black"]:not(:hover):not([class*="hover"]),
      html body button.bg-black:hover,
      html body button[class*="bg-black"]:hover,
      html body button.bg-black[class*="outline"],
      html body button.bg-black[class*="neon"],
      html body button.bg-black[class*="ghost"],
      html body button[class*="bg-black"][class*="outline"],
      html body button[class*="bg-black"][class*="neon"],
      html body button[class*="bg-black"][class*="ghost"],
      html body button[class*="bg-black"][class*="variant-outline"],
      html body button[class*="bg-black"][data-variant="outline"],
      html body button[class*="bg-black"][class*="bg-white"],
      html body button.bg-black[class*="bg-white"] {
        background-color: #000000 !important;
        background: #000000 !important;
        background-image: none !important;
        color: #FFFFFF !important;
      }
      
      /* ULTIMATE OVERRIDE - Any button with bg-black gets black background */
      html body button[class*="bg-black"]:not([class*="rk-connectButton"]) {
        background-color: #000000 !important;
        background: #000000 !important;
        background-image: none !important;
        color: #FFFFFF !important;
      }
      
      /* Force white text on all children of selected tabs */
      html body button.bg-black *,
      html body button[class*="bg-black"]:not(:hover) *,
      html body button.bg-gray-900 *,
      html body button[class*="bg-gray-900"]:not(:hover) *,
      html body button.bg-black span,
      html body button[class*="bg-black"]:not(:hover) span,
      html body button.bg-black div,
      html body button[class*="bg-black"]:not(:hover) div,
      html body button.bg-black p,
      html body button[class*="bg-black"]:not(:hover) p {
        color: #FFFFFF !important;
        fill: #FFFFFF !important;
        stroke: #FFFFFF !important;
      }
      
      /* Prevent hover from overriding selected state */
      html body button.bg-black:hover,
      html body button[class*="bg-black"]:hover {
        background-color: #000000 !important;
        background: #000000 !important;
        color: #FFFFFF !important;
      }
      
      html body button.bg-black:hover *,
      html body button[class*="bg-black"]:hover * {
        color: #FFFFFF !important;
        fill: #FFFFFF !important;
        stroke: #FFFFFF !important;
      }
    `;
    
    // Append to head - this ensures it loads last
    document.head.appendChild(style);
    
    // Cleanup on unmount
    return () => {
      observer.disconnect();
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);
  
  return null;
};

