// Email templates for QuoteSwipe
// Using table-based layouts and inline styles for maximum email client compatibility

interface Quote {
  text: string;
  author: string;
  category?: string;
}

interface User {
  name: string;
  email: string;
}

// Base email wrapper - table-based for email client compatibility
function getEmailWrapper(content: string, appUrl: string, includeUnsubscribe = true): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media screen and (max-width: 600px) {
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-full-width { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Preheader Text (hidden but shows in email preview) -->
  <div style="display: none; font-size: 1px; color: #f4f4f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    QuoteSwipe - Your daily dose of inspiration
  </div>
  
  <!-- Email Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <!-- Main Content Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 32px 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <!-- Logo & Brand -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); width: 40px; height: 40px; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; color: #ffffff; font-weight: bold;">"</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: Georgia, serif;">QuoteSwipe</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: #a1a1aa; font-size: 14px; padding-bottom: 20px;">
                    Your daily dose of inspiration ✨
                  </td>
                </tr>
                
                <!-- Instagram Follow Button -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 25px; background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);">
                          <a href="https://www.instagram.com/quote_swipe/" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 25px;">
                            📸 Follow us on Instagram
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #71717a;">
                      @quote_swipe • Daily inspiration & beautiful quotes
                    </p>
                  </td>
                </tr>
                
                <!-- Footer Links -->
                <tr>
                  <td align="center" style="padding: 16px 0; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;">
                    <a href="${appUrl}" style="color: #d4d4d8; text-decoration: none; font-size: 13px; margin: 0 8px;">Home</a>
                    <span style="color: #52525b;">|</span>
                    <a href="${appUrl}/about" style="color: #d4d4d8; text-decoration: none; font-size: 13px; margin: 0 8px;">About</a>
                    <span style="color: #52525b;">|</span>
                    <a href="${appUrl}/contact" style="color: #d4d4d8; text-decoration: none; font-size: 13px; margin: 0 8px;">Contact</a>
                    <span style="color: #52525b;">|</span>
                    <a href="${appUrl}/privacy-policy" style="color: #d4d4d8; text-decoration: none; font-size: 13px; margin: 0 8px;">Privacy</a>
                  </td>
                </tr>
                
                <!-- Social Media -->
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://www.instagram.com/quote_swipe/" target="_blank" style="display: inline-block; width: 36px; height: 36px; background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%); border-radius: 8px; text-align: center; line-height: 36px; text-decoration: none;">
                            <span style="font-size: 18px;">📷</span>
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="mailto:hello.quoteswipe@gmail.com" style="display: inline-block; width: 36px; height: 36px; background-color: #3b82f6; border-radius: 8px; text-align: center; line-height: 36px; text-decoration: none;">
                            <span style="font-size: 18px;">✉️</span>
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="${appUrl}" target="_blank" style="display: inline-block; width: 36px; height: 36px; background-color: #8b5cf6; border-radius: 8px; text-align: center; line-height: 36px; text-decoration: none;">
                            <span style="font-size: 18px;">🌐</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Copyright -->
                <tr>
                  <td align="center" style="color: #71717a; font-size: 12px; padding-top: 12px;">
                    © ${new Date().getFullYear()} QuoteSwipe. All rights reserved.
                  </td>
                </tr>
                
                ${includeUnsubscribe ? `
                <tr>
                  <td align="center" style="color: #52525b; font-size: 11px; padding-top: 12px;">
                    Don't want these emails? <a href="${appUrl}/unsubscribe" style="color: #a78bfa; text-decoration: underline;">Unsubscribe</a>
                  </td>
                </tr>
                ` : ''}
                
                <!-- Contact Info -->
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color: #27272a; border-radius: 8px; padding: 12px 20px;">
                      <tr>
                        <td style="color: #a1a1aa; font-size: 12px; padding: 4px 0;">📧 hello.quoteswipe@gmail.com</td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; font-size: 12px; padding: 4px 0;">📸 instagram.com/quote_swipe</td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; font-size: 12px; padding: 4px 0;">🌐 ${appUrl}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Header component
function getHeader(title: string, subtitle: string, gradient: string = 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'): string {
  return `
<!-- Header -->
<tr>
  <td style="background: ${gradient}; padding: 40px 24px; text-align: center;">
    <!-- Logo -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
      <tr>
        <td style="background-color: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 14px; text-align: center; vertical-align: middle;">
          <span style="font-size: 36px; color: #ffffff; font-weight: bold; font-family: Georgia, serif;">"</span>
        </td>
      </tr>
    </table>
    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">${title}</h1>
    <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.9);">${subtitle}</p>
  </td>
</tr>
`;
}

