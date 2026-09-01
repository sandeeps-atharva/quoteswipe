# 🎴 QuoteSwipe

> **Discover inspiration, one swipe at a time.**

A modern, Tinder-style quote discovery app built with Next.js 16, React 19, MongoDB, and TypeScript. Features swipe gestures, quote creation, card customization, 2K quality downloads, multi-language support, and Google authentication.

![QuoteSwipe](public/logo.svg)

---

## ✨ Features

### Core Features

| Feature                   | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| 🎴 **Swipe Interface**    | Tinder-style card swiping with smooth animations     |
| ✍️ **Create Quotes**      | Create your own quotes (public or private)           |
| 🎨 **Card Customization** | Themes, fonts, backgrounds, and custom image uploads |
| 📥 **2K Downloads**       | High-quality 1920×2400 pixel image exports           |
| 🔍 **Search Collections** | Search through liked, saved, and skipped quotes      |
| 📍 **Position Control**   | Adjust quote position before downloading             |

### User Features

| Feature               | Description                                 |
| --------------------- | ------------------------------------------- |
| 🔐 **Authentication** | Email/Password + Google OAuth               |
| 💾 **Save Favorites** | Build your personal quote collection        |
| 👍 **Like/Dislike**   | Express your preferences with optimistic UI |
| 🌍 **Multi-Language** | Translate quotes to 100+ languages          |
| 📱 **Responsive**     | Works perfectly on all devices              |
| 🌙 **Dark Mode**      | Beautiful dark theme support                |

### Admin & System

| Feature                 | Description                               |
| ----------------------- | ----------------------------------------- |
| 📊 **Admin Panel**      | Manage users, quotes, and emails          |
| 📧 **Email System**     | Welcome emails, password reset, festivals |
| 🎯 **130+ Categories**  | Find quotes that resonate with you        |
| 📈 **Visitor Tracking** | Analytics for visitor insights            |
| 🔗 **Share Quotes**     | Share on social media platforms           |
| 🍪 **Cookie Consent**   | GDPR compliant cookie management          |

---

## 🛠️ Tech Stack

