// /admin/users — the account list, and the one place a display name or an
// admin flag can be changed through the interface.
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx already
// called it: a shared layout does not re-render on client-side navigation
// between the sibling routes it wraps. Both calls share one cached DB read.
//
// No password appears anywhere on this screen, and there is no view that
// could produce one — see lib/admin/users.js. There is also deliberately no
// delete control: removing an account cascades student data, and that is a
// destructive action that should not sit one mis-click away in a list.
import requireAdmin from '@/lib/auth/requireAdmin';
import { getUsersPage, countAdmins } from '@/lib/admin/users';
import { parsePageParams } from '@/lib/admin/pagination';
import { saveUserProfile } from './actions';
import Kicker from '@/components/arah/Kicker.jsx';
import Pagination from '@/components/admin/Pagination.jsx';
import UserRow from '@/components/admin/UserRow.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.users.metaTitle,
  robots: { index: false, follow: false },
};

const t = en.admin.users;

export default async function AdminUsersPage({ searchParams }) {
  const actor = await requireAdmin();

  // searchParams is a Promise in Next 16.
  const params = (await searchParams) ?? {};
  const { page, pageSize } = parsePageParams(params);

  const [result, adminCount] = await Promise.all([
    getUsersPage({ page, pageSize }),
    countAdmins().catch(() => 1),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[66ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-2 px-5 py-4">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 fill-violet">
          <path
            fillRule="evenodd"
            d="M10 1.5a4 4 0 0 0-4 4V8H5.5A1.5 1.5 0 0 0 4 9.5v7A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 8H14V5.5a4 4 0 0 0-4-4Zm2.5 6.5V5.5a2.5 2.5 0 1 0-5 0V8h5Z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm leading-[1.6] text-muted-foreground">{t.passwordNotice}</p>
      </div>

      {result === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">{t.loadError}</p>
          <p className="text-sm text-muted-foreground">{t.loadErrorHint}</p>
        </div>
      ) : result.rows.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline px-6 text-center">
          <p className="text-sm font-medium text-ink">{t.emptyTitle}</p>
          <p className="max-w-[48ch] text-sm text-muted-foreground">{t.emptyBody}</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {result.rows.map((user) => (
              <li key={user.id}>
                <UserRow
                  user={user}
                  isSelf={user.id === actor.id}
                  adminCount={adminCount}
                  action={saveUserProfile}
                />
              </li>
            ))}
          </ul>

          <Pagination
            basePath="/admin/users"
            searchParams={{ page: result.page, pageSize }}
            page={result.page}
            pageCount={result.pageCount}
            totalRows={result.total}
            rangeStart={result.total === 0 ? 0 : (result.page - 1) * pageSize + 1}
            rangeEnd={Math.min(result.page * pageSize, result.total)}
          />
        </>
      )}
    </div>
  );
}
