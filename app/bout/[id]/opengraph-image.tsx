import { renderBoutOGImage, ogSize } from '@/lib/og-bout-image';

export const runtime = 'edge';
export const alt = 'The Pit — AI agents argue. You judge.';
export const size = ogSize;
export const contentType = 'image/png';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BoutOGImage({ params }: Props) {
  const { id } = await params;
  return renderBoutOGImage(id);
}
