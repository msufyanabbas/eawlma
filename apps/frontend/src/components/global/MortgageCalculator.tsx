import {
  Box,
  Grid,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useMemo, useState } from 'react';

interface MortgageCalculatorProps {
  /** Initial property price in SAR (defaults to 0). */
  price: number;
  /** Currency label suffix shown next to figures (e.g. "SAR"). */
  currency: string;
}

const TERM_OPTIONS = [10, 15, 20, 25, 30] as const;

/** Standard amortising-loan formula:
 *    M = P · r(1+r)^n / ((1+r)^n - 1)
 *  where P = principal, r = monthly rate (annual / 12 / 100), n = months.
 *  Returns 0 when r = 0 and term length is 0. */
function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function MortgageCalculator({ price, currency }: MortgageCalculatorProps) {
  const theme = useTheme();
  const [propertyPrice, setPropertyPrice] = useState<number>(price);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20);
  const [loanTerm, setLoanTerm] = useState<number>(25);
  const [interestRate, setInterestRate] = useState<number>(4.5);

  const calc = useMemo(() => {
    const downPaymentAmount = (propertyPrice * downPaymentPct) / 100;
    const loanAmount = propertyPrice - downPaymentAmount;
    const monthly = monthlyPayment(loanAmount, interestRate, loanTerm);
    const totalPayment = monthly * loanTerm * 12;
    const totalInterest = Math.max(0, totalPayment - loanAmount);
    return { downPaymentAmount, loanAmount, monthly, totalPayment, totalInterest };
  }, [propertyPrice, downPaymentPct, loanTerm, interestRate]);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.2),
        boxShadow: '0 6px 18px rgba(108,99,166,0.08)',
        bgcolor: 'background.paper',
      }}
    >
      {/* Lavender gradient header bar */}
      <Box
        sx={{
          background: theme.eawlma.gradient,
          color: 'common.white',
          px: { xs: 2.5, md: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <AccountBalanceIcon />
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
          🏦 Mortgage Calculator
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Grid container spacing={3}>
          {/* Inputs */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Property price ({currency})
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Math.max(0, Number(e.target.value)))}
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Down payment
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    {downPaymentPct}% · {fmt(calc.downPaymentAmount)} {currency}
                  </Typography>
                </Stack>
                <Slider
                  value={downPaymentPct}
                  onChange={(_, v) => setDownPaymentPct(v as number)}
                  min={10}
                  max={50}
                  step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  Loan term (years)
                </Typography>
                <ToggleButtonGroup
                  value={loanTerm}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_, v) => v && setLoanTerm(v as number)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      fontWeight: 700,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                    },
                  }}
                >
                  {TERM_OPTIONS.map((y) => (
                    <ToggleButton key={y} value={y}>{y}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Annual interest rate (%)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={interestRate}
                  inputProps={{ step: 0.1, min: 0, max: 20 }}
                  onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value)))}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>
          </Grid>

          {/* Results */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.18),
                borderRadius: 2,
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Estimated monthly payment
                </Typography>
                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: 'primary.dark', lineHeight: 1.1, mt: 0.5 }}>
                  {fmt(calc.monthly)}
                  <Typography component="span" sx={{ fontSize: '1rem', ml: 1, color: 'text.secondary', fontWeight: 600 }}>
                    {currency}/mo
                  </Typography>
                </Typography>
              </Box>

              <Stack spacing={1.25} sx={{ mt: 3 }}>
                <ResultRow label="Loan amount" value={`${fmt(calc.loanAmount)} ${currency}`} />
                <ResultRow label="Total payment" value={`${fmt(calc.totalPayment)} ${currency}`} />
                <ResultRow label="Total interest" value={`${fmt(calc.totalInterest)} ${currency}`} />
                <ResultRow label="Down payment" value={`${fmt(calc.downPaymentAmount)} ${currency}`} />
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                This is an estimate. Consult your bank for an actual loan offer.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{value}</Typography>
    </Stack>
  );
}
