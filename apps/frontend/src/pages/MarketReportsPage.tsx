import {
  Box, Container, Typography, Grid, Paper,
  Tabs, Tab, Chip, Button,
  Card, CardContent, Select, MenuItem,
  FormControl, InputLabel,
} from '@mui/material';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell,
} from 'recharts';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { formatNumber } from '@/utils/formatters';
import RTLChart from '@/components/charts/RTLChart';
import { useChartTranslations } from '@/hooks/useChartTranslations';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// ── Static market data (replace with an API later) ──
const MONTHLY_PRICE_TRENDS = [
  { month: 'Jan', riyadh: 9200,  jeddah: 8800,  dammam: 6500 },
  { month: 'Feb', riyadh: 9350,  jeddah: 8900,  dammam: 6600 },
  { month: 'Mar', riyadh: 9500,  jeddah: 9100,  dammam: 6700 },
  { month: 'Apr', riyadh: 9800,  jeddah: 9300,  dammam: 6800 },
  { month: 'May', riyadh: 10200, jeddah: 9500,  dammam: 7000 },
  { month: 'Jun', riyadh: 10500, jeddah: 9800,  dammam: 7200 },
  { month: 'Jul', riyadh: 10800, jeddah: 10000, dammam: 7300 },
  { month: 'Aug', riyadh: 11000, jeddah: 10200, dammam: 7500 },
  { month: 'Sep', riyadh: 11200, jeddah: 10400, dammam: 7600 },
  { month: 'Oct', riyadh: 11500, jeddah: 10700, dammam: 7800 },
  { month: 'Nov', riyadh: 11800, jeddah: 11000, dammam: 8000 },
  { month: 'Dec', riyadh: 12000, jeddah: 11200, dammam: 8200 },
];

const SUPPLY_DEMAND = [
  { month: 'Jan', supply: 1200, demand: 1800, deals: 450 },
  { month: 'Feb', supply: 1300, demand: 1900, deals: 480 },
  { month: 'Mar', supply: 1400, demand: 2100, deals: 520 },
  { month: 'Apr', supply: 1500, demand: 2300, deals: 580 },
  { month: 'May', supply: 1600, demand: 2500, deals: 620 },
  { month: 'Jun', supply: 1700, demand: 2200, deals: 590 },
  { month: 'Jul', supply: 1800, demand: 2000, deals: 560 },
  { month: 'Aug', supply: 1900, demand: 2100, deals: 570 },
  { month: 'Sep', supply: 2000, demand: 2400, deals: 610 },
  { month: 'Oct', supply: 2100, demand: 2600, deals: 650 },
  { month: 'Nov', supply: 2200, demand: 2800, deals: 690 },
  { month: 'Dec', supply: 2300, demand: 3000, deals: 720 },
];

const PROPERTY_TYPE_MIX = [
  { name: 'Apartment',  nameAr: 'شقة',   value: 45, color: '#6C63A6' },
  { name: 'Villa',      nameAr: 'فيلا',  value: 28, color: '#10B981' },
  { name: 'Land',       nameAr: 'أرض',   value: 15, color: '#F59E0B' },
  { name: 'Commercial', nameAr: 'تجاري', value: 8,  color: '#EF4444' },
  { name: 'Other',      nameAr: 'أخرى',  value: 4,  color: '#8B5CF6' },
];

const INVESTMENT_OPPORTUNITIES = [
  {
    area: 'NEOM Area',             areaAr: 'منطقة نيوم',
    roi: 28.5, risk: 'medium',    growth: '+25% YoY',
    reason: 'Vision 2030 mega project', reasonAr: 'مشروع رؤية 2030',
    pricePerSqm: 15000,
  },
  {
    area: 'Al Olaya, Riyadh',      areaAr: 'العليا، الرياض',
    roi: 12.3, risk: 'low',       growth: '+5.2% YoY',
    reason: 'Premium business district', reasonAr: 'حي الأعمال المميز',
    pricePerSqm: 12000,
  },
  {
    area: 'Jeddah Corniche',       areaAr: 'كورنيش جدة',
    roi: 15.8, risk: 'low',       growth: '+7.5% YoY',
    reason: 'Tourism and sea views', reasonAr: 'السياحة والإطلالة البحرية',
    pricePerSqm: 13000,
  },
  {
    area: 'Red Sea Project Area',  areaAr: 'منطقة مشروع البحر الأحمر',
    roi: 22.1, risk: 'medium',    growth: '+18% YoY',
    reason: 'Luxury tourism development', reasonAr: 'تطوير السياحة الفاخرة',
    pricePerSqm: 18000,
  },
  {
    area: 'Qiddiya, Riyadh',       areaAr: 'القدية، الرياض',
    roi: 19.5, risk: 'medium',    growth: '+15% YoY',
    reason: 'Entertainment city project', reasonAr: 'مشروع مدينة الترفيه',
    pricePerSqm: 8500,
  },
];