// Quote card component
function getQuoteCard(quote: Quote, accentColor: string = '#8b5cf6'): string {
  return `
<!-- Quote Card -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="background-color: #fafafa; border-radius: 12px; border-left: 4px solid ${accentColor}; padding: 24px;">
      <!-- Quote Mark -->
      <div style="font-size: 48px; line-height: 1; color: ${accentColor}; opacity: 0.3; font-family: Georgia, serif; margin-bottom: -8px;">"</div>
      <!-- Quote Text -->
      <p style="margin: 0 0 16px; font-size: 18px; line-height: 1.6; color: #18181b; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
        ${quote.text}
      </p>
      <!-- Author -->
      <p style="margin: 0; font-size: 14px; color: #71717a; font-weight: 500;">
        — ${quote.author}
      </p>
      ${quote.category ? `
      <!-- Category Badge -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
        <tr>
          <td style="background-color: ${accentColor}; color: #ffffff; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${quote.category}
          </td>
        </tr>
      </table>
      ` : ''}
    </td>
  </tr>
</table>
`;
}

// CTA Button component
function getCTAButton(text: string, link: string, gradient: string = 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'): string {
  return `
<!-- CTA Button -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
  <tr>
    <td align="center" style="border-radius: 30px; background: ${gradient};">
      <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 30px;">
        ${text} →
      </a>
    </td>
  </tr>
</table>
`;
}

// Alert box component
function getAlertBox(content: string, type: 'warning' | 'info' | 'success' = 'info'): string {
  const colors = {
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  };
  const c = colors[type];
  
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="background-color: ${c.bg}; border: 1px solid ${c.border}; border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 14px; color: ${c.text}; line-height: 1.5;">
        ${content}
      </p>
    </td>
  </tr>
</table>
`;
}

// Info box component
function getInfoBox(title: string, content: string): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="background-color: #f4f4f5; border-radius: 12px; padding: 20px;">
      <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #18181b;">${title}</p>
      <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.5;">${content}</p>
    </td>
  </tr>
</table>
`;
}

