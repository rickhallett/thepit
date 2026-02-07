export const buildAttestationUrl = (uid: string) => {
  let base =
    process.env.NEXT_PUBLIC_EAS_SCAN_BASE ??
    'https://base.easscan.org/attestation/view';

  if (base.endsWith('/attestation')) {
    base = `${base}/view`;
  }

  if (base.includes('{uid}')) {
    return base.replace('{uid}', uid);
  }

  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmed}/${uid}`;
};
