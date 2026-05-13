import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useRTL } from '../hooks/useRTL';

interface Props {
  value: number | string | null | undefined;
  style?: StyleProp<TextStyle>;
  currencyStyle?: StyleProp<TextStyle>;
}

export default function PriceText({ value, style, currencyStyle }: Props) {
  const { isAr } = useRTL();
  const n = Number(value);
  const display = Number.isFinite(n) ? n.toLocaleString() : '—';
  return (
    <Text style={style}>
      {display}
      <Text style={currencyStyle}> {isAr ? 'ر.س' : 'SAR'}</Text>
    </Text>
  );
}
