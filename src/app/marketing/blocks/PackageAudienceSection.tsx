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
      className="mx-auto mt-8 max-w-[var(--marketing-max-w-content)] px-4 py-10 sm:mt-10 sm:px-6 sm:py-12"
      aria-label={title}
    >
      <h2 className="text-center font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
        {title}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map(card => (
          <article
            key={card.situation}
            className="ds-marketing-audience-card p-6"
          >
            <p className="text-[length:var(--text-2xs)] font-semibold uppercase text-[var(--text-primary)]/50">
              Situation
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
              {card.situation}
            </p>
            <p className="mt-5 text-[length:var(--text-2xs)] font-semibold uppercase text-[var(--text-primary)]/50">
              What is happening now
            </p>
            <p className="ds-marketing-text-muted mt-2 text-sm leading-relaxed">
              {card.happening_now}
            </p>
            <p className="mt-5 text-xs font-semibold text-[var(--glc-blue)]">
              {card.best_fit}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
