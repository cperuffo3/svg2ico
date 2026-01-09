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
} from '../components';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
