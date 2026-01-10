import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type GradientVariant = 'primary' | 'success' | 'accent';

interface FeatureCardProps {
  icon: IconDefinition;
  title: string;
  description: string;
  gradient: GradientVariant;
}

const gradientClasses: Record<GradientVariant, string> = {
  primary: 'from-gradient-primary-from to-gradient-primary-to',
  success: 'from-gradient-success-from to-gradient-success-to',
  accent: 'from-gradient-accent-from to-gradient-accent-to',
};

export function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br shadow-lg ${gradientClasses[gradient]}`}
      >
        <FontAwesomeIcon icon={icon} className="text-white text-2xl" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-[288px] text-center text-sm leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
