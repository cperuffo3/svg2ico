import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type GradientVariant = 'primary' | 'success' | 'purple';

interface FeatureCardProps {
  icon: IconDefinition;
  title: string;
  description: string;
  gradient: GradientVariant;
}

const gradientClasses: Record<GradientVariant, string> = {
  primary: 'from-gradient-primary-from to-gradient-primary-to',
  success: 'from-gradient-success-from to-gradient-success-to',
  purple: 'from-gradient-purple-from to-gradient-purple-to',
};

export function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${gradientClasses[gradient]}`}
      >
        <FontAwesomeIcon icon={icon} className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="max-w-[288px] text-center text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}
