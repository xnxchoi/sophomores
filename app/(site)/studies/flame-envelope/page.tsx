import type { Metadata } from 'next';
import { FlameEditor } from '@/components/devtools/flame-editor/flame-editor';

export const metadata: Metadata = {
  title: 'Sophomores — flame shader editor',
  robots: { index: false, follow: false }
};

export default function FlameEnvelopePage() {
  return <FlameEditor />;
}
