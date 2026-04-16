import { SEOHead, StructuredData } from '@/components/common';
import {
  CTASection,
  FAQSection,
  FeaturesSection,
  FileUploadZone,
  Footer,
  Header,
  HeroSection,
  HowItWorksSection,
  OutputFormatsSection,
  faqs,
  steps,
} from '../components';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Convert SVG to ICO',
  description:
    'Convert SVG or PNG files to ICO and ICNS icon formats in 4 simple steps using svg2ico.',
  step: steps.map((step) => ({
    '@type': 'HowToStep',
    position: step.number,
    name: step.title,
    text: step.description,
  })),
};

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="svg2ico - Free SVG to ICO & ICNS Converter | Favicon Generator"
        description="Convert SVG and PNG files to ICO and ICNS formats instantly. Free online tool with 100% privacy - files processed in-memory only, never stored. Perfect for favicons, Windows icons, and macOS app icons."
        path="/"
      />
      <StructuredData data={faqSchema} />
      <StructuredData data={howToSchema} />
      <Header />
      <main className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 py-12">
        <HeroSection />
        <FeaturesSection />
        <FileUploadZone />
        <OutputFormatsSection />
        <HowItWorksSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
