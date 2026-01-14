import { faBolt, faShieldHalved, faStar } from '@fortawesome/free-solid-svg-icons';
import { FeatureCard } from './FeatureCard';

const features = [
  {
    icon: faShieldHalved,
    title: '100% Private',
    description: 'Your files are processed in-memory only. We never store or access your data.',
    gradient: 'primary' as const,
  },
  {
    icon: faBolt,
    title: 'Lightning Fast',
    description: 'Rust-powered conversion engine delivers results in under 5 seconds.',
    gradient: 'success' as const,
  },
  {
    icon: faStar,
    title: 'High Quality',
    description: 'Multi-resolution output optimized for Windows and macOS platforms.',
    gradient: 'accent' as const,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="flex w-full max-w-5xl flex-col items-center gap-6 pt-4">
      <h2 className="text-2xl font-bold text-foreground">Why Choose svg2ico?</h2>
      <div className="flex w-full justify-center gap-8">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
