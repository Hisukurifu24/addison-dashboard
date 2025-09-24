# Addison Care Dashboard v3.0

A sophisticated medical dashboard for managing Addison's disease treatment with advanced features including OCR for lab result processing and intelligent dosing algorithms.

## Features

- 📊 **Patient Records Management**: Track sodium, potassium, ACTH, cortisol, and renin levels
- 🔍 **OCR Lab Processing**: Upload lab images and automatically extract values using Tesseract.js
- 🧠 **Smart Dosing Algorithm**: AddiDose++ algorithm for glucocorticoid and mineralocorticoid recommendations
- 📈 **Blood Pressure Monitoring**: Track supine and orthostatic blood pressure
- 💊 **Medication Management**: Intelligent Florinef (fludrocortisone) dosing recommendations
- 🎨 **Modern UI**: Built with Next.js, Tailwind CSS, and Framer Motion

## Technologies Used

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Animations**: Framer Motion
- **OCR**: Tesseract.js for Italian text recognition
- **Build Tool**: Next.js with TypeScript support

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Medical Algorithm

The dashboard implements the **AddiDose++** algorithm which considers:

### Glucocorticoids
- Baseline: 37.5mg hydrocortisone equivalent (3/4 + 1/2 + 1/4 tablets)
- Hyponatremia/Hyperkalemia: Increase to 43.75mg
- Elevated cortisol: Decrease to 31.25mg

### Mineralocorticoids (Florinef)
- Baseline: 0.1mg fludrocortisone
- Low sodium or high renin: Increase to 0.125mg
- Low potassium, low renin, or hypertension: Decrease to 0.075mg

## Project Structure

```
addison-dashboard/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/ui/
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── tabs.tsx
├── lib/
│   └── utils.ts
└── package.json
```

## Contributing

This is a medical application. Please ensure any contributions are reviewed by qualified medical professionals.

## License

This project is for educational and research purposes. Not intended for direct clinical use without proper validation.