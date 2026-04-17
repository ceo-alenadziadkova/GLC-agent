import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function MirrorSignalsSection({ signalsFound }: { signalsFound: string[] }) {
  if (signalsFound.length < 1) return null;
  return (
    <div className="mb-2">
      <p
        className="mb-2 text-center text-[0.65rem] font-medium uppercase tracking-wider sm:text-xs lg:text-left ds-text-tertiary"
        
      >
        {PORTAL_SNAPSHOT_MIRROR_COPY.limitations.heading}
      </p>
      <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
        {signalsFound.map((signal, i) => (
          <span
            key={i}
            className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
            style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.pillSurface}
          >
            {signal}
          </span>
        ))}
      </div>
    </div>
  );
}
