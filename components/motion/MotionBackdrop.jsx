'use client';

// The two decorative canvas layers, loaded lazily and only where they belong.
//
// Both used to be imported directly into app/layout.jsx, which meant their
// JavaScript sat in the initial bundle of every route — including the whole
// admin console, where they are not even wanted. They are pure decoration:
// nothing about the page depends on them, and a reduced-motion or touch
// visitor never sees them at all.
//
// `ssr: false` is only valid inside a Client Component
// (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md), which is
// what this wrapper is for. There is no loading fallback and there must not
// be one: these render behind the content at z-0/z-1 and participate in no
// layout, so there is nothing to reserve space for and nothing to shift.
//
// Skipped entirely on /admin. An admin reading a data table does not need a
// particle field behind it, and it is the one part of the product where
// people work for long stretches.
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isAdminRoute } from '@/components/layout/ChromeGate.jsx';

const ParticleField = dynamic(() => import('./ParticleField.jsx'), { ssr: false });
const CursorSpotlight = dynamic(() => import('./CursorSpotlight.jsx'), { ssr: false });

export default function MotionBackdrop() {
  const pathname = usePathname();
  if (isAdminRoute(pathname)) return null;
  return (
    <>
      <ParticleField />
      <CursorSpotlight />
    </>
  );
}
