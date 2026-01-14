import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Badge } from '../../components/UI/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, Award, GraduationCap, Shield } from 'lucide-react';

const ProfessionalLicenseRequirements = () => {
  const acceptedDocuments = [
    {
      type: 'Professional License',
      description: 'Current professional license in your field of expertise',
      requirements: ['Must be current and valid', 'Issued by recognized licensing body', 'Shows your full name and license number'],
      icon: <Award className="w-5 h-5" />
    },
    {
      type: 'Professional Certification',
      description: 'Industry-recognized professional certification',
      requirements: ['Must be current and valid', 'Issued by recognized certifying body', 'Shows your full name and certification number'],
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      type: 'Professional Registration',
      description: 'Registration with professional regulatory body',
      requirements: ['Must be current and valid', 'Issued by recognized regulatory body', 'Shows your full name and registration number'],
      icon: <Shield className="w-5 h-5" />
    }
  ];

  const recognizedFields = [
    'Legal (Attorney, Bar Admission)',
    'Financial (CPA, CFA, CFP)',
    'Real Estate (Appraiser, Broker)',
    'Engineering (PE, Professional Engineer)',
    'Medical (MD, DO, RN, NP)',
    'Accounting (CPA, CMA, CIA)',
    'Architecture (AIA, Licensed Architect)',
    'Insurance (Licensed Agent, Broker)',
    'Other Professional Fields'
  ];

  const qualityRequirements = [
    'Document must be current (not expired)',
    'Shows your full legal name as registered',
    'Contains license/certification number',
    'Issued by recognized professional body',
    'Clear, readable text and images',
    'No alterations or modifications'
  ];

  const rejectedDocuments = [
    'Expired licenses or certifications',
    'Student or temporary licenses',
    'Documents from unrecognized bodies',
    'Photocopies or scanned copies',
    'Documents with different names',
    'Incomplete or partial documents'
  ];

  return (
    <div className="min-h-screen bg-dark-gray">
      
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-off-white mb-4">Professional License Requirements</h1>
          <p className="text-off-white/70 text-lg">
            Learn what professional licenses and certifications are accepted for attestor verification.
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

          {/* Recognized Fields */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Recognized Professional Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recognizedFields.map((field, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <CheckCircle className="w-4 h-4 text-primary-blue mr-2 flex-shrink-0" />
                    {field}
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

          {/* Verification Process */}
          <Card className="bg-midnight-800/30 border-primary-blue-light/20">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Verification Process
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-off-white/80">
                <p>
                  <strong className="text-primary-blue-light">License verification:</strong> We verify your professional license with the issuing authority to ensure it's current and valid.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Experience validation:</strong> Your professional experience is cross-referenced with your license history and work history.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Specialization matching:</strong> Your declared specializations must align with your professional qualifications and experience.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Processing time:</strong> Professional license verification typically takes 3-5 business days due to the need for external verification.
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
                  If you have questions about professional license requirements or need assistance with verification, our support team is here to help.
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

export default ProfessionalLicenseRequirements;
