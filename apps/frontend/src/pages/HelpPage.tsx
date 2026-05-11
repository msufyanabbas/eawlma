import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpIcon from '@mui/icons-material/HelpOutlineOutlined';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQ[];
}

// Bilingual FAQ content. Selected at render time by i18n.language so the
// answers feel native — translating via t() keys would be brittle for long
// prose paragraphs.
const FAQ_DATA: { en: FAQSection[]; ar: FAQSection[] } = {
  en: [
    {
      title: 'Getting Started',
      items: [
        { question: 'What is Eawlma?', answer: 'Eawlma is a Saudi-focused real estate marketplace connecting verified agents with buyers and renters across the Kingdom. Browse properties, save favourites, message agents, and complete transactions transparently.' },
        { question: 'Do I need an account to browse listings?', answer: 'No. Anyone can search and view listings without signing in. Creating a free account lets you save favourites across devices, send inquiries, and message agents directly.' },
        { question: 'Is Eawlma available in Arabic?', answer: 'Yes — the entire platform is fully bilingual with right-to-left support. Use the language toggle in the navbar to switch between Arabic and English at any time.' },
        { question: 'How are listings verified?', answer: 'Every listing goes through moderation before being published. Agents must be verified through the Saudi Real Estate General Authority (REGA) before they can post.' },
      ],
    },
    {
      title: 'For Buyers',
      items: [
        { question: 'How do I search for properties?', answer: 'Use the hero search bar on the homepage to filter by city, district, or keyword. The search page lets you refine by price, bedrooms, bathrooms, area, amenities, and more.' },
        { question: 'How do I save a property to favourites?', answer: 'Click the heart icon on any listing card or detail page. Saved listings sync across all your devices when signed in. Anonymous saves are kept locally on the device.' },
        { question: 'How do I contact an agent?', answer: 'On any listing detail page, use the inquiry form to send a message, or click "WhatsApp" to start a chat. You can also use the in-platform Messages feature once signed in.' },
        { question: 'Can I compare listings side by side?', answer: 'Yes. Click the compare icon on any listing card to add it to your compare list (max 3). The comparison page highlights the best value in each row.' },
      ],
    },
    {
      title: 'For Agents',
      items: [
        { question: 'How do I list my first property?', answer: 'Sign up as an agent, complete REGA verification, and use the dashboard "New listing" button. The wizard walks you through property details, media upload, and submission for moderation.' },
        { question: 'How do I manage my listings?', answer: 'The "My listings" page in the dashboard shows every listing you own with quick actions to edit, archive, or view analytics. The dashboard home highlights listings that need attention.' },
        { question: 'How do I upgrade my plan?', answer: 'Visit Subscription in the dashboard to compare plans and upgrade. Upgrades unlock more active listings, featured placement, and analytics depth.' },
        { question: 'How does featured placement work?', answer: 'Featured listings appear at the top of search results and on the homepage. Featured slots are part of the Pro and Elite subscription plans.' },
      ],
    },
    {
      title: 'Payments & Billing',
      items: [
        { question: 'How do payments work?', answer: 'All subscription billing runs through Moyasar, a Saudi-licensed payment processor that supports mada, Visa, Mastercard, and Apple Pay. Receipts are emailed automatically.' },
        { question: 'Can I cancel my subscription?', answer: 'Yes. You can cancel at any time from the Subscription page. Your plan stays active until the end of the current billing period.' },
        { question: 'Are refunds available?', answer: 'We process refunds for billing errors and accidental upgrades within 14 days. Contact support with your invoice number and we will resolve quickly.' },
      ],
    },
    {
      title: 'Technical Support',
      items: [
        { question: 'I forgot my password — what now?', answer: 'Click "Forgot password" on the sign-in page and enter your email. We will send a reset link valid for 30 minutes. Check your spam folder if the email does not arrive.' },
        { question: 'Why am I not receiving notifications?', answer: 'Check Settings → Notifications to make sure email and in-app notifications are enabled for the events you care about. Browser notifications also require permission.' },
        { question: 'A page is broken or showing an error.', answer: 'Try refreshing the page first. If the issue persists, please contact support with the URL, your browser, and a screenshot if possible. We respond within 24 hours.' },
      ],
    },
  ],
  ar: [
    {
      title: 'البداية',
      items: [
        { question: 'ما هي عَوْلَمَة؟', answer: 'عَوْلَمَة هي سوق عقاري سعودي يربط بين الوكلاء المعتمدين والمشترين والمستأجرين في جميع أنحاء المملكة. تصفح العقارات، احفظ المفضلة، تواصل مع الوكلاء، وأتمم المعاملات بشفافية كاملة.' },
        { question: 'هل أحتاج حساباً لتصفح الإعلانات؟', answer: 'لا. يمكن لأي شخص البحث وعرض الإعلانات دون تسجيل دخول. إنشاء حساب مجاني يتيح لك حفظ المفضلة عبر الأجهزة، وإرسال الاستفسارات، ومراسلة الوكلاء مباشرة.' },
        { question: 'هل عَوْلَمَة متوفرة بالعربية؟', answer: 'نعم — المنصة بأكملها ثنائية اللغة بالكامل مع دعم RTL. استخدم زر اللغة في الشريط العلوي للتبديل بين العربية والإنجليزية في أي وقت.' },
        { question: 'كيف يتم التحقق من الإعلانات؟', answer: 'كل إعلان يمر بعملية مراجعة قبل نشره. يجب أن يكون الوكلاء معتمدين من الهيئة العامة للعقار (REGA) قبل النشر.' },
      ],
    },
    {
      title: 'للمشترين',
      items: [
        { question: 'كيف أبحث عن العقارات؟', answer: 'استخدم شريط البحث في الصفحة الرئيسية للتصفية حسب المدينة أو الحي أو الكلمة المفتاحية. تتيح صفحة البحث تنقيح النتائج حسب السعر وغرف النوم ودورات المياه والمساحة والمميزات والمزيد.' },
        { question: 'كيف أحفظ عقاراً في المفضلة؟', answer: 'انقر على أيقونة القلب على أي بطاقة عقار أو صفحة تفاصيل. يتم مزامنة العقارات المحفوظة عبر جميع أجهزتك عند تسجيل الدخول. الحفظ المجهول يبقى محلياً على الجهاز.' },
        { question: 'كيف أتواصل مع الوكيل؟', answer: 'في أي صفحة تفاصيل عقار، استخدم نموذج الاستفسار لإرسال رسالة، أو انقر على "واتساب" لبدء محادثة. يمكنك أيضاً استخدام ميزة الرسائل داخل المنصة بعد تسجيل الدخول.' },
        { question: 'هل يمكنني مقارنة الإعلانات جنباً إلى جنب؟', answer: 'نعم. انقر على أيقونة المقارنة على أي بطاقة عقار لإضافته لقائمة المقارنة (بحد أقصى 3). تُبرز صفحة المقارنة القيمة الأفضل في كل صف.' },
      ],
    },
    {
      title: 'للوكلاء',
      items: [
        { question: 'كيف أُدرج إعلاني الأول؟', answer: 'سجّل كوكيل، أكمل التحقق من REGA، واستخدم زر "إعلان جديد" في لوحة التحكم. يرشدك المعالج عبر تفاصيل العقار ورفع الوسائط والتقديم للمراجعة.' },
        { question: 'كيف أدير إعلاناتي؟', answer: 'تعرض صفحة "إعلاناتي" في لوحة التحكم كل إعلان تملكه مع إجراءات سريعة للتعديل أو الأرشفة أو عرض التحليلات. تُبرز الصفحة الرئيسية للوحة التحكم الإعلانات التي تحتاج انتباهاً.' },
        { question: 'كيف أُرقي باقتي؟', answer: 'زُر صفحة الاشتراك في لوحة التحكم لمقارنة الباقات والترقية. تُتيح الترقيات إعلانات نشطة أكثر، وموقعاً مميزاً، وتحليلات أعمق.' },
        { question: 'كيف يعمل الموقع المميز؟', answer: 'تظهر الإعلانات المميزة في أعلى نتائج البحث وفي الصفحة الرئيسية. المواقع المميزة جزء من باقات Pro وElite.' },
      ],
    },
    {
      title: 'المدفوعات والفوترة',
      items: [
        { question: 'كيف تعمل المدفوعات؟', answer: 'تتم جميع فواتير الاشتراك من خلال Moyasar، وهي بوابة دفع مرخصة سعودية تدعم مدى وVisa وMastercard وApple Pay. تُرسل الإيصالات بالبريد تلقائياً.' },
        { question: 'هل يمكنني إلغاء اشتراكي؟', answer: 'نعم. يمكنك الإلغاء في أي وقت من صفحة الاشتراك. تبقى باقتك نشطة حتى نهاية فترة الفوترة الحالية.' },
        { question: 'هل تتوفر المبالغ المستردة؟', answer: 'نعالج المبالغ المستردة لأخطاء الفوترة والترقيات غير المقصودة خلال 14 يوماً. تواصل مع الدعم مع رقم الفاتورة وسنحلها بسرعة.' },
      ],
    },
    {
      title: 'الدعم الفني',
      items: [
        { question: 'نسيت كلمة المرور — ماذا الآن؟', answer: 'انقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول وأدخل بريدك الإلكتروني. سنرسل رابط إعادة تعيين صالح لمدة 30 دقيقة. تحقق من مجلد الرسائل غير المرغوب فيها إذا لم يصل البريد.' },
        { question: 'لماذا لا أستلم الإشعارات؟', answer: 'تحقق من الإعدادات ← الإشعارات للتأكد من تفعيل الإشعارات بالبريد وداخل التطبيق للأحداث التي تهمك. تتطلب إشعارات المتصفح إذناً أيضاً.' },
        { question: 'الصفحة معطلة أو تظهر خطأ.', answer: 'حاول تحديث الصفحة أولاً. إذا استمرت المشكلة، يرجى التواصل مع الدعم مع الرابط ومتصفحك ولقطة شاشة إن أمكن. نرد خلال 24 ساعة.' },
      ],
    },
  ],
};

