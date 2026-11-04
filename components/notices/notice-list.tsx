import type { Notice } from "@/lib/content/slots";

export function NoticeList({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) {
    return <p className="port-copy text-sm">No notices.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {notices.map((notice) => (
        <li key={notice.id} className="port-rule rounded-lg border bg-faded-bg px-4 py-3">
          <a href={notice.href} className="text-base font-medium">
            {notice.title}
          </a>
          <p className="port-meta mt-1 font-sans text-xs uppercase tracking-[0.18em]">{notice.body}</p>
        </li>
      ))}
    </ul>
  );
}
