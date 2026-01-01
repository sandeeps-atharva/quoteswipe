'use client';

import { Cookie, Settings, BarChart2, Shield, ToggleLeft, Info } from 'lucide-react';
import LegalPageLayout, { SectionCard, ListItem, ContactCTA } from '@/components/LegalPageLayout';

export default function CookiePolicy() {
  const cookieTypes = [
    {
      icon: <Shield className="text-blue-600 dark:text-blue-400" />,
      title: "Essential Cookies",
      required: true,
      description: "These cookies are necessary for the website to function properly. They enable core features like security, authentication, and session management.",
      examples: ["Session ID", "Authentication tokens", "Security cookies"]
    },
    {
      icon: <Settings className="text-blue-600 dark:text-blue-400" />,
      title: "Preference Cookies",
      required: false,
      description: "These cookies remember your preferences and settings to provide a personalized experience, such as your language choice and theme settings.",
      examples: ["Language preference", "Theme selection (dark/light)", "Category preferences"]
    },
    {
      icon: <BarChart2 className="text-blue-600 dark:text-blue-400" />,
      title: "Analytics Cookies",
      required: false,
      description: "These cookies help us understand how visitors interact with our website by collecting anonymous information about page visits and usage patterns.",
      examples: ["Google Analytics", "Page views", "User behavior data"]
    },
    {
      icon: <ToggleLeft className="text-blue-600 dark:text-blue-400" />,
      title: "Functional Cookies",
      required: false,
      description: "These cookies enable enhanced functionality and personalization, such as remembering your saved quotes and liked content.",
      examples: ["Saved quotes", "Like/dislike history", "Social features"]
    }
  ];

  return (
    <LegalPageLayout
      title="Cookie Policy"
      icon={<Cookie className="text-white" />}
      description="This policy explains how QuoteSwipe uses cookies and similar technologies to recognize you when you visit our website."
    >
      {/* What Are Cookies */}
      <SectionCard icon={<Info className="text-blue-600 dark:text-blue-400" />} title="What Are Cookies?" className="mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
          when you visit a website. They are widely used to make websites work more efficiently 
          and to provide information to website owners. Cookies help us remember your preferences, 
          understand how you use our service, and improve your overall experience.
        </p>
      </SectionCard>

      {/* Cookie Types */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white text-center mb-4 sm:mb-5 md:mb-6">
          Types of Cookies We Use
        </h3>
        
        {cookieTypes.map((cookie, index) => (
          <SectionCard key={index}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 dark:from-amber-500/20 dark:to-rose-500/20 flex-shrink-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 [&>*]:w-full [&>*]:h-full">
                    {cookie.icon}
                  </div>
                </div>
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {cookie.title}
                </h4>
              </div>
              <span className={`self-start sm:self-auto px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                cookie.required 
                  ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-blue-700 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {cookie.required ? 'Required' : 'Optional'}
              </span>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
              {cookie.description}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {cookie.examples.map((example, idx) => (
                <span 
                  key={idx}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400"
                >
                  {example}
                </span>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      {/* Managing Cookies */}
      <SectionCard className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4">
          How to Manage Cookies
        </h3>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
          You can control and manage cookies in various ways:
        </p>
        <ul className="space-y-2 sm:space-y-3 ml-2 sm:ml-3 md:ml-4">
          <ListItem>Browser Settings: Most browsers allow you to refuse or accept cookies through their settings menu.</ListItem>
          <ListItem>Third-Party Tools: Various browser extensions can help you manage cookies and tracking.</ListItem>
          <ListItem>Opt-Out Links: Some analytics services provide opt-out mechanisms on their websites.</ListItem>
          <ListItem>Device Settings: Mobile devices often have settings to limit ad tracking and cookies.</ListItem>
        </ul>
        <div className="mt-4 sm:mt-5 md:mt-6 p-3 sm:p-4 bg-gradient-to-r from-amber-500/5 to-rose-500/5 dark:from-amber-500/10 dark:to-rose-500/10 rounded-lg sm:rounded-xl border border-blue-200/50 dark:border-pink-800/50">
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-700 dark:text-gray-300">
            <strong>Note:</strong> Blocking essential cookies may affect the functionality of our website. 
            You may not be able to use certain features like saving quotes or maintaining your login session.
          </p>
        </div>
      </SectionCard>

      {/* Updates */}
      <SectionCard>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4">
          Updates to This Policy
        </h3>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
          We may update this Cookie Policy from time to time to reflect changes in our practices or 
          for other operational, legal, or regulatory reasons. We encourage you to review this policy 
          periodically for any changes. The date at the top of this policy indicates when it was last updated.
        </p>
      </SectionCard>

      <ContactCTA />
    </LegalPageLayout>
  );
}
