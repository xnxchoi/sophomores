import type { Notice } from "@/lib/content/slots";

export function NoticeList({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) {
    return <p className="text-sm text-foreground/70">No notices.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {notices.map((notice) => (
        <li key={notice.id} className="rounded-lg border border-faded-white/12 bg-faded-black px-4 py-3">
          <a href={notice.href} className="text-base font-medium">
            {notice.title}
          </a>
          <p className="mt-1 font-sans text-xs uppercase tracking-[0.18em] text-faded-l-gray">{notice.body}</p>
        </li>
      ))}
    </ul>
  );
}
