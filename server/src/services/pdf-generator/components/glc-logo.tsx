import React from 'react';
import { View } from '@react-pdf/renderer';

import { PDF_GLC_LOGO_GEOMETRY } from '../../../config/pdf-brand-geometry.js';
import { pdfTheme } from '../styles.js';

const C = pdfTheme;

export const GlcLogo: React.FC<{ size?: number }> = ({ size = PDF_GLC_LOGO_GEOMETRY.defaultSize }) => {
  const sq = Math.round(size * PDF_GLC_LOGO_GEOMETRY.squareSizeRatio);
  const r = Math.max(2, Math.round(sq * PDF_GLC_LOGO_GEOMETRY.borderRadiusRatio));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size - sq,
          top: 0,
          width: sq,
          height: sq,
          borderRadius: r,
          backgroundColor: C.green,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: Math.round(size * PDF_GLC_LOGO_GEOMETRY.orangeLeftRatio),
          top: Math.round(size * PDF_GLC_LOGO_GEOMETRY.orangeTopRatio),
          width: sq,
          height: sq,
          borderRadius: r,
          backgroundColor: C.orange,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: size - sq,
          width: sq,
          height: sq,
          borderRadius: r,
          backgroundColor: C.blue,
        }}
      />
    </View>
  );
};
