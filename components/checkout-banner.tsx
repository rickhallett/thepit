'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function CheckoutBanner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const shouldShow = checkout === 'success' || checkout === 'cancel';
  const [visible, setVisible] = useState(shouldShow);

  useEffect(() => {
    if (!shouldShow) return;
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  if (!visible) return null;

  const isSuccess = checkout === 'success';

  return (
    <div
      className={`border-2 px-4 py-3 text-xs uppercase tracking-[0.3em] ${
        isSuccess
          ? 'border-green-600/60 bg-green-900/20 text-green-400'
          : 'border-red-600/60 bg-red-900/20 text-red-400'
      }`}
    >
      {isSuccess
        ? 'Credits added to your account.'
        : 'Checkout cancelled.'}
    </div>
  );
}
