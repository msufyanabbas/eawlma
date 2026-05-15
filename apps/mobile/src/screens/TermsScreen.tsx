import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { SIZES } from '../theme';

interface Section {
  title: string;
  content: string;
}

interface LocaleContent {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
}

const TERMS_CONTENT: Record<'ar' | 'en', LocaleContent> = {
  ar: {
    title: 'شروط الخدمة',
    lastUpdated: 'آخر تحديث: يناير 2026',
    intro:
      'باستخدامك لمنصة عَوْلَمَة، فإنك توافق على الشروط والأحكام التالية. يرجى قراءتها بعناية.',
    sections: [
      {
        title: 'قبول الشروط',
        content:
          'باستخدام منصة عَوْلَمَة، فإنك تقر بأنك قرأت وفهمت ووافقت على هذه الشروط. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.',
      },
      {
        title: 'استخدام المنصة',
        content: `يُسمح لك باستخدام المنصة للأغراض التالية:
- البحث عن عقارات للشراء أو الإيجار
- نشر إعلانات عقارية (للوكلاء المرخصين)
- التواصل مع الوكلاء والمشترين
- إتمام المعاملات العقارية المشروعة

يُمنع منعاً باتاً:
- نشر معلومات مزيفة أو مضللة
- انتحال هوية أشخاص أو شركات أخرى
- استخدام المنصة لأغراض غير مشروعة
- محاولة اختراق أنظمة المنصة`,
      },
      {
        title: 'سياسة الإعلانات',
        content: `يجب أن تلتزم جميع الإعلانات بما يلي:
- الحصول على رخصة فال للتسويق العقاري
- تقديم معلومات دقيقة وحقيقية
- وجود صور حقيقية للعقار
- ذكر السعر الحقيقي للعقار
- الامتثال للوائح هيئة العقار السعودية`,
      },
      {
        title: 'العمولات والرسوم',
        content: `تطبق عَوْلَمَة نظام العمولات التالي:
- عمولة الوكيل: 2.5% من قيمة الصفقة
- رسوم المنصة: 0.5% من قيمة الصفقة
- يتم الدفع عبر المحفظة الإلكترونية فقط
- جميع العمولات تخضع لضريبة القيمة المضافة`,
      },
      {
        title: 'المسؤولية',
        content:
          'عَوْلَمَة هي منصة وسيطة تربط البائعين والمشترين. لا تتحمل المنصة مسؤولية أي نزاعات تنشأ بين المستخدمين، وإن كانت توفر نظاماً لحل النزاعات.',
      },
      {
        title: 'تعديل الشروط',
        content:
          'تحتفظ عَوْلَمَة بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني.',
      },
      {
        title: 'القانون المطبق',
        content:
          'تخضع هذه الشروط لقوانين المملكة العربية السعودية وتختص المحاكم السعودية بالنظر في أي نزاعات.',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: January 2026',
    intro:
      'By using Eawlma, you agree to the following terms and conditions. Please read them carefully.',
    sections: [
      {
        title: 'Acceptance of Terms',
        content:
          'By using the Eawlma platform, you acknowledge that you have read, understood, and agreed to these terms. If you disagree with any of these terms, please do not use the platform.',
      },
      {
        title: 'Use of Platform',
        content: `You are permitted to use the platform for:
- Searching for properties to buy or rent
- Publishing property listings (licensed agents only)
- Communicating with agents and buyers
- Completing legitimate real estate transactions

Strictly prohibited:
- Publishing false or misleading information
- Impersonating other persons or companies
- Using the platform for illegal purposes
- Attempting to breach platform systems`,
      },
      {
        title: 'Listings Policy',
        content: `All listings must comply with the following:
- Must have a valid FAL real estate marketing license
- Must provide accurate and truthful information
- Must include real photos of the property
- Must state the actual property price
- Must comply with Saudi Real Estate Authority regulations`,
      },
      {
        title: 'Commissions and Fees',
        content: `Eawlma applies the following commission system:
- Agent commission: 2.5% of transaction value
- Platform fee: 0.5% of transaction value
- Payment via electronic wallet only
- All commissions subject to VAT`,
      },
      {
        title: 'Liability',
        content:
          'Eawlma is an intermediary platform connecting buyers and sellers. The platform is not responsible for any disputes arising between users, although it provides a dispute resolution system.',
      },
      {
        title: 'Modifications',
        content:
          'Eawlma reserves the right to modify these terms at any time. Users will be notified of any material changes via email.',
      },
      {
        title: 'Governing Law',
        content:
          'These terms are governed by Saudi Arabian law, and Saudi courts have jurisdiction over any disputes.',
      },
    ],
  },
};

export default function TermsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const { isRTL, textAlign, backIcon } = useRTL();
  const isAr = i18n.language.startsWith('ar');
  const content = isAr ? TERMS_CONTENT.ar : TERMS_CONTENT.en;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary, textAlign }]}>
          {content.lastUpdated}
        </Text>

        <Text style={[styles.intro, { color: colors.textSecondary, textAlign }]}>
          {content.intro}
        </Text>

        {content.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={[styles.sectionTitleBox, {
              borderLeftWidth: isRTL ? 0 : 4,
              borderRightWidth: isRTL ? 4 : 0,
              borderColor: colors.primary,
              paddingLeft: isRTL ? 0 : SIZES.md,
              paddingRight: isRTL ? SIZES.md : 0,
            }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
                {section.title}
              </Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary, textAlign }]}>
              {section.content}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.title, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  content: { padding: SIZES.xl, paddingBottom: SIZES.xxxl },
  lastUpdated: { fontSize: SIZES.small, marginBottom: SIZES.lg, fontFamily: 'Tajawal_400Regular' },
  intro: { fontSize: SIZES.body, lineHeight: 24, marginBottom: SIZES.xl, fontFamily: 'Tajawal_400Regular' },
  section: { marginBottom: SIZES.xl },
  sectionTitleBox: { marginBottom: SIZES.md },
  sectionTitle: { fontSize: SIZES.subtitle, fontFamily: 'Tajawal_800ExtraBold' },
  sectionContent: { fontSize: SIZES.body, lineHeight: 24, fontFamily: 'Tajawal_400Regular' },
});
