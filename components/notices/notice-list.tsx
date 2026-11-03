import type { Notice } from "@/lib/content/slots";

export function NoticeList({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) {
    return <p className="text-sm text-foreground/70">No notices.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {notices.map((notice) => (
        <li key={notice.id} className="border border-border px-4 py-3">
          <a href={notice.href} className="text-sm font-medium">
            {notice.title}
          </a>
          <p className="text-sm text-foreground/70">{notice.body}</p>
        </li>
      ))}
    </ul>
  );
}
