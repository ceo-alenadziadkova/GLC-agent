import '@testing-library/jest-dom';

// jsdom SVG stubs: GSAP MotionPathPlugin calls svg.getCTM() on mount (SyncPathLoader).
if (typeof SVGSVGElement !== 'undefined' && !SVGSVGElement.prototype.getCTM) {
  SVGSVGElement.prototype.getCTM = function getCTM() {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
    } as SVGMatrix;
  };
}
