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
    gradient: 'purple' as const,
  },
];

export function FeaturesSection() {
  return (
    <section className="flex w-full max-w-5xl justify-center gap-8 pt-4">
      {features.map((feature) => (
        <FeatureCard key={feature.title} {...feature} />
      ))}
    </section>
  );
}
