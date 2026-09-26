# Srotrix Health 🏥
> **"Connecting Care. Saving Lives."**

Srotrix is an AI-powered emergency healthcare platform developed by **Srotrix Technologies** that provides real-time hospital bed availability, ICU bed tracking, ambulance coordination, emergency routing, and hospital status updates. The platform connects patients, hospitals, ambulances, and healthcare providers to reduce treatment delays and improve emergency response.

## 🌟 Key Features
- **Landing Page Hero Panel**: Real-time bed availability search, primary navigation trigger, and hospital administrator sign-in.
- **Continuous Live GPS Navigation (Follow GPS)**: Uses `navigator.geolocation.watchPosition` to track and follow your physical coordinates in real-time.
- **Dynamic India Pre-seeding**: Prominent medical landmarks in Lucknow, UP (*SGPGI*, *KGMU*, *Medanta*, *RML*, *Sahara*) pre-seeded natively.
- **Google Maps Layer Selector**: Switch map tiles on-the-fly between standard OpenStreetMap, Google Roadmap, and Google Satellite views.
- **Hospital Admin Dashboard Features**:
  - Live Hospital Bed Status
  - ICU & Emergency Bed Management
  - Ambulance Tracking & Corner Grid Routing
  - Emergency Requests and alarms
  - Hospital Profile updates
  - **Srotrix AI Healthcare Insights** (Demand forecasting and routing optimizations)
- **Multilingual Support**: Fully localized in English (EN) and Hindi (HI).

## 🛠️ Technology Stack
- **Frontend**: React + Vite (Vanilla JS)
- **Styling**: Zinc glassmorphism CSS custom properties
- **Mapping**: Leaflet.js mapped on Google Map tile API
- **Icons**: Lucide React

## 🚀 Getting Started

1. **Set Node Environment PATH**:
   ```zsh
   export PATH="/Users/srotrai/.gemini/antigravity/scratch/node-env/bin:$PATH"
   ```
2. **Install Dependencies**:
   ```zsh
   npm install
   ```
3. **Start Development Server**:
   ```zsh
   npm run dev
   ```
4. **Compile Production Bundle**:
   ```zsh
   npm run build
   ```