export function HelpPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const isAr = i18n.language === 'ar';
  const sections = isAr ? FAQ_DATA.ar : FAQ_DATA.en;

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  return (
    <Box>
      <Helmet>
        <title>{t('help.title')} — {t('app.name')}</title>
      </Helmet>

      {/* Compact purple header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            <HelpIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {t('help.title')}
            </Typography>
          </Stack>
          <Typography sx={{ opacity: 0.85, fontSize: '0.9rem', mb: 2, maxWidth: 640 }}>
            {t('help.subtitle')}
          </Typography>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { bgcolor: 'background.paper', borderRadius: 1, '& fieldset': { border: 'none' } },
            }}
            sx={{ maxWidth: 540 }}
          />
        </Box>
      </Box>

      {/* FAQs */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 3, sm: 4, md: 6 },
          py: { xs: 5, md: 7 },
        }}
      >
        {filteredSections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t('help.noResultsTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('help.noResultsBody')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={5}>
            {filteredSections.map((section) => (
              <Box key={section.title}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, mb: 2, color: 'primary.dark' }}>
                  {section.title}
                </Typography>
                {section.items.map((faq, idx) => (
                  <Accordion
                    key={idx}
                    disableGutters
                    elevation={0}
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1.25,
                      '&::before': { display: 'none' },
                      '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ))}
          </Stack>
        )}

        {/* Bottom CTA */}
        <Box
          sx={{
            mt: 6,
            p: { xs: 4, md: 5 },
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: 1,
            borderColor: alpha(theme.palette.primary.main, 0.2),
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            {t('help.stillNeedHelp')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('help.respondsIn')}
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ background: theme.eawlma.gradient, fontWeight: 700, px: 4 }}
            onClick={() => void navigate({ to: '/contact' })}
          >
            {t('help.contactUs')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
