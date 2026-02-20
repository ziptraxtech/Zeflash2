# Zeflash2.0 Landing Page

A modern, responsive landing page for Zeflash2.0 - Rapid AI Diagnostics & Power for EV batteries.

## 🚀 Features

- **Responsive Design**: Optimized for all device sizes
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Performance**: Fast loading with Vite build system
- **Accessibility**: ARIA-compliant and screen reader friendly
- **SEO Ready**: Proper meta tags and semantic HTML

## 🛠️ Tech Stack

- **React 18** - UI Library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **React Router** - Navigation

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd zeflash
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## 🌐 Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically detect the settings and deploy

Or use Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

#### AI Health Report endpoint

To enable the "Get AI Health Report" button on Vercel, point the frontend directly to your Python-capable AWS Lambda:

```
VITE_AI_REPORT_URL=https://your-api-gateway-url.example.com/prod/generate-report
```

Set this as a Vercel Project Environment Variable (Production + Preview). If unset, the app falls back to calling `/api/generate-report` on the same host.

### Option 2: Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Netlify will use the `netlify.toml` configuration

Or drag and drop the `dist` folder to Netlify:
```bash
npm run build
# Then drag the 'dist' folder to Netlify
```

### Option 3: Static Hosting

After running `npm run build`, deploy the `dist` folder to any static hosting service:
- GitHub Pages
- Firebase Hosting
- AWS S3
- CloudFlare Pages

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
zeflash/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   └── ZeflashLanding.tsx
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── dist/               # Built files (generated)
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite configuration
```

## 🎨 Customization

### Colors
The landing page uses a blue and cyan color scheme. To customize:
1. Edit the Tailwind classes in `src/components/ZeflashLanding.tsx`
2. Or extend the theme in `tailwind.config.js`

### Content
All content can be modified in `src/components/ZeflashLanding.tsx`:
- Hero section
- Feature descriptions
- Contact information
- Company details

### Styling
- Global styles: `src/index.css`
- Component styles: Inline Tailwind classes
- Custom components: Add to `src/components/`

## 📱 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Progressive Web App ready

## 📈 Performance

- Lighthouse score: 95+ (Performance)
- Core Web Vitals optimized
- Image optimization
- Code splitting

## 🔒 Security

- No sensitive data exposed
- CSP headers ready
- HTTPS enforced in production

## 📞 Support

For questions or issues, contact [your-email@domain.com]

---

Built with ❤️ for Zeflash by Ziptrax Tech