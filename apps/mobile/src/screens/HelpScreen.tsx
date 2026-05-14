import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Faq { q: { ar: string; en: string }; a: { ar: string; en: string } }

const FAQS: Faq[] = [
  {
    q: {
      ar: 'كيف أبحث عن عقار؟',
      en: 'How do I search for a property?',
    },
    a: {
      ar: 'اضغط على تبويب "بحث" في الأسفل، ثم اختر الفلاتر التي تناسبك (السعر، النوع، الموقع).',
      en: 'Tap the Search tab at the bottom, then pick filters that suit you (price, type, city).',
    },
  },
  {
    q: {
      ar: 'كيف أتواصل مع الوكيل؟',
      en: 'How do I contact an agent?',
    },
    a: {
      ar: 'افتح صفحة العقار، ثم اضغط على "إرسال استفسار" أو اتصل/تواصل عبر واتساب من بطاقة الوكيل.',
      en: 'Open the listing, then tap "Send Inquiry" or use the call/WhatsApp buttons on the agent card.',
    },
  },
  {
    q: {
      ar: 'هل خدمة الحجز للشاليهات والمزارع متوفرة؟',
      en: 'Can I book chalets and farms?',
    },
    a: {
      ar: 'نعم، افتح أي عقار من نوع شاليه/مزرعة/استراحة، واضغط "احجز الآن" لاختيار التواريخ.',
      en: 'Yes — open any chalet / farm / rest-house listing and tap "Book Now" to pick dates.',
    },
  },
  {
    q: {
      ar: 'كيف أحفظ عقار للرجوع إليه لاحقاً؟',
      en: 'How do I save a property for later?',
    },
    a: {
      ar: 'اضغط على أيقونة القلب في صفحة العقار. ستجد جميع المحفوظات في تبويب "محفوظات".',
      en: 'Tap the heart icon on the listing. Saved items live under the Saved tab.',
    },
  },
  {
    q: {
      ar: 'هل التطبيق مجاني؟',
      en: 'Is the app free?',
    },
    a: {
      ar: 'نعم، التطبيق مجاني للباحثين عن العقارات. الوكلاء يدفعون عمولة بعد إتمام الصفقة.',
      en: 'Yes — free for property seekers. Agents pay a commission only after a successful deal.',
    },
  },
  {
    q: {
      ar: 'كيف أغيّر لغة التطبيق؟',
      en: 'How do I change the app language?',
    },
    a: {
      ar: 'من تبويب "حسابي" > الإعدادات > اللغة، ثم اختر من بين 38 لغة.',
      en: 'Profile tab → Settings → Language. Pick from 38 supported languages.',
    },
  },
];

export default function HelpScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === idx ? null : idx);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'المساعدة' : 'Help'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}>
        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginBottom: SIZES.md, textAlign }]}>
          {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </Text>
        {FAQS.map((f, idx) => {
          const isOpen = open === idx;
          return (
            <View
              key={idx}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => toggle(idx)}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, textAlign }]}>
                  {isAr ? f.q.ar : f.q.en}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : (isRTL ? 'chevron-back' : 'chevron-forward')}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {isOpen && (
                <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, lineHeight: 22, marginTop: SIZES.sm, textAlign }]}>
                  {isAr ? f.a.ar : f.a.en}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  row: { alignItems: 'center', gap: SIZES.sm },
});
