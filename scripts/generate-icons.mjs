import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  console.log('🎨 Generating icons for QuoteSwipe...\n');

  const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

  // Generate essential sizes only
  const sizes = [
    { name: 'icon-16.png', size: 16 },      // Tiny favicon
    { name: 'icon-32.png', size: 32 },      // Standard favicon
    { name: 'icon-192.png', size: 192 },    // Android/PWA
    { name: 'icon-512.png', size: 512 },    // PWA splash
    { name: 'apple-touch-icon.png', size: 180 }, // iOS
  ];

  for (const { name, size } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate favicon.ico (32x32 PNG renamed)
  try {
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(join(publicDir, 'favicon-32.png'));
    
    // For proper .ico, we'll just use the PNG as favicon
    // Modern browsers support PNG favicons
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(join(publicDir, 'favicon.png'));
    
    console.log('✅ Generated favicon.png (32x32)');
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error.message);
  }

  // Generate OG image (1200x630) - social media preview
  try {
    // Create a wider version for OG image
    const ogSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e1b4b"/>
            <stop offset="50%" style="stop-color:#312e81"/>
            <stop offset="100%" style="stop-color:#4c1d95"/>
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6"/>
            <stop offset="50%" style="stop-color:#8B5CF6"/>
            <stop offset="100%" style="stop-color:#EC4899"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bgGrad)"/>
        
        <!-- Decorative quote marks -->
        <text x="50" y="200" font-family="Georgia, serif" font-size="300" fill="white" opacity="0.03">"</text>
        <text x="900" y="500" font-family="Georgia, serif" font-size="200" fill="white" opacity="0.03">"</text>
        
        <!-- Logo circle -->
        <circle cx="200" cy="315" r="120" fill="url(#cardGrad)"/>
        <circle cx="200" cy="315" r="105" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
        
        <!-- Card on logo -->
        <g transform="translate(140, 250)">
          <rect x="0" y="0" width="120" height="130" rx="16" fill="white"/>
          <text x="12" y="50" font-family="Georgia, serif" font-size="50" font-weight="bold" fill="url(#cardGrad)">"</text>
          <rect x="60" y="25" width="45" height="8" rx="4" fill="url(#cardGrad)"/>
          <rect x="60" y="40" width="35" height="8" rx="4" fill="#A78BFA" opacity="0.7"/>
          <rect x="20" y="85" width="80" height="6" rx="3" fill="#9CA3AF"/>
          <rect x="20" y="96" width="55" height="6" rx="3" fill="#D1D5DB"/>
        </g>
        
        <!-- Text -->
        <text x="380" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="bold" fill="white">QuoteSwipe</text>
        <text x="380" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="32" fill="white" opacity="0.8">Discover Inspirational Quotes Daily</text>
        <text x="380" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" opacity="0.6">Swipe • Save • Share • Get Inspired</text>
        
        <!-- Stats -->
        <g transform="translate(380, 480)">
          <rect x="0" y="0" width="140" height="60" rx="12" fill="white" opacity="0.1"/>
          <text x="70" y="28" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">12K+</text>
          <text x="70" y="48" font-family="system-ui, sans-serif" font-size="14" fill="white" opacity="0.7" text-anchor="middle">Quotes</text>
          
          <rect x="160" y="0" width="140" height="60" rx="12" fill="white" opacity="0.1"/>
          <text x="230" y="28" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">300+</text>
          <text x="230" y="48" font-family="system-ui, sans-serif" font-size="14" fill="white" opacity="0.7" text-anchor="middle">Categories</text>
          
          <rect x="320" y="0" width="140" height="60" rx="12" fill="white" opacity="0.1"/>
          <text x="390" y="28" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">Free</text>
          <text x="390" y="48" font-family="system-ui, sans-serif" font-size="14" fill="white" opacity="0.7" text-anchor="middle">Forever</text>
        </g>
        
        <!-- Sparkles -->
        <circle cx="1100" cy="100" r="4" fill="white" opacity="0.5"/>
        <circle cx="1050" cy="180" r="3" fill="white" opacity="0.4"/>
        <circle cx="100" cy="550" r="5" fill="white" opacity="0.3"/>
      </svg>
    `;

    await sharp(Buffer.from(ogSvg))
      .resize(1200, 630)
      .png()
      .toFile(join(publicDir, 'og-image.png'));
    
    console.log('✅ Generated og-image.png (1200x630)');
  } catch (error) {
    console.error('❌ Failed to generate OG image:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\nGenerated files in /public:');
  console.log('  - icon-16.png to icon-512.png (various sizes)');
  console.log('  - apple-touch-icon.png (180x180)');
  console.log('  - favicon.png (32x32)');
  console.log('  - og-image.png (1200x630)');
}

generateIcons().catch(console.error);
