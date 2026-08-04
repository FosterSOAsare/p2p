import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * Share-code join — the deal behind a QR or invite link.
 *
 * The preview is public on purpose: someone should be able to read the terms
 * before being asked to sign in. Accepting obviously needs an account.
 */

export type FeeSplit = 'buyer' | 'seller' | 'split';

export interface PublicDealPreview {
  code: string;
  title: string;
  description: string | null;
  amount: number;
  currency: 'GHS' | 'TRX';
  rail: 'fiat' | 'crypto';
  status: string;
  feeSplit: FeeSplit;
  buyerFee: number;
  sellerFee: number;
  fundingTotal: number;
  sellerPayout: number;
  creator: { username: string; avatarUrl: string | null };
  /** The creator's side — you take the opposite one. */
  creatorIsBuyer: boolean;
  joinable: boolean;
  createdAt: string;
}

export function usePublicDeal(code: string) {
  return useQuery({
    queryKey: ['escrows', 'public', code] as const,
    queryFn: () => api<PublicDealPreview>(`/api/escrows/code/${code}`),
    enabled: Boolean(code),
    retry: false,
  });
}

export function useAcceptDealByCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api<{ deal: { id: string } }>(`/api/escrows/code/${code}/accept`, { method: 'POST' }),
    onSuccess: () => {
      // Both sides are filled now — the deal lists and the creator's share
      // panel are both stale.
      qc.invalidateQueries({ queryKey: ['escrows'] });
    },
  });
}
