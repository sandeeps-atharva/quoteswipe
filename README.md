# 🎴 QuoteSwipe

> **Discover inspiration, one swipe at a time.**

A modern, Tinder-style quote discovery app built with Next.js 15, featuring swipe gestures, multi-language support, Google authentication, and a beautiful responsive design.

![QuoteSwipe](public/logo.svg)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎴 **Swipe Interface** | Tinder-style card swiping for quotes |
| 🔐 **Authentication** | Email/Password + Google OAuth |
| 🌍 **Multi-Language** | Translate quotes to 100+ languages |
| 💾 **Save Favorites** | Build your personal quote collection |
| 👍 **Like/Dislike** | Express your preferences |
| 📱 **Responsive** | Works perfectly on all devices |
| 🌙 **Dark Mode** | Beautiful dark theme support |
| 📊 **Admin Panel** | Manage users, quotes, and emails |
| 📧 **Email System** | Welcome emails, password reset, festivals |
| 🎯 **130+ Categories** | Find quotes that resonate with you |
| 📈 **Visitor Tracking** | Analytics for visitor insights |
| 🔗 **Share Quotes** | Share on social media |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **MySQL 8** | Database |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Google OAuth** | Social login |
| **Nodemailer** | Email service |
| **Google Translate API** | Multi-language support |

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/)
- ✅ **npm** or **yarn**
- ✅ **Git**

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/quote-swipe.git
cd quote-swipe
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Database

```bash
# Login to MySQL
mysql -u root -p

# Run the setup SQL file
SOURCE database/setup.sql;

# Exit MySQL
exit;
```

Or use this one-liner:
```bash
mysql -u root -p < database/setup.sql
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy from example (or create manually)
touch .env.local
```

Add the following variables to `.env.local`:

```env
# ================================
# DATABASE CONFIGURATION
# ================================
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quote_swipe

# ================================
# JWT SECRET
# ================================
# Generate a random string (use: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# ================================
# GOOGLE OAUTH (Optional)
# ================================
# Get from: https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ================================
# GOOGLE TRANSLATE API (Optional)
# ================================
# Get from: https://console.cloud.google.com/
GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key

# ================================
# EMAIL CONFIGURATION (Optional)
# ================================
# For Gmail: Enable 2FA and create App Password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=QuoteSwipe <your-email@gmail.com>

# ================================
# SITE URL
# ================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📁 Project Structure

```
quote-swipe/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication
│   │   │   ├── login/           # POST - Login
│   │   │   ├── register/        # POST - Register
│   │   │   ├── google/          # POST - Google OAuth
│   │   │   ├── me/              # GET - Current user
│   │   │   ├── logout/          # POST - Logout
│   │   │   ├── forgot-password/ # POST - Request reset
│   │   │   ├── reset-password/  # POST - Reset password
│   │   │   └── update-password/ # POST - Update password
│   │   ├── quotes/              # Quote endpoints
│   │   ├── categories/          # Category endpoints
│   │   ├── user/                # User actions
│   │   │   ├── likes/           # Like quotes
│   │   │   ├── dislikes/        # Dislike quotes
│   │   │   ├── saved/           # Save quotes
│   │   │   ├── preferences/     # User preferences
│   │   │   └── profile/         # User profile
│   │   ├── admin/               # Admin endpoints
│   │   ├── track/               # Visitor tracking
│   │   └── translate/           # Translation API
│   ├── about/                   # About page
│   ├── contact/                 # Contact page
│   ├── privacy-policy/          # Privacy policy
│   ├── terms-of-service/        # Terms of service
│   ├── cookie-policy/           # Cookie policy
│   ├── admin/                   # Admin dashboard
│   ├── quote/[id]/              # Single quote page
│   ├── reset-password/          # Password reset page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   ├── sitemap.ts               # SEO sitemap
│   └── robots.ts                # SEO robots
│
├── components/                   # React Components
│   ├── SwipeQuotes.tsx          # Main swipe interface
│   ├── QuoteCard.tsx            # Quote card component
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── AuthModal.tsx            # Login/Register modal
│   ├── ShareModal.tsx           # Share quote modal
│   ├── Modal.tsx                # Base modal component
│   ├── ControlButtons.tsx       # Swipe control buttons
│   ├── LanguageSelector.tsx     # Language dropdown
│   ├── GoogleSignInButton.tsx   # Google sign-in
│   ├── UpdatePasswordModal.tsx  # Password update
│   ├── InstagramFollowModal.tsx # Instagram follow prompt
│   ├── FestivalCalendar.tsx     # Admin festival calendar
│   ├── LegalPageLayout.tsx      # Legal pages layout
│   └── Footer.tsx               # Footer component
│
├── contexts/                     # React Contexts
│   ├── ThemeContext.tsx         # Dark/Light mode
│   └── LanguageContext.tsx      # Translation context
│
├── hooks/                        # Custom Hooks
│   ├── useTranslation.ts        # Translation hook
│   └── useVisitorTracking.ts    # Visitor tracking hook
│
├── lib/                          # Utilities
│   ├── db.ts                    # MySQL connection pool
│   ├── auth.ts                  # JWT authentication
│   ├── email.ts                 # Email service
│   └── email-templates.ts       # Email HTML templates
│
├── database/                     # Database files
│   └── setup.sql                # Complete DB setup
│
├── public/                       # Static assets
│   └── logo.svg                 # App logo
│
├── .env.local                   # Environment variables (create this)
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind config
└── README.md                    # This file
```

---

## 🗄️ Database Schema

The `database/setup.sql` creates these tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts (email, Google OAuth) |
| `categories` | Quote categories (130+) |
| `quotes` | All quotes with authors |
| `user_likes` | User like history |
| `user_dislikes` | User dislike history |
| `user_saved` | Saved/bookmarked quotes |
| `user_preferences` | Category preferences |
| `visitors` | Visitor analytics |
| `festivals` | Festival/holiday data |
| `festival_quotes` | Festival-quote associations |
| `email_campaigns` | Email campaign tracking |
| `email_logs` | Email delivery logs |
| `scheduled_emails` | Scheduled email jobs |

---

## 🔑 API Endpoints

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login user
POST /api/auth/google       - Google OAuth login
GET  /api/auth/me           - Get current user
POST /api/auth/logout       - Logout user
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password  - Reset password with token
POST /api/auth/update-password - Update password (logged in)
```

