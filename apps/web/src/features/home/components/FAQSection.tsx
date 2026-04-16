import { faqs } from './faqData';

export function FAQSection() {
  return (
    <section id="faq" className="flex w-full max-w-3xl flex-col items-center gap-12 py-8">
      <h2 className="text-center text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
      <div className="flex w-full flex-col gap-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6"
          >
            <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
            <p className="text-sm leading-5 text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
