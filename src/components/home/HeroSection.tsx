import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';

const HERO_IMAGE_URL = '/hero.jpg';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function HeroSection() {
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background image */}
      {!imageError ? (
        <img
          src={HERO_IMAGE_URL}
          alt="Sugar Mama Cookie Co. custom cookies"
          loading="eager"
          fetchPriority="high"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* Fallback sage gradient background */
        <div className="absolute inset-0 bg-gradient-to-br from-sage-400 via-sage-500 to-sage-700" />
      )}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Content positioned at bottom-left */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="absolute bottom-0 left-0 px-6 pb-24 sm:px-10 md:px-16 lg:px-20 lg:pb-32"
      >
        {/* Eyebrow */}
        <motion.p
          variants={childVariants}
          className="text-xs font-medium uppercase tracking-[0.2em] text-white/70"
        >
          Albury-Wodonga's Custom Cookie Bakery
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={childVariants}
          className="mt-4 font-display text-5xl font-semibold leading-[1.1] text-white lg:text-7xl"
        >
          Cookies That Tell
          <br />
          Your Story
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={childVariants}
          className="mt-5 max-w-lg text-lg text-white/80 lg:text-xl"
        >
          Custom-designed for weddings, events &amp; celebrations.
        </motion.p>

        {/* CTA Button */}
        <motion.div variants={childVariants} className="mt-8">
          <Link
            to="/quote-builder"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-sage-700 transition-all duration-300 hover:border-2 hover:border-white hover:bg-transparent hover:text-white"
          >
            Get a Quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Secondary link */}
        <motion.div variants={childVariants} className="mt-4">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-1 text-sm text-white/70 transition-colors duration-200 hover:text-white"
          >
            or explore our gallery
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator at bottom center */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-6 w-6 text-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
