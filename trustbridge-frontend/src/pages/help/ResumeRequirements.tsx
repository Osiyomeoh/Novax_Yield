import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Badge } from '../../components/UI/Badge';
import { CheckCircle, XCircle, AlertCircle, FileText, User, Briefcase, GraduationCap } from 'lucide-react';

const ResumeRequirements = () => {
  const requiredSections = [
    {
      title: 'Professional Summary',
      description: 'Brief overview of your professional background and expertise',
      requirements: ['2-3 sentences highlighting key qualifications', 'Relevant years of experience', 'Key specializations or areas of expertise'],
      icon: <User className="w-5 h-5" />
    },
    {
      title: 'Work Experience',
      description: 'Detailed work history with relevant professional experience',
      requirements: ['Current and previous positions', 'Job titles and company names', 'Employment dates and duration', 'Key responsibilities and achievements'],
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      title: 'Education & Certifications',
      description: 'Educational background and professional certifications',
      requirements: ['Degrees and institutions', 'Professional certifications', 'Relevant training and courses', 'Continuing education'],
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      title: 'Professional Skills',
      description: 'Technical and professional skills relevant to your field',
      requirements: ['Industry-specific skills', 'Software and tools proficiency', 'Languages spoken', 'Other relevant competencies'],
      icon: <FileText className="w-5 h-5" />
    }
  ];

  const formatRequirements = [
    'Use a professional, clean format',
    'Include contact information (name, email, phone)',
    'Use consistent formatting throughout',
    'Keep it concise but comprehensive (1-2 pages)',
    'Use bullet points for easy reading',
    'Include relevant keywords from your field'
  ];

  const contentRequirements = [
    'All information must be accurate and verifiable',
    'Include specific achievements and accomplishments',
    'Use action verbs to describe responsibilities',
    'Quantify achievements where possible',
    'Include relevant professional memberships',
    'Highlight experience relevant to asset verification'
  ];

  const rejectedContent = [
    'False or misleading information',
    'Personal information (age, marital status, etc.)',
    'Unprofessional email addresses',
    'Inconsistent formatting or typos',
    'Generic or vague descriptions',
    'Outdated or irrelevant information'
  ];

  return (
    <div className="min-h-screen bg-dark-gray">
      
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-off-white mb-4">Resume Requirements</h1>
          <p className="text-off-white/70 text-lg">
            Learn what information and format is required for your professional resume or CV.
          </p>
        </div>

        <div className="space-y-6">
          {/* Required Sections */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Required Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {requiredSections.map((section, index) => (
                  <div key={index} className="p-4 bg-midnight-800/30 rounded-lg border border-medium-gray/30">
                    <div className="flex items-start">
                      <div className="text-primary-blue-light mr-3 mt-1">
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-off-white mb-2">{section.title}</h3>
                        <p className="text-off-white/70 mb-3">{section.description}</p>
                        <div className="space-y-1">
                          {section.requirements.map((req, reqIndex) => (
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

          {/* Format Requirements */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Format Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formatRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <CheckCircle className="w-4 h-4 text-primary-blue mr-2 flex-shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Requirements */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-primary-blue flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Content Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contentRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <CheckCircle className="w-4 h-4 text-primary-blue mr-2 flex-shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rejected Content */}
          <Card className="bg-dark-gray/50 border-medium-gray">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Content We Cannot Accept
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rejectedContent.map((content, index) => (
                  <div key={index} className="flex items-center text-sm text-off-white/80">
                    <XCircle className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                    {content}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips for Success */}
          <Card className="bg-midnight-800/30 border-primary-blue-light/20">
            <CardHeader>
              <CardTitle className="text-primary-blue-light flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Tips for Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-off-white/80">
                <p>
                  <strong className="text-primary-blue-light">Tailor your resume:</strong> Highlight experience and skills that are relevant to asset verification and your chosen specialization.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Be specific:</strong> Use concrete examples and quantifiable achievements to demonstrate your expertise.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Keep it current:</strong> Ensure all information is up-to-date and reflects your current professional status.
                </p>
                <p>
                  <strong className="text-primary-blue-light">Proofread carefully:</strong> Check for spelling and grammar errors, and ensure consistent formatting throughout.
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
                  If you have questions about resume requirements or need assistance with formatting, our support team is here to help.
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

export default ResumeRequirements;
