import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Badge } from '../../components/UI/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, Camera, Shield } from 'lucide-react';

const GovernmentIdRequirements = () => {
  const acceptedDocuments = [
    {
      type: 'Passport',
      description: 'Valid passport from any country',
      requirements: ['Must be current (not expired)', 'Clear photo of the main page', 'All text must be readable'],
      icon: <FileText className="w-5 h-5" />
    },
    {
      type: 'Driver\'s License',
      description: 'Valid driver\'s license from any country',
      requirements: ['Must be current (not expired)', 'Clear photo of front and back', 'All text must be readable'],
      icon: <Camera className="w-5 h-5" />
    },
    {
      type: 'National ID',
      description: 'Government-issued national identification card',
      requirements: ['Must be current (not expired)', 'Clear photo of front and back', 'All text must be readable'],
      icon: <Shield className="w-5 h-5" />
    }
  ];

  const qualityRequirements = [
    'High resolution (minimum 300 DPI)',
    'Good lighting with no shadows',
    'All corners of the document visible',
    'Text is clear and readable',
    'No blur or distortion',
    'Color photo (not black and white)'
  ];

  const rejectedDocuments = [
    'Expired documents',
    'Damaged or torn documents',
    'Photocopies or scanned copies',
    'Documents with obscured information',
    'Temporary or provisional documents',
    'Documents in languages we cannot verify'
  ];

  return (
    <div className="min-h-screen bg-dark-gray">
      
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-off-white mb-4">Government ID Requirements</h1>
          <p className="text-off-white/70 text-lg">
            Learn what government-issued identification documents are accepted for attestor verification.
          </p>
        </div>

        <div className="space-y-6">
          {/* Accepted Documents */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Accepted Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {acceptedDocuments.map((doc, index) => (
                  <div key={index} className="p-4 bg-midnight-800/30 rounded-lg border border-medium-gray/30">
                    <div className="flex items-start">
                      <div className="text-primary-blue-light mr-3 mt-1">
                        {doc.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-off-white mb-2">{doc.type}</h3>
                        <p className="text-off-white/70 mb-3">{doc.description}</p>
                        <div className="space-y-1">
                          {doc.requirements.map((req, reqIndex) => (
                            <div key={reqIndex} className="flex items-center text-sm text-off-white/80">
                              <div className="w-1.5 h-1.5 bg-primary-blue-light rounded-full mr-2"></div>
                              {req}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Requirements */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Photo Quality Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {qualityRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <CheckCircle className="w-4 h-4 text-primary-blue mr-2 flex-shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rejected Documents */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Documents We Cannot Accept
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rejectedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <XCircle className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                    {doc}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="bg-midnight-800/30 border-primary-blue-light/20">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-off-white/80">
                <p>
                  <strong className="text-primary-blue-light">Your documents are secure:</strong> All uploaded documents are encrypted and stored securely. We only use them for verification purposes and never share them with third parties.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Verification process:</strong> Our team reviews each document manually to ensure authenticity and compliance with our requirements.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Processing time:</strong> Document verification typically takes 1-3 business days. You'll receive an email notification once your documents are reviewed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-off-white mb-2">Need Help?</h3>
                <p className="text-off-white/70 mb-4">
                  If you have questions about document requirements or need assistance with the upload process, our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button className="px-4 py-2 bg-primary-blue-light text-dark-gray rounded-lg hover:bg-primary-blue-light/80 transition-colors">
                    Contact Support
                  </button>
                  <button className="px-4 py-2 border border-primary-blue-light text-primary-blue-light rounded-lg hover:bg-primary-blue-light/10 transition-colors">
                    View FAQ
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
};

export default GovernmentIdRequirements;
