# Krunchy Kravings 🍬

**Krunchy Kravings** is a modern e-commerce web application for ordering gourmet freeze-dried and specialty treat packages with a frictionless WhatsApp checkout flow.

---

## 🌟 Key Features

- **📱 Frictionless WhatsApp Checkout**:
  - Customers select product sizes and quantities into their cart.
  - Cart drawer automatically calculates the item subtotals, standard shipping fee ($10.99), and grand total.
  - Generates a pre-formatted WhatsApp order message directed to the merchant's WhatsApp number with full customer delivery details.

- **🛍️ Product Showcase & Size Selector**:
  - Multiple package tiers with real product imagery, weight/size indicators, and quality highlights.
  - Instant add-to-cart with interactive feedback.
  - Real-time stock status (in-stock / sold out).

- **📊 Built-in Merchant Admin Panel**:
  - Accessible via the **Admin** link in the footer.
  - Update store name, brand logo, headline, and subtext.
  - Configure the merchant WhatsApp phone number (with automatic country code validation).
  - Customize standard shipping fees.
  - Complete product catalog management: add new package sizes, edit prices, toggle sold-out status, or upload custom imagery.

- **🎨 Tailored Visual Identity & Theme Mode**:
  - Styled with a dark plum/purple aesthetic (`#1a1022`, `#25172f`, `#c77bf0`, `#ee7ee0`, `#25b866`).
  - Seamless Dark/Light mode toggle.
  - Custom brand typography using Google Fonts (`Bagel Fat One` & `Fredoka`).

- **💾 Client-side Persistence**:
  - Cart contents and merchant catalog customizations persist reliably in `localStorage`.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animation**: [Motion](https://motion.dev/)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Configure your environment secrets in `.env`:
```env
# Optional WhatsApp number secret (digits only or international format)
Whatsappnumber="8293252829"
```

### 4. Development Server
Start the local development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 5. Production Build
Compile and bundle the production build:
```bash
npm run build
```

---

## 📦 Project Structure

```
├── public/                 # Static assets and icons
├── src/
│   ├── components/
│   │   ├── AdminModal.tsx  # Merchant admin dashboard modal
│   │   ├── CartDrawer.tsx  # Slide-over cart & WhatsApp checkout
│   │   ├── Footer.tsx      # Footer with shipping notice & admin link
│   │   ├── Header.tsx      # Navigation header with logo & cart counter
│   │   ├── Hero.tsx        # Hero banner & value propositions
│   │   └── ProductGrid.tsx # Package size cards & add-to-cart buttons
│   ├── data/
│   │   └── initialData.ts  # Default catalog and store configuration
│   ├── utils/
│   │   └── format.ts       # Price formatting & WhatsApp message generator
│   ├── types.ts            # TypeScript interfaces and data models
│   ├── App.tsx             # Main application component & state management
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global Tailwind CSS and typography tokens
├── index.html              # HTML entry point with metadata and fonts
├── metadata.json           # AI Studio app metadata
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

---

## 📄 License
This project is licensed under the Apache-2.0 License.
