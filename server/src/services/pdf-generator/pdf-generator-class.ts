import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReportProfile } from '@glc/intake-core';
import {
  REPORT_PDF_MAX_OUTPUT_BYTES,
  REPORT_PDF_RENDER_CONCURRENCY,
  REPORT_PDF_RENDER_TIMEOUT_MS,
} from '../../config/report-profiler-limits.js';
import { logger } from '../logger.js';

import type { ReportInput } from '../report-profiler.js';
import { AuditDocument } from './audit-document.js';

export class PdfRenderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`PDF render timed out after ${timeoutMs}ms`);
    this.name = 'PdfRenderTimeoutError';
  }
}

export class PdfRenderSizeLimitError extends Error {
  constructor(maxBytes: number, actualBytes: number) {
    super(`PDF size ${actualBytes} exceeded max ${maxBytes}`);
    this.name = 'PdfRenderSizeLimitError';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new PdfRenderTimeoutError(timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

class PdfRenderSemaphore {
  private active = 0;

  private readonly waiting: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  get snapshot() {
    return { active: this.active, queued: this.waiting.length, max: this.maxConcurrent };
  }

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return;
    }
    await new Promise<void>(resolve => {
      this.waiting.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }
}

export class PdfGenerator {
  private readonly renderSemaphore = new PdfRenderSemaphore(REPORT_PDF_RENDER_CONCURRENCY);

  /**
   * Render a branded A4 PDF for the given audit input and profile.
   * Returns a Buffer — send directly as application/pdf in Express.
   */
  async generate(input: ReportInput, profile: ReportProfile = 'full'): Promise<Buffer> {
    const queuedBeforeAcquire = this.renderSemaphore.snapshot.queued;
    if (queuedBeforeAcquire > 0) {
      logger.warn('pdf.render_queue_wait', { queued: queuedBeforeAcquire, profile });
    }
    await this.renderSemaphore.acquire();
    const acquiredState = this.renderSemaphore.snapshot;
    logger.info('pdf.render_started', { active: acquiredState.active, queued: acquiredState.queued, profile });
    try {
      const element = React.createElement(AuditDocument, { input, profile }) as React.ReactElement<DocumentProps>;
      const buffer = await withTimeout(renderToBuffer(element), REPORT_PDF_RENDER_TIMEOUT_MS);
      if (buffer.length > REPORT_PDF_MAX_OUTPUT_BYTES) {
        throw new PdfRenderSizeLimitError(REPORT_PDF_MAX_OUTPUT_BYTES, buffer.length);
      }
      return buffer;
    } finally {
      this.renderSemaphore.release();
      const releaseState = this.renderSemaphore.snapshot;
      logger.info('pdf.render_finished', { active: releaseState.active, queued: releaseState.queued, profile });
    }
  }
}

export const pdfGenerator = new PdfGenerator();
