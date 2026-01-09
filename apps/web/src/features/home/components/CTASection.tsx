import { Button } from '@/components/ui/button';

interface CTASectionProps {
  onGetStarted?: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  const handleClick = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="flex w-full max-w-4xl flex-col items-center gap-4 overflow-hidden rounded-2xl bg-linear-to-r from-gradient-primary-from to-gradient-primary-to p-12 shadow-2xl">
      <h2 className="text-center text-3xl font-bold text-white">Ready to Convert Your Icons?</h2>
      <p className="pb-4 text-center text-lg text-white/90">
        Fast, secure, and completely free. No sign-up required.
      </p>
      <Button
        onClick={handleClick}
        className="h-auto rounded-lg bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-lg hover:bg-gray-50"
      >
        Get Started Now
      </Button>
    </section>
  );
}