// Common footer text
function getFooterText(appUrl: string, includeUnsubscribe = true): string {
  return `
-------------------------------------------
QuoteSwipe - Your daily dose of inspiration
-------------------------------------------

📸 Follow us on Instagram: @quote_swipe
   https://www.instagram.com/quote_swipe/
   Daily inspiration & beautiful quotes!

Quick Links:
• Home: ${appUrl}
• About Us: ${appUrl}/about
• Contact: ${appUrl}/contact
• Privacy Policy: ${appUrl}/privacy-policy
• Feedback: ${appUrl}/feedback

© ${new Date().getFullYear()} QuoteSwipe. All rights reserved.

Email: hello.quoteswipe@gmail.com
Instagram: instagram.com/quote_swipe
Website: ${appUrl}
${includeUnsubscribe ? `\nUnsubscribe: ${appUrl}/unsubscribe` : ''}
`;
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

// Welcome email template
export function welcomeEmailTemplate(user: User, quote: Quote, appUrl: string): string {
  const content = `
${getHeader('Welcome to QuoteSwipe! 🎉', 'Your daily dose of inspiration awaits')}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Hello <strong>${user.name}</strong>! 👋
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      We're thrilled to have you join our community of quote enthusiasts! QuoteSwipe brings you carefully curated quotes from the world's greatest minds, delivered in a fun, swipeable format.
    </p>
    
    <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #18181b;">
      Here's your first inspiring quote:
    </p>
    
    ${getQuoteCard(quote)}
    
    <p style="margin: 0 0 8px; font-size: 15px; color: #52525b;">
      Ready to discover more wisdom?
    </p>
    
    ${getCTAButton('Start Swiping', appUrl)}
    
    <p style="margin: 24px 0 12px; font-size: 15px; font-weight: 600; color: #18181b;">
      What you can do with QuoteSwipe:
    </p>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">❤️ Like quotes that resonate with you</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">📚 Save your favorites for later</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">📤 Share quotes with friends & family</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">🏷️ Browse quotes by category</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">🌍 Translate quotes to 100+ languages</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #52525b;">🎨 Customize your quote card style</td>
      </tr>
    </table>
    
    ${getInfoBox('💡 Need help?', `Have questions or feedback? Visit our <a href="${appUrl}/contact" style="color: #8b5cf6; text-decoration: none;">Contact page</a> or <a href="${appUrl}/feedback" style="color: #8b5cf6; text-decoration: none;">share your feedback</a>.`)}
    
    <!-- Instagram Follow CTA -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #ffffff;">
            📸 Follow us on Instagram!
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.9);">
            Get daily quotes, beautiful designs & inspiration
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="background-color: #ffffff; border-radius: 25px;">
                <a href="https://www.instagram.com/quote_swipe/" target="_blank" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 600; color: #833ab4; text-decoration: none;">
                  @quote_swipe →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;
  
  return getEmailWrapper(content, appUrl);
}

// Festival email template
export function festivalEmailTemplate(
  user: User,
  festivalName: string,
  quote: Quote,
  appUrl: string,
  customMessage?: string
): string {
  const festivalColors: Record<string, { gradient: string; accent: string; emoji: string }> = {
    'New Year': { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#667eea', emoji: '🎆' },
    'Valentine\'s Day': { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#f5576c', emoji: '💕' },
    'Holi': { gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #a18cd1 100%)', accent: '#ff9a9e', emoji: '🌈' },
    'Easter': { gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', accent: '#667eea', emoji: '🐰' },
    'Diwali': { gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', accent: '#f59e0b', emoji: '🪔' },
    'Christmas': { gradient: 'linear-gradient(135deg, #c41e3a 0%, #165b33 100%)', accent: '#c41e3a', emoji: '🎄' },
    'Thanksgiving': { gradient: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', accent: '#d97706', emoji: '🦃' },
    'Independence Day': { gradient: 'linear-gradient(135deg, #ff6b35 0%, #138808 100%)', accent: '#ff6b35', emoji: '🇮🇳' },
    'Eid': { gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', accent: '#059669', emoji: '🌙' },
    'Raksha Bandhan': { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', accent: '#ec4899', emoji: '🎀' },
    'Ganesh Chaturthi': { gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', accent: '#f97316', emoji: '🙏' },
    'Navratri': { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', emoji: '💃' },
    'Durga Puja': { gradient: 'linear-gradient(135deg, #dc2626 0%, #facc15 100%)', accent: '#dc2626', emoji: '🔱' },
    'Onam': { gradient: 'linear-gradient(135deg, #fbbf24 0%, #22c55e 100%)', accent: '#fbbf24', emoji: '🌼' },
    'Pongal': { gradient: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', accent: '#f97316', emoji: '🍚' },
    'Makar Sankranti': { gradient: 'linear-gradient(135deg, #f97316 0%, #0ea5e9 100%)', accent: '#f97316', emoji: '🪁' },
    'Republic Day': { gradient: 'linear-gradient(135deg, #ff6b35 0%, #138808 100%)', accent: '#ff6b35', emoji: '🇮🇳' },
    'Mother\'s Day': { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', accent: '#ec4899', emoji: '👩‍👧' },
    'Father\'s Day': { gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', accent: '#3b82f6', emoji: '👨‍👧' },
  };

  const colors = festivalColors[festivalName] || festivalColors['New Year'];

  const content = `
${getHeader(`${colors.emoji} Happy ${festivalName}! ${colors.emoji}`, 'Wishing you joy, peace, and inspiration', colors.gradient)}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Dear <strong>${user.name}</strong>,
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      ${customMessage || `On this special occasion of ${festivalName}, we wanted to share something meaningful with you. May this day bring you happiness and inspire you to spread positivity!`}
    </p>
    
    ${getQuoteCard(quote, colors.accent)}
    
    <p style="margin: 0 0 8px; font-size: 15px; color: #52525b;">
      We hope this quote resonates with the spirit of ${festivalName} and adds a touch of wisdom to your celebrations!
    </p>
    
    ${getCTAButton('Discover More Quotes', appUrl, colors.gradient)}
    
    <p style="margin: 24px 0; font-size: 15px; color: #52525b; text-align: center;">
        ${colors.emoji} Wishing you and your loved ones a wonderful ${festivalName}! ${colors.emoji}
      </p>
      
    ${getInfoBox('🎁 Spread the joy!', `Share this quote with your friends and family. Visit <a href="${appUrl}" style="color: ${colors.accent}; text-decoration: none;">QuoteSwipe</a> to discover more inspiring quotes.`)}
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl);
}

