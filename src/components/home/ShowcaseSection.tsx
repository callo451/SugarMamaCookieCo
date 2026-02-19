import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface CollectionCard {
  title: string;
  description: string;
  hero?: boolean;
  image?: string;
}

const collections: CollectionCard[] = [
  {
    title: 'Wedding & Engagement',
    description: 'Elegant cookies for your special day',
    hero: true,
    image: '/weddings.png',
  },
  {
    title: 'Birthday & Celebration',
    description: 'Fun and festive designs for any party',
    image: '/birthday.png',
  },
  {
    title: 'Corporate Events',
    description: 'Professional cookies for business occasions',
    image: '/customcollections.png',
  },
  {
    title: 'Baby Showers',
    description: 'Sweet treats for welcoming little ones',
    image: '/babyshower.png',
  },
  {
    title: 'Seasonal Collections',
    description: 'Holiday-themed cookies throughout the year',
    image: '/seasonal.png',
  },
  {
    title: 'Custom Collections',
    description: 'Your unique vision brought to life',
    image: '/customcollections.png',
  },
];

export default function ShowcaseSection() {
  return (
    <section className="px-6 py-24 sm:px-10 md:px-16 lg:px-20 lg:py-32">
      {/* Section header */}
      <div className="mb-16 text-center">
        <h2 className="font-display text-3xl font-semibold lg:text-5xl">
          What We Create
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          From intimate celebrations to corporate events
        </p>
      </div>

      {/* Bento grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((card, index) => {
          const isHero = card.hero;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={isHero ? 'lg:col-span-2 lg:row-span-2' : ''}
            >
              <Link
                to="/quote-builder"
                className={`group relative block overflow-hidden rounded-2xl ${
                  isHero
                    ? 'min-h-[500px] lg:min-h-0 lg:h-full'
                    : 'min-h-[250px]'
                }`}
              >
                {/* Card background image or fallback */}
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-sage-300 via-sage-400 to-sage-600" />
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Card content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                  <h3
                    className={`font-display font-semibold text-white ${
                      isHero
                        ? 'text-2xl lg:text-3xl'
                        : 'text-xl lg:text-2xl'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    {card.description}
                  </p>

                  {/* Hover reveal CTA */}
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Get a quote
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
