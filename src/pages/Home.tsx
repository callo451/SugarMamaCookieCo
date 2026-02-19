import HeroSection from '../components/home/HeroSection';
import ShowcaseSection from '../components/home/ShowcaseSection';
import ProcessSection from '../components/home/ProcessSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CtaSection from '../components/home/CtaSection';
import ContactForm from '../components/ContactForm';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ShowcaseSection />
      <ProcessSection />
      <TestimonialsSection />
      <CtaSection />
      <ContactForm />
    </div>
  );
}
