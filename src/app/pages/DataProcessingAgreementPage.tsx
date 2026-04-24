import { useEffect } from 'react';
import { Link } from 'react-router';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import type { DpaBlock, DpaSection } from '../config/dpa-page.en';
import { DPA_PAGE_EN } from '../config/dpa-page.en';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';

function DpaBlockView({ block }: { block: DpaBlock }) {
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

function DpaSectionView({ section }: { section: DpaSection }) {
  const hasTitle = Boolean(section.title?.trim());
  if (!hasTitle) {
    return (
      <div className="ds-pattern-legal-doc-preamble">
        {section.blocks.map((block, index) => (
          <DpaBlockView key={index} block={block} />
        ))}
      </div>
    );
  }
  return (
    <section id={section.id} className="ds-pattern-legal-doc-section" aria-labelledby={`${section.id}-heading`}>
      <h2 id={`${section.id}-heading`} className="ds-pattern-legal-doc-section-title">
        {section.title}
      </h2>
      {section.blocks.map((block, index) => (
        <DpaBlockView key={index} block={block} />
      ))}
    </section>
  );
}

export function DataProcessingAgreementPage() {
  const {
    documentTitle,
    htmlLang,
    titlePrimary,
    titleSecondary,
    lastUpdatedLabel,
    lastUpdatedValue,
    backToLogin,
    footerPrivacyLinkLabel,
    footerLinkSeparator,
    sections,
  } = DPA_PAGE_EN;

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
            <DpaSectionView key={section.id} section={section} />
          ))}
          <p className="ds-pattern-legal-doc-footer">
            <Link to={APP_ROUTE_PATHS.legalPrivacy} className="ds-marketing-inline-link-accent">
              {footerPrivacyLinkLabel}
            </Link>
            {footerLinkSeparator}
            <Link to={APP_ROUTE_PATHS.login} className="ds-marketing-inline-link-accent">
              {backToLogin}
            </Link>
          </p>
        </article>
      </MarketingSection>
    </MarketingLayout>
  );
}