### Quotes
```
GET  /api/quotes            - Get quotes (paginated)
GET  /api/quotes?category=X - Get quotes by category
```

### Categories
```
GET  /api/categories        - Get all categories
```

### User Actions
```
POST /api/user/likes        - Like a quote
GET  /api/user/likes        - Get liked quotes
POST /api/user/dislikes     - Dislike a quote
POST /api/user/saved        - Save a quote
GET  /api/user/saved        - Get saved quotes
GET  /api/user/preferences  - Get category preferences
POST /api/user/preferences  - Save category preferences
GET  /api/user/profile      - Get user profile
PUT  /api/user/profile      - Update user profile
```

### Translation
```
POST /api/translate         - Translate text
```

---

## 🔧 Configuration Guide

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID**
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
6. Copy the Client ID to `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Gmail
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new App Password for "Mail"
4. Use this password in `EMAIL_PASSWORD`

### Google Translate API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Cloud Translation API**
3. Create an API Key
4. Add to `GOOGLE_TRANSLATE_API_KEY`

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Self-Hosted

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
# ... other variables
```

---

## 🛡️ Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ HTTP-only cookies
- ✅ CSRF protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ Rate limiting ready

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Home - Swipe quotes |
| `/quote/[id]` | Single quote view |
| `/about` | About us |
| `/contact` | Contact form |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |
| `/cookie-policy` | Cookie policy |
| `/reset-password` | Password reset |
| `/admin` | Admin dashboard |

---

## 🎨 Customization

### Adding New Categories

```sql
INSERT INTO categories (name, icon) VALUES ('Your Category', '🎯');
```

### Adding New Quotes

```sql
INSERT INTO quotes (text, author, category_id) VALUES 
('Your quote text here', 'Author Name', 
  (SELECT id FROM categories WHERE name = 'Category Name'));
```

### Changing Theme Colors

Edit `app/globals.css` and modify the gradient colors:
```css
/* Main gradient: from-blue-50 via-indigo-50 to-pink-50 */
```

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: Access denied for user
```
**Solution:** Check `DB_USER` and `DB_PASSWORD` in `.env.local`

### Google OAuth Not Working
```
Error: Invalid client_id
```
**Solution:** Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and authorized origins

### Emails Not Sending
```
Error: Authentication failed
```
**Solution:** Use Gmail App Password, not your regular password

---

## 📝 License

MIT License - Free for personal and commercial use.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📞 Support

- 📧 Email: support@quoteswipe.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/quote-swipe/issues)

---

<p align="center">
  Made with ❤️ by QuoteSwipe Team
</p>
