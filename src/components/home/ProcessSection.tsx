import { motion } from 'framer-motion';
import { Cookie, Palette, Sparkles, Shapes } from 'lucide-react';

const steps = [
  {
    icon: Cookie,
    title: 'Choose Your Base',
    description:
      'Select from our signature Gingerbread or classic Vanilla Sugar Cookie dough',
    options: ['Gingerbread', 'Vanilla Sugar'],
  },
  {
    icon: Palette,
    title: 'Pick Your Colours',
    description:
      'Match your brand, event theme, or choose from our curated palette',
    options: ['Corporate Branding', 'Custom Colours', 'Decorative Finishes'],
  },
  {
    icon: Sparkles,
    title: 'Select Your Theme',
    description: 'Perfect for any occasion or celebration',
    options: ['Weddings', 'Birthdays', 'Baby Showers', 'Corporate'],
  },
  {
    icon: Shapes,
    title: 'Choose Your Shape',
    description: 'Express yourself with our variety of cookie shapes',
    options: ['Hearts', 'Circles', 'Flowers', 'Custom Shapes'],
  },
];

export default function ProcessSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl lg:text-5xl font-semibold text-gray-900">
            How It Works
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Four simple steps to your perfect cookies
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line on desktop */}
          <motion.div
            className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-0.5 bg-sage-200"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left' }}
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            const stepNumber = String(index + 1).padStart(2, '0');

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                className="group relative overflow-hidden rounded-xl p-6 text-center hover:-translate-y-1 transition-all duration-300"
              >
                {/* Watermark step number */}
                <span className="text-7xl font-bold text-sage-50 absolute -top-4 right-2 select-none pointer-events-none">
                  {stepNumber}
                </span>

                {/* Icon circle */}
                <div className="w-14 h-14 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-sage-500">
                  <Icon className="w-6 h-6 text-sage-600 transition-colors duration-300 group-hover:text-white" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {step.description}
                </p>

                {/* Option pills */}
                <div className="flex flex-wrap justify-center gap-2">
                  {step.options.map((option) => (
                    <span
                      key={option}
                      className="bg-sage-50 text-sage-700 text-xs px-3 py-1 rounded-full font-medium"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
