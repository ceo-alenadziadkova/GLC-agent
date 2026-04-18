import type { FreeSnapshotPreview } from '../../data/auditTypes';
import { SnapshotAccessBlockedCallout } from '../snapshot/SnapshotAccessBlockedCallout';
import { SnapshotCategoryBreakdownList } from '../snapshot/SnapshotScoreKit';
import { buildPortalSnapshotMirrorViewModel } from './model/build-portal-snapshot-mirror-view-model';
import { MirrorAccountNoticeSection } from './sections/MirrorAccountNoticeSection';
import { MirrorCoverageAndLimitationsSection } from './sections/MirrorCoverageAndLimitationsSection';
import { MirrorHomepageSnippetSection } from './sections/MirrorHomepageSnippetSection';
import { MirrorInsightsSection } from './sections/MirrorInsightsSection';
import { MirrorRecommendationsSection } from './sections/MirrorRecommendationsSection';
import { MirrorScoreSection } from './sections/MirrorScoreSection';
import { MirrorSignalsSection } from './sections/MirrorSignalsSection';
import { MirrorSiteReadSection } from './sections/MirrorSiteReadSection';
import { MirrorStatusHeaderSection } from './sections/MirrorStatusHeaderSection';

export function PortalSnapshotAccountMirror({ result }: { result: FreeSnapshotPreview }) {
  const vm = buildPortalSnapshotMirrorViewModel(result);
  return (
    <div className="space-y-4">
      <MirrorAccountNoticeSection />
      <MirrorStatusHeaderSection access={vm.access} hostname={vm.hostname} location={result.location} />

      <SnapshotAccessBlockedCallout
        robotsBlocked={vm.access.robotsBlocked}
        noHtmlSample={vm.access.noPages}
        robotsLimitedSample={vm.access.robotsLimitedSample}
        robotsFallbackSiteClass={vm.access.robotsFallbackSiteClass}
        robotsHeadHttpStatus={result.scan_coverage?.robots_head_probe?.status}
        limitations={vm.calloutLimitations}
      />

      {result.homepage_snippet ? <MirrorHomepageSnippetSection snippet={result.homepage_snippet} /> : null}

      <MirrorSiteReadSection
        siteLine={vm.siteLine}
        classificationExplainer={vm.classificationExplainer}
        confidenceBand={result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand}
      />

      {vm.showSnapshotScoreBlock ? (
        <MirrorScoreSection result={result} scoreVisual={vm.scoreVisual} hasSummary={vm.hasSummary} />
      ) : null}

      <MirrorCoverageAndLimitationsSection
        coverageLine={vm.coverageLine}
        showCallout={vm.access.showCallout}
        limitations={result.limitations ?? []}
      />

      <SnapshotCategoryBreakdownList result={result} />
      <MirrorRecommendationsSection recommendations={vm.programRecommendations} />
      <MirrorSignalsSection signalsFound={vm.signalsFound} />
      <MirrorInsightsSection issues={vm.issues} quickWins={vm.quickWins} techChips={vm.techChips} />
    </div>
  );
}
