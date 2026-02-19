import { renderBoutOGImage, ogSize } from '@/lib/og-bout-image';

export const runtime = 'edge';
export const alt = 'THE PIT — AI Battle Arena';
export const size = ogSize;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BoutOGImage({ params }: Props) {
  const { id } = await params;
  return renderBoutOGImage(id);
}
