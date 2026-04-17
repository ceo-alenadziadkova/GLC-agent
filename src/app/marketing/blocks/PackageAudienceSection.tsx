type AudienceCard = {
  situation: string;
  happening_now: string;
  best_fit: string;
};

export function PackageAudienceSection({
  title,
  cards,
}: {
  title: string;
  cards: AudienceCard[];
}) {
  return (
    <section
      className="glc-info-glass-surface -mx-4 mt-8 px-4 py-10 sm:-mx-6 sm:mt-10 sm:px-6 sm:py-12"
      aria-label={title}
    >
      <h2 className="font-display text-xl font-bold sm:text-2xl ds-text-primary" >
        {title}
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {cards.map(card => (
          <article
            key={card.situation}
            className="rounded-[var(--radius-xl)] border p-4"
            style={{
              borderColor: 'color-mix(in oklab, var(--glc-blue) 22%, var(--border-subtle))',
              background: 'linear-gradient(160deg, color-mix(in oklab, var(--bg-surface) 94%, var(--glc-blue-muted)) 0%, var(--bg-surface) 100%)',
            }}
          >
            <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-[0.12em] ds-text-tertiary" >
              Situation
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed ds-text-primary" >
              {card.situation}
            </p>
            <p className="mt-3 text-[length:var(--text-2xs)] font-semibold uppercase tracking-[0.12em] ds-text-tertiary" >
              What is happening now
            </p>
            <p className="mt-1 text-sm leading-relaxed ds-text-secondary" >
              {card.happening_now}
            </p>
            <p className="ds-text-brand-deeper mt-3 text-xs font-semibold">
              {card.best_fit}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
