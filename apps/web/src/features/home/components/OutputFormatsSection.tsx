import { faApple, faWindows } from '@fortawesome/free-brands-svg-icons';
import { faCheck, faImage, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
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
  {
    icon: faImage,
    iconColor: 'text-primary',
    title: '.PNG Format',
    description: 'High-quality PNG export with flexible options',
    features: ['Custom sizes from 16x16 to 1024x1024', 'Configurable DPI, color space & bit depth'],
  },
];

export function OutputFormatsSection() {
  return (
    <section className="flex w-full max-w-6xl flex-col items-center gap-8 rounded-2xl border border-section-primary-border bg-linear-to-b from-section-primary-from to-section-primary-to px-8 pb-8 pt-8">
      <h2 className="text-center text-3xl font-bold text-foreground">Supported Output Formats</h2>
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

      {/* Background Removal Feature Card */}
      <div className="flex w-full flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">Intelligent Background Removal</span>
        </div>
        <p className="text-sm leading-5 text-muted-foreground">
          Automatically detect and remove backgrounds from PNG images with smart edge detection and
          transparency preservation.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-success" />
            <span className="text-sm text-muted-foreground">Locally-Processed edge detection</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-success" />
            <span className="text-sm text-muted-foreground">Preserves fine details</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-success" />
            <span className="text-sm text-muted-foreground">Clean transparent output</span>
          </div>
        </div>
      </div>
    </section>
  );
}
