import type { Metadata } from 'next';
import { FlameReference } from './reference';

export const metadata: Metadata = {
  title: 'Sophomores — flame reference',
  robots: { index: false, follow: false }
};

export default function FlameReferencePage() {
  return <FlameReference />;
}
