'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import LegalPageLayout, { SectionCard, GradientButton } from '@/components/LegalPageLayout';
import toast from 'react-hot-toast';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Message sent successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />,
      title: "Email Us",
      value: "hello.quoteswipe@gmail.com",
      description: "We'll respond within 24-48 hours"
    },
    {
      icon: <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />,
      title: "Location",
      value: "India",
      description: "Serving users worldwide"
    },
    {
      icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />,
      title: "Support Hours",
      value: "24/7 Online Support",
      description: "Always here to help"
    }
  ];

  return (
    <LegalPageLayout
      title="Contact Us"
      icon={<MessageSquare className="w-10 h-10 text-white" />}
      description="Have questions, suggestions, or feedback? We'd love to hear from you. Our team is here to help make your QuoteSwipe experience better."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {/* Contact Info Cards */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4 order-2 lg:order-1">
          {contactInfo.map((info, index) => (
            <SectionCard key={index}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 flex-shrink-0">
                  {info.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{info.title}</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{info.value}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">{info.description}</p>
                </div>
              </div>
            </SectionCard>
          ))}

          {/* Social Links */}
          <SectionCard>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Follow Us</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {[
                { name: 'Twitter', url: 'https://twitter.com/quoteswipe' },
                { name: 'Instagram', url: 'https://www.instagram.com/quote_swipe/' },
                { name: 'Facebook', url: 'https://facebook.com/quoteswipe' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-pink-500/10 dark:hover:from-blue-500/20 dark:hover:to-pink-500/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <SectionCard>
            {isSubmitted ? (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-pink-500/20 mb-3 sm:mb-4">
                  <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  Message Sent!
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Thank you for reaching out. We'll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="bug">Report a Bug</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us what's on your mind..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-pink-600 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-pink-700 transition-all shadow-lg shadow-blue-500/25 dark:shadow-pink-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </SectionCard>
        </div>
      </div>
    </LegalPageLayout>
  );
}
