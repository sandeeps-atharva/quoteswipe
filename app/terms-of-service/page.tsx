'use client';

import { FileText, UserCheck, AlertTriangle, Scale, Shield, RefreshCw, Gavel, XCircle } from 'lucide-react';
import LegalPageLayout, { SectionCard, ContactCTA } from '@/components/LegalPageLayout';

export default function TermsOfService() {
  const sections = [
    {
      icon: <UserCheck className="text-blue-600 dark:text-blue-400" />,
      title: "1. Acceptance of Terms",
      content: `By accessing or using QuoteSwipe, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and your continued use of the service constitutes acceptance of any changes.`
    },
    {
      icon: <FileText className="text-blue-600 dark:text-blue-400" />,
      title: "2. Description of Service",
      content: `QuoteSwipe is a platform that allows users to discover, save, and share inspirational quotes. Our service includes features such as quote browsing, personalization based on categories, saving favorites, and sharing quotes with others. We strive to provide a positive and inspiring experience for all users.`
    },
    {
      icon: <Shield className="text-blue-600 dark:text-blue-400" />,
      title: "3. User Accounts",
      content: `To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information during registration. You agree to notify us immediately of any unauthorized use of your account.`
    },
    {
      icon: <AlertTriangle className="text-blue-600 dark:text-blue-400" />,
      title: "4. Prohibited Conduct",
      content: `You agree not to: use the service for any unlawful purpose; attempt to gain unauthorized access to our systems; interfere with the proper functioning of the service; upload malicious code or content; impersonate others or misrepresent your identity; violate the intellectual property rights of others; or engage in any activity that could harm other users or our service.`
    },
    {
      icon: <Scale className="text-blue-600 dark:text-blue-400" />,
      title: "5. Intellectual Property",
      content: `All content on QuoteSwipe, including but not limited to the design, logos, text, graphics, and software, is owned by or licensed to QuoteSwipe and is protected by intellectual property laws. Quotes displayed on our platform may be attributed to their respective authors. You may not reproduce, distribute, or create derivative works without our express permission.`
    },
    {
      icon: <RefreshCw className="text-blue-600 dark:text-blue-400" />,
      title: "6. User Content",
      content: `By using our service, you may save quotes and customize your preferences. You retain ownership of any content you create. However, you grant QuoteSwipe a non-exclusive, royalty-free license to use, store, and display your content as necessary to provide the service. We reserve the right to remove any content that violates these terms.`
    },
    {
      icon: <Gavel className="text-blue-600 dark:text-blue-400" />,
      title: "7. Limitation of Liability",
      content: `QuoteSwipe is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free. To the maximum extent permitted by law, QuoteSwipe shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.`
    },
    {
      icon: <XCircle className="text-blue-600 dark:text-blue-400" />,
      title: "8. Termination",
      content: `We may terminate or suspend your access to the service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the service will cease immediately. All provisions of these Terms that by their nature should survive termination shall survive.`
    }
  ];

  return (
    <LegalPageLayout
      title="Terms of Service"
      icon={<FileText className="text-white" />}
      description="Please read these terms carefully before using QuoteSwipe. These terms govern your use of our service and establish the rules for a positive community experience."
      lastUpdated="December 2024"
    >
      {/* Sections */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {sections.map((section, index) => (
          <SectionCard key={index} icon={section.icon} title={section.title}>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {section.content}
            </p>
          </SectionCard>
        ))}
      </div>

      {/* Governing Law */}
      <SectionCard className="mt-4 sm:mt-5 md:mt-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4">
          9. Governing Law
        </h3>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          These Terms shall be governed by and construed in accordance with applicable laws, 
          without regard to conflict of law principles. Any disputes arising from these terms 
          will be resolved through binding arbitration.
        </p>
      </SectionCard>

      <ContactCTA />
    </LegalPageLayout>
  );
}
