import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReportProfile } from '@glc/intake-core';

import type { ReportInput } from '../report-profiler.js';
import { AuditDocument } from './audit-document.js';

export class PdfGenerator {
  /**
   * Render a branded A4 PDF for the given audit input and profile.
   * Returns a Buffer — send directly as application/pdf in Express.
   */
  async generate(input: ReportInput, profile: ReportProfile = 'full'): Promise<Buffer> {
    const element = React.createElement(AuditDocument, { input, profile }) as React.ReactElement<DocumentProps>;
    return renderToBuffer(element);
  }
}

export const pdfGenerator = new PdfGenerator();
