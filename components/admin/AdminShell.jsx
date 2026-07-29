'use client';

// The client boundary that composes AdminHeader + AdminSidebar and holds
// the one piece of shared state neither can own alone: whether the
// off-canvas drawer is open. app/(admin)/layout.jsx is a Server Component
// (it awaits requireAdmin()), so it can't hold useState itself — this is
// the same "server layout renders a thin client shell" split
// app/(auth)/layout.jsx already uses for AuthShell.jsx.
//
// `toggleRef` is created here and handed to BOTH children: AdminHeader
// attaches it to the actual hamburger <button>, AdminSidebar reads it to
// include that button in its focus-trap cycle and to return focus to it
// when the drawer closes. Neither child could do this alone without the
// other's DOM node.
import { useRef, useState } from 'react';
import AdminHeader from './AdminHeader.jsx';
import AdminSidebar from './AdminSidebar.jsx';

export default function AdminShell({ profile, signOutAction, children }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  return (
    <div className="min-h-full">
      <AdminSidebar
        open={open}
        onClose={() => setOpen(false)}
        toggleRef={toggleRef}
        profile={profile}
        signOutAction={signOutAction}
      />
      {/* xl:pl-60 reserves the pinned sidebar's 240px column; below that
          breakpoint the sidebar is off-canvas and this column is full
          width. */}
      <div className="flex min-h-full flex-col xl:pl-60">
        <AdminHeader
          profile={profile}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          toggleRef={toggleRef}
          signOutAction={signOutAction}
        />
        {/* Content capped ~1440px and centred at very wide viewports
            (1920) so lines stay readable, per the responsive spec —
            below that width the max-width simply never binds. */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 md:px-8 md:py-10 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