// Password Reset email template
export function passwordResetEmailTemplate(userName: string, resetLink: string, appUrl: string): string {
  const content = `
${getHeader('Reset Your Password 🔐', 'We received a request to reset your password')}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Hello <strong>${userName}</strong>! 👋
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      We received a request to reset your password for your QuoteSwipe account. Don't worry, we've got you covered!
    </p>
    
    <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #18181b;">
      Click the button below to reset your password:
    </p>
    
    ${getCTAButton('Reset Password', resetLink)}
    
    ${getAlertBox('⚠️ <strong>Important:</strong> This link will expire in <strong>1 hour</strong>. If you didn\'t request a password reset, you can safely ignore this email.', 'warning')}
    
    <p style="margin: 20px 0 8px; font-size: 14px; color: #71717a;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #f4f4f5; border-radius: 8px; padding: 12px; word-break: break-all; font-size: 12px; color: #52525b; font-family: monospace;">
          ${resetLink}
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 8px; font-size: 15px; font-weight: 600; color: #18181b;">
      Why did I receive this email?
    </p>
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
      Someone requested a password reset for the QuoteSwipe account associated with this email address. If this wasn't you, no action is needed.
    </p>
    
    ${getInfoBox('💬 Need help?', `Contact our support team at <a href="${appUrl}/contact" style="color: #8b5cf6; text-decoration: none;">${appUrl}/contact</a>`)}
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl, false);
}

// Daily Quote email template
export function dailyQuoteEmailTemplate(user: User, quote: Quote, appUrl: string): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const content = `
${getHeader('Your Daily Quote ✨', today)}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Good morning, <strong>${user.name}</strong>! ☀️
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      Here's today's dose of inspiration to kickstart your day:
    </p>
    
    ${getQuoteCard(quote)}
    
    <p style="margin: 0 0 8px; font-size: 15px; color: #52525b;">
      Let this wisdom guide your day and inspire positive actions!
    </p>
    
    ${getCTAButton('Explore More Quotes', appUrl)}
    
    ${getInfoBox('💡 Did you know?', 'You can save your favorite quotes and access them anytime! Just tap the bookmark icon when you find a quote you love.')}
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
      📸 Follow <a href="https://www.instagram.com/quote_swipe/" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">@quote_swipe</a> on Instagram for more inspiration!
    </p>
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl);
}

// Weekly Digest email template
export function weeklyDigestEmailTemplate(user: User, quotes: Quote[], appUrl: string): string {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
  
  const quoteCards = quotes.slice(0, 5).map((quote, index) => `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 12px 0;">
  <tr>
    <td style="background-color: #fafafa; border-radius: 10px; border-left: 3px solid ${colors[index]}; padding: 16px;">
      <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.5; color: #18181b; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
        "${quote.text}"
      </p>
      <p style="margin: 0; font-size: 12px; color: #71717a;">— ${quote.author}</p>
    </td>
  </tr>
</table>
  `).join('');

  const content = `
${getHeader('Weekly Quote Digest 📚', 'Your best quotes from this week')}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Hello <strong>${user.name}</strong>! 👋
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      Here's a collection of inspiring quotes from this week. Take a moment to reflect on these words of wisdom:
    </p>
      
      ${quoteCards}
      
    ${getCTAButton('Discover More Quotes', appUrl)}
    
    ${getInfoBox('📊 Your Week in Quotes', 'Keep exploring, keep saving, keep getting inspired! Visit QuoteSwipe to discover even more wisdom.')}
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
        Have feedback? We'd love to hear from you! 
      <a href="${appUrl}/feedback" style="color: #8b5cf6; text-decoration: none;">Share your thoughts</a>.
    </p>
    
    <p style="margin: 12px 0 0; font-size: 14px; color: #71717a; text-align: center;">
      📸 Follow <a href="https://www.instagram.com/quote_swipe/" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">@quote_swipe</a> for daily inspiration!
    </p>
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl);
}

// Notification email template
export function notificationEmailTemplate(
  user: User,
  title: string,
  message: string,
  ctaText: string,
  ctaLink: string,
  appUrl: string
): string {
  const content = `
${getHeader(title, 'QuoteSwipe Notification')}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Hello <strong>${user.name}</strong>! 👋
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
      ${message}
    </p>
    
    ${getCTAButton(ctaText, ctaLink)}
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl);
}

// =====================================================
// PLAIN TEXT VERSIONS
// =====================================================

