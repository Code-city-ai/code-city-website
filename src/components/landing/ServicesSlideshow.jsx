import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeMode } from './ThemeContext';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
    title: 'Strategy & Planning',
    text: 'Clear direction for digital growth, execution, and long-term impact.'
  },
  {
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    title: 'Design & Experience',
    text: 'Modern interfaces and strong visual systems built for credibility.'
  },
  {
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80',
    title: 'Delivery & Results',
    text: 'Professional execution across software, branding, and marketing.'
  }
];

export default function ServicesSlideshow() {
  const { isDark } = useThemeMode();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  const activeSlide = slides[activeIndex];

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[32px]">
      <AnimatePresence mode="wait">
        <motion.img
          key={activeSlide.image}
          src={activeSlide.image}
          alt={activeSlide.title}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0.4, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.4 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </AnimatePresence>

      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/55' : 'absolute inset-0 bg-white/35'} />
      <div className={isDark ? 'absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.12)_0%,rgba(7,17,31,0.78)_100%)]' : 'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.82)_100%)]'} />

      <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
        <div className={isDark ? 'max-w-md rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl' : 'max-w-md rounded-[28px] border border-white/70 bg-white/88 p-6 backdrop-blur-xl'}>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#f9761b]">Featured Work</p>
          <h3 className={isDark ? 'text-2xl font-semibold text-white' : 'text-2xl font-semibold text-slate-950'}>{activeSlide.title}</h3>
          <p className={isDark ? 'mt-3 text-sm leading-relaxed text-slate-300' : 'mt-3 text-sm leading-relaxed text-slate-600'}>{activeSlide.text}</p>
        </div>

        <div className="mt-5 flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={index === activeIndex ? 'h-2.5 w-8 rounded-full bg-[#f55029]' : isDark ? 'h-2.5 w-2.5 rounded-full bg-white/35' : 'h-2.5 w-2.5 rounded-full bg-slate-400/60'}
              aria-label={`Show slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}