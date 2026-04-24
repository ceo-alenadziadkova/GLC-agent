import { useEffect } from 'react';
import { Link } from 'react-router';
import { LEGAL_NOTICE_PAGE_ES } from '../config/legal-notice-page.es';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';

export function LegalNoticePage() {
  const { htmlLang, documentTitle, titlePrimary, titleSecondary, backToHome, sections } = LEGAL_NOTICE_PAGE_ES;

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
          {sections.map(section => (
            <section key={section.id} id={section.id} className="ds-pattern-legal-doc-section" aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`} className="ds-pattern-legal-doc-section-title">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className="ds-pattern-legal-doc-section-body">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <p className="ds-pattern-legal-doc-footer">
            <Link to={APP_ROUTE_PATHS.home} className="ds-marketing-inline-link-accent">
              {backToHome}
            </Link>
          </p>
        </article>
      </MarketingSection>
    </MarketingLayout>
  );
}
