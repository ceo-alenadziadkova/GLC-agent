import { describe, expect, it, vi } from 'vitest';

const { renderToBufferMock } = vi.hoisted(() => ({
  renderToBufferMock: vi.fn(),
}));

vi.mock('@react-pdf/renderer', async importOriginal => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    renderToBuffer: renderToBufferMock,
  };
});

import {
  REPORT_PDF_MAX_OUTPUT_BYTES,
  REPORT_PDF_RENDER_CONCURRENCY,
  REPORT_PDF_RENDER_TIMEOUT_MS,
} from '../config/report-profiler-limits.js';
import { PdfGenerator, PdfRenderSizeLimitError, PdfRenderTimeoutError } from '../services/pdf-generator/pdf-generator-class.js';

describe('PdfGenerator guards', () => {
  it('throws PdfRenderSizeLimitError when buffer exceeds max bytes', async () => {
    renderToBufferMock.mockResolvedValueOnce(Buffer.alloc(REPORT_PDF_MAX_OUTPUT_BYTES + 1, 0x20));
    const generator = new PdfGenerator();
    await expect(generator.generate({} as never, 'full')).rejects.toBeInstanceOf(PdfRenderSizeLimitError);
  });

  it('throws PdfRenderTimeoutError when render exceeds timeout', async () => {
    vi.useFakeTimers();
    renderToBufferMock.mockImplementationOnce(
      () => new Promise<Buffer>(resolve => setTimeout(() => resolve(Buffer.from('late')), REPORT_PDF_RENDER_TIMEOUT_MS + 10)),
    );
    const generator = new PdfGenerator();
    const pending = generator.generate({} as never, 'full');
    const assertion = expect(pending).rejects.toBeInstanceOf(PdfRenderTimeoutError);
    await vi.advanceTimersByTimeAsync(REPORT_PDF_RENDER_TIMEOUT_MS + 1);
    await assertion;
    vi.useRealTimers();
  });

  it('limits concurrent render jobs by configured semaphore', async () => {
    let active = 0;
    let peak = 0;
    const blockers: Array<() => void> = [];

    renderToBufferMock.mockImplementation(
      () =>
        new Promise<Buffer>(resolve => {
          active += 1;
          peak = Math.max(peak, active);
          blockers.push(() => {
            active -= 1;
            resolve(Buffer.from('ok'));
          });
        }),
    );

    const generator = new PdfGenerator();
    const totalJobs = REPORT_PDF_RENDER_CONCURRENCY + 2;
    const pending = Array.from({ length: totalJobs }, () => generator.generate({} as never, 'full'));

    await Promise.resolve();
    expect(peak).toBe(REPORT_PDF_RENDER_CONCURRENCY);

    for (let i = 0; i < totalJobs; i += 1) {
      while (blockers.length === 0) {
        await Promise.resolve();
      }
      const release = blockers.shift();
      release?.();
    }
    await Promise.all(pending);
  });
});