const KPI_CARDS = [
  {
    icon: HomeIcon,
    titleKey: 'reports.totalListings',
    title: 'Total Active Listings',
    value: '144,738',
    change: '+12.3%',
    color: '#6C63A6',
  },
  {
    icon: PeopleIcon,
    titleKey: 'reports.monthlySearches',
    title: 'Monthly Searches',
    value: '400M+',
    change: '+8.5%',
    color: '#10B981',
  },
  {
    icon: AttachMoneyIcon,
    titleKey: 'reports.avgPrice',
    title: 'Avg Price/m² Riyadh',
    value: '12,000 SAR',
    change: '+5.2%',
    color: '#F59E0B',
  },
  {
    icon: TrendingUpIcon,
    titleKey: 'reports.deals',
    title: 'Deals This Month',
    value: '720',
    change: '+4.3%',
    color: '#EF4444',
  },
];

export function MarketReportsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [tab, setTab] = useState(0);
  const [city, setCity] = useState('all');
  const { translateLabel, formatTooltipValue, formatNumber: fmtNum, rtlYAxisProps } =
    useChartTranslations();
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    document.title = 'Eawlma Market Report - ' + new Date().toLocaleDateString();

    // Temporarily reveal all hidden tab panels so the print includes every section
    const tabPanels = document.querySelectorAll('[role="tabpanel"]');
    const hiddenPanels: HTMLElement[] = [];

    tabPanels.forEach((panel) => {
      const el = panel as HTMLElement;
      if (el.style.display === 'none' || el.hidden) {
        hiddenPanels.push(el);
        el.style.display = 'block';
      }
    });

    window.print();

    setTimeout(() => {
      hiddenPanels.forEach((el) => {
        el.style.display = '';
      });
      document.title = 'Eawlma';
    }, 1000);
  };

  return (
    <Box ref={reportRef} sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>{t('reports.title', 'Saudi Real Estate Market Reports')}</title>
      </Helmet>

      {/* Full-bleed purple header — matches AboutPage convention */}
      <Box
        className="market-report-header"
        sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75 }}>
              📊 {t('reports.title', 'Saudi Real Estate Market Reports')}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 720 }}>
              {t('reports.subtitle', 'Monthly insights, price trends, and investment opportunities')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl
              size="small"
              sx={{
                minWidth: 140,
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                '& .MuiOutlinedInput-root': {
                  color: 'common.white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.7)' },
                },
                '& .MuiSvgIcon-root': { color: 'common.white' },
              }}
            >
              <InputLabel>{t('common.city', 'City')}</InputLabel>
              <Select
                value={city}
                label={t('common.city', 'City')}
                onChange={(e) => setCity(e.target.value)}
              >
                <MenuItem value="all">{t('common.allCities', 'All Cities')}</MenuItem>
                <MenuItem value="riyadh">{t('cities.riyadh', 'Riyadh')}</MenuItem>
                <MenuItem value="jeddah">{t('cities.jeddah', 'Jeddah')}</MenuItem>
                <MenuItem value="dammam">{t('cities.dammam', 'Dammam')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadPDF}
              sx={{
                color: 'common.white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              {t('reports.download', 'Download PDF')}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Body content */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 8, md: 12 } }}>

        {/* Print-only header */}
        <Box
          sx={{
            display: 'none',
            '@media print': { display: 'block' },
            mb: 3,
            pb: 2,
            borderBottom: '2px solid #6C63A6',
          }}
        >
          <Typography variant="h4" fontWeight={800}>
            📊 {t('reports.title', 'Saudi Real Estate Market Reports')}
          </Typography>
          <Typography color="text.secondary">
            {t('reports.subtitle', 'Monthly insights, price trends, and investment opportunities')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Generated: {new Date().toLocaleDateString()}
          </Typography>
        </Box>

        {/* KPI cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {KPI_CARDS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Grid item xs={12} sm={6} md={3} key={kpi.titleKey}>
                <Paper sx={{ p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      insetInlineEnd: 0,
                      width: 80,
                      height: 80,
                      bgcolor: kpi.color + '15',
                      borderRadius: '0 0 0 100%',
                    }}
                  />
                  <Icon sx={{ color: kpi.color, mb: 1, fontSize: 28 }} />
                  <Typography variant="h4" fontWeight={900}>
                    {kpi.value}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                    {t(kpi.titleKey, kpi.title)}
                  </Typography>
                  <Chip label={kpi.change} size="small" color="success" sx={{ mt: 1 }} />
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable">
          <Tab label={t('reports.priceTrends', 'Price Trends')} />
          <Tab label={t('reports.supplyDemand', 'Supply & Demand')} />
          <Tab label={t('reports.propertyMix', 'Property Mix')} />
          <Tab label={t('reports.investment', 'Investment Opportunities')} />
        </Tabs>

        {/* Tab 1: Price trends */}
        <Box
          role="tabpanel"
          sx={{ display: tab === 0 ? 'block' : 'none' }}
          className={tab !== 0 ? 'print-show' : ''}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  {t('reports.avgPricePerSqm', 'Average Price per m² by City (SAR)')}
                </Typography>
                <RTLChart height={350}>
                  <ResponsiveContainer>
                    <LineChart data={MONTHLY_PRICE_TRENDS}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={translateLabel} />
                      <YAxis tickFormatter={fmtNum} {...rtlYAxisProps} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend />
                      <Line type="monotone" dataKey="riyadh" name={t('cities.riyadh', 'Riyadh')} stroke="#6C63A6" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="jeddah" name={t('cities.jeddah', 'Jeddah')} stroke="#10B981" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="dammam" name={t('cities.dammam', 'Dammam')} stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </RTLChart>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Tab 2: Supply & demand */}
        <Box
          role="tabpanel"
          sx={{ display: tab === 1 ? 'block' : 'none' }}
          className={tab !== 1 ? 'print-show' : ''}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  {t('reports.supplyDemandTitle', 'Supply vs Demand vs Deals Closed')}
                </Typography>
                <RTLChart height={350}>
                  <ResponsiveContainer>
                    <AreaChart data={SUPPLY_DEMAND}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={translateLabel} />
                      <YAxis tickFormatter={fmtNum} {...rtlYAxisProps} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend />
                      <Area type="monotone" dataKey="demand"  name={t('reports.demand', 'Demand')}        stroke="#EF4444" fill="#EF444420" strokeWidth={2} />
                      <Area type="monotone" dataKey="supply"  name={t('reports.supply', 'Supply')}        stroke="#6C63A6" fill="#6C63A620" strokeWidth={2} />
                      <Area type="monotone" dataKey="deals"   name={t('reports.dealsClosed', 'Deals Closed')} stroke="#10B981" fill="#10B98120" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </RTLChart>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Tab 3: Property mix */}
        <Box
          role="tabpanel"
          sx={{ display: tab === 2 ? 'block' : 'none' }}
          className={tab !== 2 ? 'print-show' : ''}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  {t('reports.propertyTypeMix', 'Property Type Distribution')}
                </Typography>
                <RTLChart height={300}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={PROPERTY_TYPE_MIX}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${isAr ? '' : name} ${value}%`}
                      >
                        {PROPERTY_TYPE_MIX.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Legend
                        formatter={(v) => {
                          const item = PROPERTY_TYPE_MIX.find((p) => p.name === v);
                          return isAr ? item?.nameAr || String(v) : String(v);
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </RTLChart>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  {t('reports.marketSummary', 'Market Summary')}
                </Typography>
                {[
                  { label: t('reports.totalValue',      'Total Market Value'),  value: 'SAR 127B+' },
                  { label: t('reports.yoyGrowth',       'YoY Growth'),          value: '+8.5%'     },
                  { label: t('reports.avgDaysOnMarket', 'Avg Days on Market'),  value: '45 days'   },
                  { label: t('reports.foreignOwnership','Foreign Ownership'),   value: '12.3%'     },
                  { label: t('reports.offPlanShare',    'Off-Plan Share'),      value: '28%'       },
                  { label: t('reports.vision2030Impact','Vision 2030 Impact'),  value: '🚀 High'   },
                ].map((item, i) => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: i < 5 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography color="text.secondary">{item.label}</Typography>
                    <Typography fontWeight={700}>{item.value}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Tab 4: Investment opportunities */}
        <Box
          role="tabpanel"
          sx={{ display: tab === 3 ? 'block' : 'none' }}
          className={tab !== 3 ? 'print-show' : ''}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {t('reports.topInvestment', 'Top Investment Opportunities')}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                  {t('reports.investmentDesc', 'Based on price trends, Vision 2030 projects, and market demand')}
                </Typography>
                <Grid container spacing={2}>
                  {INVESTMENT_OPPORTUNITIES.map((opp) => (
                    <Grid item xs={12} md={6} lg={4} key={opp.area}>
                      <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography fontWeight={800} fontSize={15}>
                              {isAr ? opp.areaAr : opp.area}
                            </Typography>
                            <Chip
                              label={opp.risk}
                              size="small"
                              color={opp.risk === 'low' ? 'success' : 'warning'}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {t('reports.roi', 'ROI')}
                              </Typography>
                              <Typography variant="h6" fontWeight={900} color="success.main">
                                {opp.roi}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {t('reports.growth', 'Growth')}
                              </Typography>
                              <Typography variant="h6" fontWeight={900} color="primary.main">
                                {opp.growth}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {t('reports.pricePerSqm', 'SAR/m²')}
                              </Typography>
                              <Typography variant="h6" fontWeight={900}>
                                {formatNumber(opp.pricePerSqm)}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {isAr ? opp.reasonAr : opp.reason}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Disclaimer */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t(
              'reports.disclaimer',
              '* Data based on platform listings and Saudi real estate market estimates. For investment decisions, consult a licensed real estate advisor.',
            )}
          </Typography>
        </Box>

      </Container>
    </Box>
  );
}