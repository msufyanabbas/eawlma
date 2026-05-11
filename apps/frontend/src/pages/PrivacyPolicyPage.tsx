import { Box, Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

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

export function PrivacyPolicyPage() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const content = isAr ? PRIVACY_CONTENT.ar : PRIVACY_CONTENT.en;

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>
          {content.title} — {t('app.name')}
        </title>
      </Helmet>

      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, mb: 1 }}>
            {content.title}
          </Typography>
          <Typography sx={{ opacity: 0.85 }}>{content.lastUpdated}</Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, lineHeight: 1.85 }}
        >
          {content.intro}
        </Typography>

        {content.sections.map((section, i) => (
          <Box key={i} sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                mb: 1.5,
                color: 'text.primary',
                borderInlineStart: '4px solid',
                borderInlineStartColor: 'primary.main',
                pl: 2,
              }}
            >
              {section.title}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ whiteSpace: 'pre-line', lineHeight: 2 }}
            >
              {section.content}
            </Typography>
          </Box>
        ))}
      </Container>
    </Box>
  );
}
