import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Badge } from '../../components/UI/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, Home, Building, CreditCard } from 'lucide-react';

const ProofOfAddressRequirements = () => {
  const acceptedDocuments = [
    {
      type: 'Utility Bill',
      description: 'Electricity, water, gas, internet, or phone bill',
      requirements: ['Issued within last 3 months', 'Shows your full name and address', 'From a recognized utility company'],
      icon: <Home className="w-5 h-5" />
    },
    {
      type: 'Bank Statement',
      description: 'Official bank or credit union statement',
      requirements: ['Issued within last 3 months', 'Shows your full name and address', 'From a recognized financial institution'],
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      type: 'Government Correspondence',
      description: 'Official government letters or documents',
      requirements: ['Issued within last 6 months', 'Shows your full name and address', 'From a government agency'],
      icon: <Building className="w-5 h-5" />
    },
    {
      type: 'Insurance Statement',
      description: 'Home, auto, or health insurance statement',
      requirements: ['Issued within last 3 months', 'Shows your full name and address', 'From a recognized insurance company'],
      icon: <FileText className="w-5 h-5" />
    }
  ];

  const qualityRequirements = [
    'Document must be recent (within 3-6 months)',
    'Shows your full legal name as registered',
    'Shows your complete current address',
    'Issued by a recognized organization',
    'Clear, readable text and images',
    'No alterations or modifications'
  ];

  const rejectedDocuments = [
    'Documents older than 6 months',
    'Handwritten documents',
    'Documents with different names',
    'P.O. Box addresses (unless required)',
    'Temporary or short-term addresses',
    'Documents from unrecognized sources'
  ];

  return (
    <div className="min-h-screen bg-dark-gray">
      
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-off-white mb-4">Proof of Address Requirements</h1>
          <p className="text-off-white/70 text-lg">
            Learn what documents are accepted as proof of your current residential address.
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
                <FileText className="w-5 h-5 mr-2" />
                Document Requirements
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

          {/* Address Guidelines */}
          <Card className="bg-midnight-800/30 border-primary-blue-light/20">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Address Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-off-white/80">
                <p>
                  <strong className="text-primary-blue-light">Address must match:</strong> The address on your proof of address document must exactly match the address you provided during registration.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Residential address only:</strong> We only accept documents showing your residential address, not business or temporary addresses.
                </p>
                <p>
                  <strong className="text-primary-blue-light">International addresses:</strong> We accept proof of address from any country, but the document must be in English or accompanied by a certified translation.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Recent documents:</strong> Documents must be recent to ensure the address is current and valid.
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
                  If you have questions about address verification or need assistance with document requirements, our support team is here to help.
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

export default ProofOfAddressRequirements;
