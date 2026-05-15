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

const PRIVACY_CONTENT: Record<'ar' | 'en', LocaleContent> = {
  ar: {
    title: 'سياسة الخصوصية',
    lastUpdated: 'آخر تحديث: يناير 2026',
    intro:
      'نحن في عَوْلَمَة نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمعنا للمعلومات واستخدامها وحمايتها.',
    sections: [
      {
        title: 'المعلومات التي نجمعها',
        content: `نجمع المعلومات التالية عند استخدامك لمنصة عَوْلَمَة:
- معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف
- معلومات العقارات: الإعلانات، الاستفسارات، الحجوزات
- معلومات الاستخدام: الصفحات المزارة، عمليات البحث
- معلومات الجهاز: نوع المتصفح، عنوان IP`,
      },
      {
        title: 'كيف نستخدم معلوماتك',
        content: `نستخدم معلوماتك من أجل:
- تشغيل وتحسين خدمات المنصة
- معالجة المعاملات والمدفوعات
- التواصل معك بشأن إعلاناتك واستفساراتك
- إرسال إشعارات مهمة تتعلق بحسابك
- تحسين تجربة المستخدم وتطوير ميزات جديدة`,
      },
      {
        title: 'حماية بياناتك',
        content: `نتخذ إجراءات أمنية صارمة لحماية بياناتك:
- تشفير SSL لجميع البيانات المنقولة
- تخزين آمن للبيانات على خوادم محمية
- وصول محدود للموظفين المصرح لهم فقط
- مراجعات أمنية دورية`,
      },
      {
        title: 'مشاركة المعلومات',
        content: `لا نبيع معلوماتك الشخصية. قد نشارك بياناتك مع:
- مزودي خدمات الدفع (مثل ميسر)
- شركاء التحقق من الهوية (مثل أوثنتيكا)
- جهات حكومية عند الطلب القانوني`,
      },
      {
        title: 'حقوقك',
        content: `لديك الحق في:
- الوصول إلى بياناتك الشخصية
- تصحيح أي معلومات غير دقيقة
- طلب حذف حسابك وبياناتك
- الاعتراض على معالجة بياناتك
- تصدير بياناتك`,
      },
      {
        title: 'الاتصال بنا',
        content: 'لأي استفسارات تتعلق بهذه السياسة، يرجى التواصل معنا عبر: privacy@eawlma.sa',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: January 2026',
    intro:
      'At Eawlma, we are committed to protecting your privacy and personal data. This policy explains how we collect, use, and protect your information.',
    sections: [
      {
        title: 'Information We Collect',
        content: `We collect the following information when you use Eawlma:
- Account info: name, email, phone number
- Property info: listings, inquiries, bookings
- Usage data: pages visited, searches performed
- Device info: browser type, IP address`,
      },
      {
        title: 'How We Use Your Information',
        content: `We use your information to:
- Operate and improve our platform services
- Process transactions and payments
- Communicate about your listings and inquiries
- Send important account notifications
- Improve user experience and develop new features`,
      },
      {
        title: 'Data Protection',
        content: `We take strict security measures to protect your data:
- SSL encryption for all data transfers
- Secure storage on protected servers
- Limited access to authorized staff only
- Regular security audits`,
      },
      {
        title: 'Information Sharing',
        content: `We do not sell your personal information. We may share data with:
- Payment service providers (e.g. Moyasar)
- Identity verification partners (e.g. Authentica)
- Government authorities when legally required`,
      },
      {
        title: 'Your Rights',
        content: `You have the right to:
- Access your personal data
- Correct any inaccurate information
- Request deletion of your account and data
- Object to data processing
- Export your data`,
      },
      {
        title: 'Contact Us',
        content: 'For any questions about this policy, please contact us at: privacy@eawlma.sa',
      },
    ],
  },
};

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const { isRTL, textAlign, backIcon } = useRTL();
  // We only ship bilingual long-form copy. Every non-Arabic locale falls back
  // to English so the screen never blanks out for an under-supported language.
  const isAr = i18n.language.startsWith('ar');
  const content = isAr ? PRIVACY_CONTENT.ar : PRIVACY_CONTENT.en;

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
