import { StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Fonts, Spacing } from '@/constants/theme';

export function EscrowCalculator() {
  const [amount, setAmount] = useState('500');
  const [rail, setRail] = useState<'fiat' | 'crypto'>('fiat');
  const currency = rail === 'fiat' ? 'USD' : 'USDC';
  const feeRate = rail === 'fiat' ? 0.015 : 0.01;
  const amountValue = Number(amount) || 0;
  const estimatedFee = amountValue * feeRate;
  const sellerNet = Math.max(0, amountValue - estimatedFee);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        Estimate escrow fees
      </ThemedText>
      <View style={styles.toggleRow}>
        {['fiat', 'crypto'].map((option) => (
          <ThemedView
            key={option}
            style={[
              styles.toggleButton,
              rail === option && styles.toggleButtonActive,
            ]}>
            <ThemedText type="smallBold" style={rail === option ? styles.toggleTextActive : styles.toggleText}>
              {option === 'fiat' ? 'Fiat rail' : 'Crypto rail'}
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedView style={styles.inputCard}>
        <ThemedText type="smallBold">Transaction amount ({currency})</ThemedText>
        <TextInput
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <ThemedText type="small" style={styles.summaryText}>
          Fee: {currency === 'USD' ? '$' : ''}{estimatedFee.toFixed(2)} {currency}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.summaryText}>
          Seller net payout: {currency === 'USD' ? '$' : ''}{sellerNet.toFixed(2)} {currency}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  toggleButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  toggleText: {
    color: '#374151',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  inputCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    fontSize: 16,
    fontFamily: Fonts.sans[400],
    color: '#111827',
  },
  summaryText: {
    marginTop: Spacing.one,
    color: '#4b5563',
  },
});
