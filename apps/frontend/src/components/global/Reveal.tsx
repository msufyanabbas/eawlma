import { motion, useInView, type Variants } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

/**
 * Scroll-triggered entrance animation — fades content in from below as it
 * enters the viewport. Used to add subtle motion to home/search/detail pages
 * without imposing a heavy library or per-section ref boilerplate.
 *
 *   variant=fadeUp    (default) — opacity 0→1 + translateY 30→0
 *   variant=fadeLeft  — opacity 0→1 + translateX 30→0  (use for sidebar)
 *   variant=fadeRight — opacity 0→1 + translateX -30→0 (use for sidebar)
 *   variant=scaleIn   — opacity 0→1 + scale 0.95→1
 *
 * Pass `as="div" | "li" | …` to change the wrapper element.
 */
type Variant = 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scaleIn';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in seconds — useful for grid items. */
  delay?: number;
  duration?: number;
  variant?: Variant;
  /** Wrapper tag — defaults to a block <div>. */
  as?: 'div' | 'section' | 'li' | 'span';
  className?: string;
  style?: React.CSSProperties;
}

const VARIANTS: Record<Variant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function Reveal({
  children,
  delay = 0,
  duration = 0.5,
  variant = 'fadeUp',
  as = 'div',
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={VARIANTS[variant]}
      transition={{ duration, ease: 'easeOut', delay }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