| Technology               | Purpose                               |
| ------------------------ | ------------------------------------- |
| **Next.js 16**           | React framework with App Router       |
| **React 19**             | Latest React with concurrent features |
| **TypeScript**           | Type-safe development                 |
| **MongoDB**              | NoSQL database                        |
| **Tailwind CSS 4**       | Utility-first styling                 |
| **JWT**                  | Authentication tokens                 |
| **bcryptjs**             | Password hashing                      |
| **Google OAuth**         | Social login                          |
| **html-to-image**        | 2K quality image generation           |
| **react-swipeable**      | Touch gesture support                 |
| **Nodemailer**           | Email service                         |
| **Google Translate API** | Multi-language support                |

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **MongoDB** - [Atlas](https://www.mongodb.com/atlas) or local installation
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

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# ================================
# DATABASE CONFIGURATION (MongoDB)
# ================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quote_swipe?retryWrites=true&w=majority

# ================================
# JWT SECRET
# ================================
# Generate a random string (use: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# ================================
# GOOGLE OAUTH
# ================================
# Get from: https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ================================
# GOOGLE TRANSLATE API (Optional)
# ================================
GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key

# ================================
# EMAIL CONFIGURATION (Optional)
# ================================
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

### Step 4: Run the Development Server

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
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/            # POST - Login
│   │   │   ├── register/         # POST - Register
│   │   │   ├── google/           # POST - Google OAuth
│   │   │   ├── me/               # GET - Current user
│   │   │   ├── logout/           # POST - Logout
│   │   │   ├── forgot-password/  # POST - Request reset
│   │   │   ├── reset-password/   # POST - Reset password
│   │   │   └── update-password/  # POST - Update password
│   │   ├── quotes/               # Quote endpoints
│   │   │   ├── route.ts          # GET - Fetch quotes
│   │   │   └── [id]/route.ts     # GET - Single quote
│   │   ├── categories/           # GET - All categories
│   │   ├── user/                 # User actions
│   │   │   ├── likes/            # Like quotes
│   │   │   ├── dislikes/         # Dislike quotes
│   │   │   ├── saved/            # Save quotes
│   │   │   ├── quotes/           # User-created quotes (CRUD)
│   │   │   ├── all-preferences/  # Combined preferences API
│   │   │   ├── upload-background/# Custom background uploads
│   │   │   ├── profile/          # User profile
│   │   │   └── theme/            # Theme preferences
│   │   ├── admin/                # Admin endpoints
│   │   ├── feedback/             # User feedback
│   │   ├── reviews/              # Testimonials
│   │   ├── stats/                # Statistics
│   │   ├── track/                # Visitor tracking
│   │   └── translate/            # Translation API
│   ├── quote/[id]/               # Single quote page (SEO)
│   ├── user-quote/[id]/          # User quote page (SEO)
│   ├── admin/                    # Admin dashboard
│   ├── about/                    # About page
│   ├── contact/                  # Contact page
│   ├── feedback/                 # Feedback page
│   ├── review/                   # Review page
│   ├── privacy-policy/           # Privacy policy
│   ├── terms-of-service/         # Terms of service
│   ├── cookie-policy/            # Cookie policy
│   ├── reset-password/           # Password reset
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── not-found.tsx             # 404 page
│   ├── globals.css               # Global styles
│   ├── sitemap.ts                # SEO sitemap
│   └── robots.ts                 # SEO robots
│
├── components/                   # React Components
│   ├── SwipeQuotes.tsx           # Main swipe interface
│   ├── QuoteCard.tsx             # Quote card component
│   ├── Sidebar.tsx               # Navigation sidebar with search
│   ├── AuthModal.tsx             # Login/Register modal
│   ├── ShareModal.tsx            # Share & download modal (2K)
│   ├── CreateQuoteModal.tsx      # Quote creation/editing
│   ├── CardCustomization.tsx     # Theme, font, background picker
│   ├── ControlButtons.tsx        # Swipe control buttons
│   ├── LanguageSelector.tsx      # Language dropdown
│   ├── GoogleSignInButton.tsx    # Google sign-in
│   ├── SearchModal.tsx           # Search modal
│   ├── CookieConsent.tsx         # Cookie consent banner
│   ├── Testimonials.tsx          # User testimonials
│   ├── CustomToaster.tsx         # Toast notifications
│   ├── UpdatePasswordModal.tsx   # Password update
│   ├── InstagramFollowModal.tsx  # Instagram follow prompt
│   ├── FestivalCalendar.tsx      # Admin festival calendar
│   ├── LegalPageLayout.tsx       # Legal pages layout
│   ├── Modal.tsx                 # Base modal component
│   └── Footer.tsx                # Footer component
│
├── contexts/                     # React Contexts
│   ├── ThemeContext.tsx          # Dark/Light mode
│   └── LanguageContext.tsx       # Translation context
│
├── hooks/                        # Custom Hooks
│   ├── useTranslation.ts         # Translation hook
│   └── useVisitorTracking.ts     # Visitor tracking hook
│
├── lib/                          # Utilities
│   ├── db.ts                     # MongoDB connection (singleton)
│   ├── auth.ts                   # JWT authentication
│   ├── helpers.ts                # Helper functions
│   ├── constants.ts              # App constants
│   ├── email.ts                  # Email service
│   └── email-templates.ts        # Email HTML templates
│
├── database/                     # Database files
│   ├── setup.sql                 # Initial setup reference
│   └── migrations/               # Schema migrations
│
├── public/                       # Static assets
│   ├── logo.svg                  # App logo
│   ├── og-image.svg              # Open Graph image
│   └── manifest.json             # PWA manifest
│
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── vercel.json                   # Vercel deployment config
└── README.md                     # This file
```

---

## 🗄️ Database Collections (MongoDB)

| Collection         | Description                                      |
| ------------------ | ------------------------------------------------ |
| `users`            | User accounts (email, Google OAuth, preferences) |
| `categories`       | Quote categories (130+)                          |
| `quotes`           | Curated quotes with authors                      |
| `user_quotes`      | User-created quotes (public/private)             |
| `user_likes`       | User like history                                |
| `user_dislikes`    | User dislike history                             |
| `user_saved`       | Saved/bookmarked quotes                          |
| `visitors`         | Visitor analytics                                |
| `festivals`        | Festival/holiday data                            |
| `festival_quotes`  | Festival-quote associations                      |
| `email_campaigns`  | Email campaign tracking                          |
| `email_logs`       | Email delivery logs                              |
| `scheduled_emails` | Scheduled email jobs                             |
| `reviews`          | User testimonials                                |
| `feedback`         | User feedback                                    |

### Recommended Indexes

```javascript
// Run in MongoDB shell for optimal performance
db.quotes.createIndex({ category_id: 1 });
db.user_quotes.createIndex({ is_public: 1, category_id: 1 });
db.user_quotes.createIndex({ user_id: 1 });
db.user_likes.createIndex({ user_id: 1, quote_id: 1 });
db.user_likes.createIndex({ quote_id: 1 });
db.user_saved.createIndex({ user_id: 1, quote_id: 1 });
db.user_dislikes.createIndex({ quote_id: 1 });
db.categories.createIndex({ name: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

---

## 🔑 API Endpoints

### Authentication

```
POST /api/auth/register        - Register new user
POST /api/auth/login           - Login user
POST /api/auth/google          - Google OAuth login
GET  /api/auth/me              - Get current user
POST /api/auth/logout          - Logout user
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password  - Reset password with token
POST /api/auth/update-password - Update password (logged in)
```

### Quotes

```
GET  /api/quotes               - Get quotes (with filtering)
GET  /api/quotes/[id]          - Get single quote by ID
GET  /api/categories           - Get all categories
```

### User Actions

```
POST /api/user/likes           - Like a quote
GET  /api/user/likes           - Get liked quotes
DELETE /api/user/likes         - Unlike a quote
POST /api/user/dislikes        - Dislike a quote
GET  /api/user/dislikes        - Get disliked quotes
POST /api/user/saved           - Save a quote
GET  /api/user/saved           - Get saved quotes
DELETE /api/user/saved         - Unsave a quote
```

### User Quotes

```
GET  /api/user/quotes          - Get user's quotes
POST /api/user/quotes          - Create new quote
PUT  /api/user/quotes/[id]     - Update quote
DELETE /api/user/quotes/[id]   - Delete quote
```

### Preferences

```
GET  /api/user/all-preferences - Get all preferences (combined)
POST /api/user/all-preferences - Save all preferences
POST /api/user/upload-background - Upload custom background
DELETE /api/user/upload-background - Delete custom background
```

### Other

```
POST /api/translate            - Translate text
POST /api/feedback             - Submit feedback
GET  /api/reviews              - Get testimonials
POST /api/track                - Track visitor
GET  /api/stats                - Get statistics
```

---

## 🎨 Card Customization

Users can customize their quote cards with:

### Themes

- Minimal Light/Dark
- Sunset Glow
- Ocean Deep
- Forest Calm
- Royal Purple
- Rose Gold
- Midnight Blue
- And more...

### Fonts

- Default (Space Grotesk)
- Classic (Merriweather)
- Modern (Poppins)
- Elegant (Playfair Display)
- Bold (Bebas Neue)
- Handwritten (Dancing Script)
- Minimal (Quicksand)
- Retro (Lobster)

### Backgrounds

- Solid colors
- Gradients
- Preset images
- Custom uploads (up to 20 images)

### Download Quality

- **2K Resolution**: 1920×2400 pixels
- **Format**: PNG
- **Position Control**: Adjust quote position with slider

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

### MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user with password
4. Whitelist IP addresses (or use `0.0.0.0/0` for all)
5. Get connection string and add to `MONGODB_URI`

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Gmail
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new App Password for "Mail"
4. Use this password in `EMAIL_PASSWORD`

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
# ... other variables
```

### Self-Hosted

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 🛡️ Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ HTTP-only cookies
- ✅ CSRF protection
- ✅ NoSQL injection prevention
- ✅ XSS protection
- ✅ Optimistic UI updates (no data exposure)
- ✅ GDPR cookie consent

---

## 📱 Pages

| Route               | Description                       |
| ------------------- | --------------------------------- |
| `/`                 | Home - Swipe quotes               |
| `/quote/[id]`       | Single quote view (SEO optimized) |
| `/user-quote/[id]`  | User quote view (SEO optimized)   |
| `/about`            | About us                          |
| `/contact`          | Contact form                      |
| `/feedback`         | Feedback form                     |
| `/review`           | Submit review                     |
| `/privacy-policy`   | Privacy policy                    |
| `/terms-of-service` | Terms of service                  |
| `/cookie-policy`    | Cookie policy                     |
| `/reset-password`   | Password reset                    |
| `/admin`            | Admin dashboard                   |

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: MongoServerError: bad auth
```

**Solution:** Check `MONGODB_URI` credentials and whitelist your IP in Atlas

### Google OAuth Not Working

```
Error: origin_mismatch
```

**Solution:** Add your domain to Authorized JavaScript origins in Google Console (no trailing slash, no whitespace)

### Emails Not Sending

```
Error: Authentication failed
```

**Solution:** Use Gmail App Password, not your regular password

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

---

## 📊 Performance Optimizations

- **Optimistic UI**: Instant feedback for like/dislike/save actions
- **Combined API calls**: Single request for all user preferences
- **Parallel execution**: Database queries run in parallel where possible
- **In-memory caching**: Quote and user data caching with TTL
- **Client-side compression**: Images compressed before upload
- **Debounced search**: Smooth search experience in collections

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
