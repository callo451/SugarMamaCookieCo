import { useRef } from 'react';

const testimonials = [
  {
    name: 'Stacey Boyce',
    content: 'They are so cute. Thank you!',
    location: 'Albury',
  },
  {
    name: 'Mel Brizzi',
    content:
      'Hey just wanted to say my 20 year old son has nearly eaten every cookie \u{1F4F7} he said they are the best his ever had. \u{1F4F7}',
    location: 'Leneva',
  },
  {
    name: 'Lucy Rose Harrison',
    content: 'They were delicious.. once again!!',
    location: 'Albury',
  },
  {
    name: 'Wodonga Hockey Club',
    content:
      "They were awesome. Looked amazing and tasty too! We'll be ordering again next year.",
    location: 'Wodonga',
  },
];

const doubled = [...testimonials, ...testimonials];

function TestimonialCard({
  name,
  content,
  location,
}: {
  name: string;
  content: string;
  location: string;
}) {
  return (
    <div className="min-w-[300px] max-w-[350px] flex-shrink-0 bg-white border border-sage-100 rounded-2xl px-6 py-8">
      {/* Decorative open quote */}
      <span className="text-5xl text-sage-200 font-display leading-none mb-2 block">
        &ldquo;
      </span>

      {/* Quote text */}
      <p className="text-base text-gray-700 italic leading-relaxed">
        {content}
      </p>

      {/* Divider */}
      <div className="w-8 h-0.5 bg-sage-300 my-4" />

      {/* Attribution */}
      <p className="text-sm font-semibold text-gray-900">{name}</p>
      <p className="text-xs text-sage-500">{location}</p>
    </div>
  );
}

export default function TestimonialsSection() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-24 lg:py-32 bg-sage-50 overflow-hidden">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 25s linear infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="font-display text-3xl lg:text-5xl font-semibold text-center text-gray-900">
          What People Are Saying
        </h2>
      </div>

      <div
        className="group relative"
        onMouseEnter={() => {
          if (marqueeRef.current)
            marqueeRef.current.style.animationPlayState = 'paused';
        }}
        onMouseLeave={() => {
          if (marqueeRef.current)
            marqueeRef.current.style.animationPlayState = 'running';
        }}
      >
        <div ref={marqueeRef} className="flex gap-6 w-max marquee-track">
          {doubled.map((t, i) => (
            <TestimonialCard
              key={i}
              name={t.name}
              content={t.content}
              location={t.location}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
