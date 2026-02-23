import { renderBoutOGImage, ogSize } from '@/lib/og-bout-image';

export const runtime = 'edge';
export const alt = 'The Pit — I built this with agents. Alone.';
export const size = ogSize;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BoutOGImage({ params }: Props) {
  const { id } = await params;
  return renderBoutOGImage(id);
}
