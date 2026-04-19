import { useEffect } from 'react';
import { Link } from 'react-router';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import type { TermsBlock, TermsSection, TermsSubsection } from '../config/terms-of-service-page.en';
import { TERMS_OF_SERVICE_PAGE_EN } from '../config/terms-of-service-page.en';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';

function TermsBlockView({ block }: { block: TermsBlock }) {
  if (block.type === 'list') {
    return (
      <ul className="ds-pattern-legal-doc-list">
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="ds-pattern-legal-doc-section-body">{block.text}</p>;
}

function TermsSubsectionView({ subsection }: { subsection: TermsSubsection }) {
  return (
    <div>
      <h3 id={subsection.id} className="ds-pattern-legal-doc-subsection-title">
        {subsection.title}
      </h3>
      {subsection.blocks.map((block, index) => (
        <TermsBlockView key={index} block={block} />
      ))}
    </div>
  );
}

function TermsSectionView({ section }: { section: TermsSection }) {
  return (
    <section id={section.id} className="ds-pattern-legal-doc-section" aria-labelledby={`${section.id}-heading`}>
      <h2 id={`${section.id}-heading`} className="ds-pattern-legal-doc-section-title">
        {section.title}
      </h2>
      {section.blocks?.map((block, index) => (
        <TermsBlockView key={index} block={block} />
      ))}
      {section.subsections?.map(sub => (
        <TermsSubsectionView key={sub.id} subsection={sub} />
      ))}
    </section>
  );
}

export function TermsOfServicePage() {
  const { documentTitle, htmlLang, titlePrimary, titleSecondary, lastUpdatedLabel, lastUpdatedValue, backToLogin, sections } =
    TERMS_OF_SERVICE_PAGE_EN;

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <MarketingLayout>
      <MarketingSection>
        <article lang={htmlLang} className="ds-pattern-legal-doc-container">
          <h1 className="ds-pattern-legal-doc-title ds-text-primary">
            {titlePrimary}
            <span className="ds-pattern-legal-doc-title-sub">{titleSecondary}</span>
          </h1>
          <p className="ds-pattern-legal-doc-meta">
            {lastUpdatedLabel}: {lastUpdatedValue}
          </p>
          {sections.map(section => (
            <TermsSectionView key={section.id} section={section} />
          ))}
          <p className="ds-pattern-legal-doc-footer">
            <Link to={APP_ROUTE_PATHS.login} className="ds-marketing-inline-link-accent">
              {backToLogin}
            </Link>
          </p>
        </article>
      </MarketingSection>
    </MarketingLayout>
  );
}
