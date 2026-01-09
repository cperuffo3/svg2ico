const steps = [
  {
    number: 1,
    title: 'Upload SVG',
    description: 'Drag & drop or browse for your SVG file',
  },
  {
    number: 2,
    title: 'Customize',
    description: 'Adjust scale, padding, and background',
  },
  {
    number: 3,
    title: 'Convert',
    description: 'Choose .ico, .icns, or both formats',
  },
  {
    number: 4,
    title: 'Download',
    description: 'Get your converted icon files instantly',
  },
];

export function HowItWorksSection() {
  return (
    <section className="flex w-full max-w-4xl flex-col items-center gap-12 pt-8">
      <h2 className="text-center text-3xl font-bold text-foreground">How It Works</h2>
      <div className="flex w-full justify-center gap-8">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-1 flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <span className="text-xl font-bold text-primary-foreground">{step.number}</span>
            </div>
            <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
            <p className="max-w-48 text-center text-sm leading-5 text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
