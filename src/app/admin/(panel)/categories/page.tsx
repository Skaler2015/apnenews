import prisma from '@/lib/db';
import ActionButton from '@/components/admin/ActionButton';
import { toggleCategory, addCategory } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { articles: true } } },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">श्रेणियाँ</h1>

      <form action={addCategory} className="card grid grid-cols-1 gap-3 p-4 md:grid-cols-6">
        <input name="name" placeholder="हिंदी नाम" required className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-2" />
        <input name="nameEn" placeholder="English name" required className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-2" />
        <input name="slug" placeholder="slug (वैकल्पिक)" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <input name="color" type="color" defaultValue="#c8102e" className="h-10 rounded border border-[var(--border)]" />
        <input name="metaDescription" placeholder="मेटा विवरण (SEO)" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-5" />
        <button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white">जोड़ें</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs uppercase text-[var(--text-soft)]">
            <tr><th className="p-3">#</th><th className="p-3">नाम</th><th className="p-3">slug</th><th className="p-3">लेख</th><th className="p-3 text-right">स्थिति</th></tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3 text-[var(--text-soft)]">{i + 1}</td>
                <td className="p-3"><span className="cat-chip" style={{ backgroundColor: c.color }}>{c.name}</span> <span className="ml-2 text-xs text-[var(--text-soft)]">{c.nameEn}</span></td>
                <td className="p-3 font-mono text-xs">/{c.slug}</td>
                <td className="p-3">{c._count.articles}</td>
                <td className="p-3 text-right">
                  <ActionButton action={toggleCategory.bind(null, c.id, !c.isActive)} className={`rounded px-2 py-1 text-xs font-semibold ${c.isActive ? 'bg-green-600 text-white' : 'border border-[var(--border)]'}`}>
                    {c.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
