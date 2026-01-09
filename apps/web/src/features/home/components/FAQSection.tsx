const faqs = [
  {
    question: 'Is my SVG file stored on your servers?',
    answer:
      'No. All conversion happens in-memory only. Your files are processed and immediately deleted—we never store any uploaded content.',
  },
  {
    question: "What's the maximum file size?",
    answer:
      'You can upload SVG files up to 10MB. This is sufficient for even the most complex vector graphics.',
  },
  {
    question: 'Can I convert multiple files at once?',
    answer:
      'Batch conversion is planned for a future update. Currently, you can convert one file at a time.',
  },
  {
    question: 'Do you support PNG or JPEG input?',
    answer:
      'Not yet. Phase 2 will add support for PNG and JPEG inputs. Currently, we only accept SVG files.',
  },
  {
    question: 'How long does conversion take?',
    answer:
      'Most conversions complete in under 5 seconds thanks to our Rust-powered conversion engine.',
  },
];

export function FAQSection() {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-12 py-8">
      <h2 className="text-center text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
      <div className="flex w-full flex-col gap-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
            <p className="text-sm leading-5 text-slate-500">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