export function passwordResetEmailText(userName: string, resetLink: string, appUrl: string): string {
  return `
Hello ${userName}!

We received a request to reset your password for your QuoteSwipe account.

To reset your password, visit this link:
${resetLink}

⚠️ IMPORTANT: This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Need help? Contact us at: ${appUrl}/contact
${getFooterText(appUrl, false)}
`;
}

export function welcomeEmailText(user: User, quote: Quote, appUrl: string): string {
  return `
Welcome to QuoteSwipe, ${user.name}! 🎉

We're thrilled to have you join our community of quote enthusiasts!

Here's your first inspiring quote:

"${quote.text}"
— ${quote.author}

Ready to discover more wisdom? Visit: ${appUrl}

What you can do with QuoteSwipe:
• ❤️ Like quotes that resonate with you
• 📚 Save your favorites for later
• 📤 Share quotes with friends & family
• 🏷️ Browse quotes by category
• 🌍 Translate quotes to 100+ languages
• 🎨 Customize your quote card style

📸 FOLLOW US ON INSTAGRAM!
@quote_swipe - Daily quotes, beautiful designs & inspiration
https://www.instagram.com/quote_swipe/

Have questions or feedback? 
• Contact us: ${appUrl}/contact
• Share feedback: ${appUrl}/feedback
${getFooterText(appUrl)}
`;
}

export function festivalEmailText(
  user: User,
  festivalName: string,
  quote: Quote,
  appUrl: string,
  customMessage?: string
): string {
  return `
Happy ${festivalName}, ${user.name}! 🎉

${customMessage || `On this special occasion of ${festivalName}, we wanted to share something meaningful with you.`}

"${quote.text}"
— ${quote.author}

We hope this quote resonates with the spirit of ${festivalName}!

Discover more quotes at: ${appUrl}

Spread the joy! Share this quote with your friends and family.

Warm wishes from the QuoteSwipe team!
${getFooterText(appUrl)}
`;
}

export function dailyQuoteEmailText(user: User, quote: Quote, appUrl: string): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  return `
Good morning, ${user.name}! ☀️

Your Daily Quote - ${today}

"${quote.text}"
— ${quote.author}

Let this wisdom guide your day and inspire positive actions!

Explore more quotes at: ${appUrl}

💡 Tip: You can save your favorite quotes and access them anytime!

📸 Follow @quote_swipe on Instagram for more inspiration!
https://www.instagram.com/quote_swipe/
${getFooterText(appUrl)}
`;
}

export function weeklyDigestEmailText(user: User, quotes: Quote[], appUrl: string): string {
  const quoteTexts = quotes.slice(0, 5).map((quote, index) => 
    `${index + 1}. "${quote.text}" — ${quote.author}`
  ).join('\n\n');

  return `
Weekly Quote Digest 📚

Hello ${user.name}!

Here's a collection of inspiring quotes from this week:

${quoteTexts}

Discover more quotes at: ${appUrl}

Keep exploring, keep saving, keep getting inspired!

📸 Follow @quote_swipe on Instagram for daily inspiration!
https://www.instagram.com/quote_swipe/

Have feedback? Share your thoughts: ${appUrl}/feedback
${getFooterText(appUrl)}
`;
}

export function notificationEmailText(
  user: User,
  title: string,
  message: string,
  ctaText: string,
  ctaLink: string,
  appUrl: string
): string {
  return `
${title}

Hello ${user.name}!

${message}

${ctaText}: ${ctaLink}
${getFooterText(appUrl)}
`;
}

// Custom email template (without festival/quote requirement)
export function customEmailTemplate(
  user: User,
  subject: string,
  message: string,
  appUrl: string
): string {
  const content = `
${getHeader('QuoteSwipe', 'A message for you')}

<!-- Content -->
<tr>
  <td class="mobile-padding" style="padding: 32px 24px;">
    <p style="margin: 0 0 20px; font-size: 17px; color: #3f3f46;">
      Hello <strong>${user.name}</strong>! 👋
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.8; color: #52525b; white-space: pre-wrap;">
      ${message}
    </p>
    
    ${getCTAButton('Visit QuoteSwipe', appUrl)}
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
      Best wishes,<br>
      The QuoteSwipe Team
    </p>
  </td>
</tr>
`;

  return getEmailWrapper(content, appUrl);
}

export function customEmailText(
  user: User,
  subject: string,
  message: string,
  appUrl: string
): string {
  return `
Hello ${user.name}!

${message}

Visit QuoteSwipe: ${appUrl}

Best wishes,
The QuoteSwipe Team
${getFooterText(appUrl)}
`;
}
