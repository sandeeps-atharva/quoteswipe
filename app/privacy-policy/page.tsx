'use client';

import { Shield, Eye, Lock, Server, Cookie, Mail, Globe } from 'lucide-react';
import LegalPageLayout, { SectionCard, ListItem, ContactCTA } from '@/components/LegalPageLayout';

export default function PrivacyPolicy() {
  const sections = [
    {
      icon: <Eye className="text-amber-600 dark:text-amber-400" />,
      title: "Information We Collect",
      content: [
        "Personal information (name, email) when you register an account",
        "Usage data including pages visited and features used",
        "Device information (browser type, operating system, device type)",
        "IP address for analytics and security purposes",
        "Cookies and similar tracking technologies"
      ]
    },
    {
      icon: <Server className="text-amber-600 dark:text-amber-400" />,
      title: "How We Use Your Information",
      content: [
        "To provide and maintain our quote discovery service",
        "To personalize your experience and remember your preferences",
        "To send you notifications about new features or updates",
        "To analyze usage patterns and improve our services",
        "To protect against unauthorized access and ensure security"
      ]
    },
    {
      icon: <Lock className="text-amber-600 dark:text-amber-400" />,
      title: "Data Security",
      content: [
        "We use industry-standard encryption (SSL/TLS) to protect data in transit",
        "Passwords are hashed using bcrypt encryption",
        "Regular security audits and vulnerability assessments",
        "Access to personal data is restricted to authorized personnel only",
        "We do not sell your personal information to third parties"
      ]
    },
    {
      icon: <Cookie className="text-amber-600 dark:text-amber-400" />,
      title: "Cookies & Tracking",
      content: [
        "Essential cookies for authentication and session management",
        "Analytics cookies to understand how you use our service",
        "Preference cookies to remember your settings",
        "You can control cookies through your browser settings",
        "Third-party services may set their own cookies"
      ]
    },
    {
      icon: <Globe className="text-amber-600 dark:text-amber-400" />,
      title: "Third-Party Services",
      content: [
        "Google Authentication for secure sign-in",
        "Google Analytics for usage insights",
        "Email service providers for notifications",
        "Cloud hosting services for data storage",
        "These services have their own privacy policies"
      ]
    },
    {
      icon: <Mail className="text-amber-600 dark:text-amber-400" />,
      title: "Your Rights",
      content: [
        "Access your personal data at any time through your profile",
        "Request correction of inaccurate information",
        "Delete your account and associated data",
        "Opt-out of marketing communications",
        "Export your data in a portable format"
      ]
    }
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      icon={<Shield className="text-white" />}
      description="At QuoteSwipe, we are committed to protecting your privacy and ensuring transparency about how we collect, use, and safeguard your information."
    >
      {/* Sections */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {sections.map((section, index) => (
          <SectionCard key={index} icon={section.icon} title={section.title}>
            <ul className="space-y-2 sm:space-y-3 ml-2 sm:ml-3 md:ml-4">
              {section.content.map((item, idx) => (
                <ListItem key={idx}>{item}</ListItem>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>

      <ContactCTA />
    </LegalPageLayout>
  );
}
