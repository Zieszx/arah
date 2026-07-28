import { Instrument_Serif, Inter } from 'next/font/google';

// Display face for headlines and the ARAH logotype.
export const displayFont = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// UI face for everything else.
export const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
