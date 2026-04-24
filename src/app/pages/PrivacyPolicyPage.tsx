import { useEffect } from 'react';
import { Link } from 'react-router';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import type { PrivacyBlock, PrivacySection, PrivacySubsection } from '../config/privacy-policy-page.en';
import { PRIVACY_POLICY_PAGE_EN } from '../config/privacy-policy-page.en';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';

function PrivacyBlockView({ block }: { block: PrivacyBlock }) {
  if (block.type === 'list') {
    return (
      <ul className="ds-pattern-legal-doc-list">
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === 'table') {
    return (
      <div className="ds-pattern-legal-doc-table-wrap">
        <table className="ds-pattern-legal-doc-table">
          <thead>
            <tr>
              {block.headers.map((header, index) => (
                <th key={index} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p className="ds-pattern-legal-doc-section-body">{block.text}</p>;
}

function PrivacySubsectionView({ subsection }: { subsection: PrivacySubsection }) {
  return (
    <div>
      <h3 id={subsection.id} className="ds-pattern-legal-doc-subsection-title">
        {subsection.title}
      </h3>
      {subsection.blocks.map((block, index) => (
        <PrivacyBlockView key={index} block={block} />
      ))}
    </div>
  );
}

function PrivacySectionView({ section }: { section: PrivacySection }) {
  return (
    <section id={section.id} className="ds-pattern-legal-doc-section" aria-labelledby={`${section.id}-heading`}>
      <h2 id={`${section.id}-heading`} className="ds-pattern-legal-doc-section-title">
        {section.title}
      </h2>
      {section.blocks?.map((block, index) => (
        <PrivacyBlockView key={index} block={block} />
      ))}
      {section.subsections?.map(sub => (
        <PrivacySubsectionView key={sub.id} subsection={sub} />
      ))}
    </section>
  );
}

export function PrivacyPolicyPage() {
  const { documentTitle, htmlLang, titlePrimary, titleSecondary, lastUpdatedLabel, lastUpdatedValue, backToLogin, sections } =
    PRIVACY_POLICY_PAGE_EN;

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
            <PrivacySectionView key={section.id} section={section} />
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
