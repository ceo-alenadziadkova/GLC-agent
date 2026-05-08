import { useEffect, useState } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useRoadmapGanttViewport,
  type UseRoadmapGanttViewportResult,
} from '../useRoadmapGanttViewport';

type FakeScrollNode = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  scrollTo: ReturnType<typeof vi.fn>;
  scrollBy: ReturnType<typeof vi.fn>;
};

function Probe(props: {
  bind: (r: UseRoadmapGanttViewportResult & { setIsOverviewDragging: (v: boolean) => void }) => void;
  scrollWidth: number;
  clientWidth: number;
  timelineRangeMs: number;
}) {
  const [isOverviewDragging, setIsOverviewDragging] = useState(false);
  const ctl = useRoadmapGanttViewport({
    timeScale: 'day',
    dayRangeDays: 30,
    projection: { defaultTimeStart: 0, defaultTimeEnd: 1_000 },
    timelineTasksLength: 1,
    timelineGroupsLength: 1,
    timelineItemsLength: 1,
    timelineRangeMs: props.timelineRangeMs,
    isOverviewDragging,
    setIsOverviewDragging,
  });
  useEffect(() => {
    props.bind({ ...ctl, setIsOverviewDragging });
  });
  return (
    <div
      ref={(el) => {
        if (!el) return;
        (ctl.refs.timelineShellRef as { current: HTMLDivElement | null }).current = el;
        const scroll = el.querySelector('.rct-scroll') as HTMLElement | null;
        if (scroll) {
          Object.defineProperty(scroll, 'scrollWidth', {
            configurable: true,
            value: props.scrollWidth,
          });
          Object.defineProperty(scroll, 'clientWidth', {
            configurable: true,
            value: props.clientWidth,
          });
        }
      }}
    >
      <div
        className="rct-scroll"
        ref={(el) => {
          if (!el) return;
          // Stash mocks on the element so tests can read scroll calls.
          (el as unknown as FakeScrollNode).scrollTo = vi.fn();
          (el as unknown as FakeScrollNode).scrollBy = vi.fn();
        }}
      />
    </div>
  );
}

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRoadmapGanttViewport', () => {
  it('exposes refs and viewport derivations', () => {
    let captured!: UseRoadmapGanttViewportResult & { setIsOverviewDragging: (v: boolean) => void };
    render(
      <Probe
        bind={(r) => {
          captured = r;
        }}
        scrollWidth={1600}
        clientWidth={800}
        timelineRangeMs={1000}
      />,
    );
    expect(captured.derived.isMonthScale).toBe(false);
    expect(captured.derived.defaultViewportStart).toBe(0);
    expect(captured.refs.timelineShellRef.current).toBeTruthy();
  });

  it('jumpTimelineToToday calls scrollTo with the centred ratio', () => {
    let captured!: UseRoadmapGanttViewportResult & { setIsOverviewDragging: (v: boolean) => void };
    let scrollNode: FakeScrollNode | null = null;
    render(
      <Probe
        bind={(r) => {
          captured = r;
        }}
        scrollWidth={1600}
        clientWidth={800}
        timelineRangeMs={1000}
      />,
    );
    scrollNode = document.querySelector('.rct-scroll') as unknown as FakeScrollNode;
    expect(scrollNode).toBeTruthy();
    now = 500; // middle of [0, 1000]

    act(() => {
      captured.handlers.jumpTimelineToToday();
    });
    // ratio 0.5, maxScroll 800, target = 800*0.5 - 400 = 0
    expect(scrollNode!.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' });
  });

  it('handleOverviewPointer scrolls to the pointer-derived ratio with the correct behavior', () => {
    let captured!: UseRoadmapGanttViewportResult & { setIsOverviewDragging: (v: boolean) => void };
    render(
      <Probe
        bind={(r) => {
          captured = r;
        }}
        scrollWidth={1600}
        clientWidth={800}
        timelineRangeMs={1000}
      />,
    );
    const scrollNode = document.querySelector('.rct-scroll') as unknown as FakeScrollNode;
    expect(scrollNode).toBeTruthy();

    const fakeTrack = {
      getBoundingClientRect: () => ({
        left: 0,
        width: 200,
        top: 0,
        right: 200,
        bottom: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLDivElement;
    (captured.refs.overviewTrackRef as { current: HTMLDivElement | null }).current = fakeTrack;

    act(() => {
      captured.handlers.handleOverviewPointer(50);
    });
    expect(scrollNode.scrollTo).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });

    act(() => {
      captured.setIsOverviewDragging(true);
    });
    act(() => {
      captured.handlers.handleOverviewPointer(150);
    });
    expect(scrollNode.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: 'auto' });
  });
});
