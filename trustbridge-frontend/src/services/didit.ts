/**
 * Didit KYC Service
 * Handles identity verification using Didit API
 */

export interface DiditConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface DiditSession {
  sessionId: string;
  verificationUrl: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  vendorData?: string;
}

export interface DiditVerificationResult {
  sessionId: string;
  status: 'completed' | 'failed' | 'expired';
  vendorData?: string;
  verificationData?: any;
}

class DiditService {
  private config: DiditConfig;
  private baseUrl: string;

  constructor(config: DiditConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://verification.didit.me/v2';
  }

  /**
   * Create a new verification session
   */
  async createSession(vendorData?: string, workflowId?: string): Promise<DiditSession> {
    try {
      // Use our backend proxy instead of calling Didit API directly
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/didit/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorData: vendorData || '',
          workflowId: workflowId || 'default',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create Didit session');
      }

      return {
        sessionId: result.data.session_id,
        verificationUrl: result.data.url || result.data.verification_url, // Didit returns 'url' field
        status: 'pending',
        vendorData: vendorData,
      };
    } catch (error) {
      console.error('Didit session creation failed:', error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<DiditVerificationResult> {
    try {
      // Use our backend proxy instead of calling Didit API directly
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/didit/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get session status');
      }

      return {
        sessionId: result.data.session_id,
        status: result.data.status,
        vendorData: result.data.vendor_data,
        verificationData: result.data.verification_data,
      };
    } catch (error) {
      console.error('Didit session status check failed:', error);
      throw error;
    }
  }

  /**
   * Create verification link (simpler approach)
   */
  createVerificationLink(vendorData?: string, workflowId?: string): string {
    const baseUrl = 'https://verify.didit.me';
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      workflow_id: workflowId || 'default',
      vendor_data: vendorData || '',
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Open verification in popup window
   */
  async openVerificationPopup(vendorData?: string, workflowId?: string): Promise<DiditVerificationResult> {
    // First create a session to get the proper verification URL
    const session = await this.createSession(vendorData, workflowId);
    
    return new Promise((resolve, reject) => {
      const popup = window.open(
        session.verificationUrl,
        'didit-verification',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Failed to open verification popup'));
        return;
      }

      // Listen for popup messages
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== 'https://verify.didit.me') {
          return;
        }

        if (event.data.type === 'DIDIT_VERIFICATION_COMPLETE') {
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({
            sessionId: event.data.sessionId,
            status: event.data.status,
            vendorData: event.data.vendorData,
            verificationData: event.data.verificationData,
          });
        } else if (event.data.type === 'DIDIT_VERIFICATION_FAILED') {
          window.removeEventListener('message', messageHandler);
          popup.close();
          reject(new Error(event.data.error || 'Verification failed'));
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Verification cancelled by user'));
        }
      }, 1000);
    });
  }
}

// Create singleton instance
const diditService = new DiditService({
  apiKey: import.meta.env.VITE_DIDIT_API_KEY || '',
});

export default diditService;
