import { faApple, faWindows } from '@fortawesome/free-brands-svg-icons';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const formats = [
  {
    icon: faWindows,
    iconColor: 'text-primary',
    title: '.ICO Format',
    description: 'Windows icon format with multi-resolution support',
    features: [
      '16x16, 32x32, 48x48, 256x256',
      'Perfect for Windows apps & websites',
      'High-DPI display support',
    ],
  },
  {
    icon: faApple,
    iconColor: 'text-foreground',
    title: '.ICNS Format',
    description: 'macOS icon format with complete resolution set',
    features: [
      '16x16 through 512x512 @1x and @2x',
      'Perfect for macOS apps',
      'Retina display optimized',
    ],
  },
];

export function OutputFormatsSection() {
  return (
    <section className="flex w-full max-w-4xl flex-col items-center gap-8 rounded-2xl border border-section-primary-border bg-linear-to-b from-section-primary-from to-section-primary-to px-8 pb-8 pt-16">
      <h2 className="text-center text-2xl font-bold text-foreground">Supported Output Formats</h2>
      <div className="flex w-full justify-center gap-8">
        {formats.map((format) => (
          <div
            key={format.title}
            className="flex flex-1 flex-col gap-4 rounded-xl bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={format.icon} className={`h-7 w-7 ${format.iconColor}`} />
              <span className="text-xl font-bold text-foreground">{format.title}</span>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">{format.description}</p>
            <div className="flex flex-col gap-2">
              {format.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-success" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
