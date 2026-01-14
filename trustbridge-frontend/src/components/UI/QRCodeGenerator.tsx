import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import Button from './Button';
import { Download, Copy, X } from 'lucide-react';

interface QRCodeGeneratorProps {
  url: string;
  title: string;
  onClose?: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ url, title, onClose }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    try {
      // Using qr-server.com API for QR code generation
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeDataUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `asset-qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.click();
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-gray-700/50 backdrop-blur-sm max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-off-white">Share Asset</CardTitle>
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-dark-gray hover:bg-medium-gray text-off-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-off-white mb-2">{title}</h3>
            {qrCodeDataUrl && (
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            <p className="text-sm text-off-white/70 mb-4">
              Scan QR code or use the link below to view this asset publicly
            </p>
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              <p className="text-xs font-mono text-off-white break-all">{url}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={copyUrl}
              variant="outline"
              className="flex-1 bg-dark-gray hover:bg-medium-gray text-off-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={downloadQRCode}
              className="flex-1 bg-primary-blue hover:bg-primary-blue-light text-black"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeGenerator;
