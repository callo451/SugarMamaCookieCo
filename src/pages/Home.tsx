import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Cookie, Palette, Sparkles, Shapes, Loader2 } from 'lucide-react';
import ContactForm from '../components/ContactForm';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { supabaseAdmin as supabase } from '../lib/supabase';

interface GalleryImage {
  name: string;
  url: string;
  created_at: string;
  metadata: {
    category?: string;
  };
}

function TimelineSection() {
  const [isVisible, setIsVisible] = React.useState(false);
  const timelineRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (timelineRef.current) {
      observer.observe(timelineRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      icon: Cookie,
      title: 'Select your dough',
      description: 'Choose between our signature Ginger Bread or classic Vanilla Sugar Cookie base',
      options: ['Ginger Bread', 'Vanilla Sugar Cookie']
    },
    {
      icon: Palette,
      title: 'Pick your colours',
      description: 'Match your brand colours or choose from our curated palette of decorative options',
      options: ['Corporate Branding', 'Custom Colours', 'Decorative Finishes']
    },
    {
      icon: Sparkles,
      title: 'Choose your theme',
      description: 'Perfect for any occasion or celebration',
      options: ['Christmas', 'Birthday', 'Baby Showers', 'Hens Day', 'Weddings']
    },
    {
      icon: Shapes,
      title: 'Select your shape',
      description: 'Express yourself with our variety of cookie shapes',
      options: ['Hearts', 'Circle', 'Flowers', 'Animals', 'Custom Shapes']
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Create Your Perfect Cookies
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Follow our simple process to customize your dream cookies
          </p>
        </div>
        
        <div ref={timelineRef} className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-0.5 bg-sage-200 transform -translate-x-1/2" />
          
          {/* Timeline items */}
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`timeline-item relative ${isVisible ? 'animate' : ''}`}
              >
                <div className={`lg:flex items-center gap-8 ${
                  index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}>
                  {/* Icon */}
                  <div className="absolute left-0 lg:left-1/2 w-8 h-8 bg-sage-500 rounded-full transform -translate-x-1/2 flex items-center justify-center shadow-lg">
                    <step.icon className="w-4 h-4 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="ml-12 lg:ml-0 lg:w-1/2">
                    <div className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                      index % 2 === 0 ? 'lg:mr-12' : 'lg:ml-12'
                    }`}>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Step {index + 1}: {step.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {step.options.map((option, optionIndex) => (
                          <span
                            key={optionIndex}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sage-100 text-sage-800"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectionsAnimation = useScrollAnimation();
  const ctaAnimation = useScrollAnimation();
  const galleryAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();
  const faqAnimation = useScrollAnimation();

  const testimonials = [
    {
      id: 1,
      name: 'Stacey Boyce',
      content: 'They are so cute. Thank you!',
      location: 'Albury',
    },
    {
      id: 2,
      name: 'Mel Brizzi',
      content: 'Hey just wanted to say my 20 year old son has nearly eaten every cookie 📷 he said they are the best his ever had. 📷',
      location: 'Leneva',
    },
    {
      id: 3,
      name: 'Lucy Rose Harrison',
      content: 'They were delicious.. once again!!',
      location: 'Albury',
    },
    {
      id: 4,
      name: 'Wodonga Hockey Club',
      content: "They were awesome. Looked amazing and tasty too! We'll be ordering again next year.",
      location: 'Wodonga',
    },
  ];

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: imageList, error: storageError } = await supabase.storage
        .from('Gallery')
        .list('', {
          limit: 100, // Increased limit to get more images
          sortBy: { column: 'name', order: 'asc' }
        });

      if (storageError) throw storageError;

      if (!imageList || imageList.length === 0) {
        setError('No images found in the gallery');
        return;
      }

      // Filter out HEIC files and ensure we have valid image extensions
      const validImageList = imageList.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        return extension && validExtensions.includes(extension);
      });

      if (validImageList.length === 0) {
        setError('No supported image formats found in the gallery');
        return;
      }

      // Shuffle the valid images array
      const shuffledImages = [...validImageList].sort(() => Math.random() - 0.5);

      // Take the first 8 images after shuffling
      const selectedImages = shuffledImages.slice(0, 8).map((file) => {
        const { data: { publicUrl } } = supabase.storage
          .from('Gallery')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: publicUrl,
          created_at: file.created_at,
          metadata: file.metadata || {}
        };
      });

      setGalleryImages(selectedImages);
    } catch (err) {
      console.error('Error loading gallery images:', err);
      setError(err instanceof Error ? err.message : 'Error loading gallery images');
    } finally {
      setLoading(false);
    }
  };

  // Update the hero section image grid
  const heroImages = galleryImages.slice(0, 4);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#ACC0B9] to-[#8A9E97]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h2v4h4v2h-4v4h-2v-4h-4v-2h4zm0-30V0h2v4h4v2h-4v4h-2V6h-4V4h4zM6 34v-4h2v4h4v2h-4v4H6v-4H2v-2h4zm0-30V0h2v4h4v2H8v4H6V6H2V4h4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-left space-y-8 animate-fade-in">
              <h1 className="text-4xl lg:text-6xl font-extrabold text-white leading-tight">
                <span className="block mb-2">Handcrafted Cookies</span>
                <span className="block text-sage-50 relative">
                  Made with Love
                  <svg className="absolute -bottom-2 left-0 w-24 h-2 text-sage-200 opacity-50" viewBox="0 0 100 8" preserveAspectRatio="none">
                    <path d="M0,0 C25,0 25,8 50,8 C75,8 75,0 100,0" stroke="currentColor" fill="none" strokeWidth="2"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-white/90 max-w-xl">
                Create unforgettable moments with our custom-designed cookies. Perfect for weddings, corporate events, and special celebrations.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/quote-builder"
                  className="inline-flex items-center px-8 py-4 border-2 border-white bg-white text-[#ACC0B9] rounded-full text-lg font-semibold hover:bg-transparent hover:text-white transition-all duration-300 group"
                >
                  Get a Quote
                  <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8">
                {[
                  { icon: Star, text: 'Custom Designs' },
                  { icon: Cookie, text: 'Premium Ingredients' },
                  { icon: Sparkles, text: 'Made Fresh' },
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-white/90">
                    <feature.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Grid */}
            <div className="relative grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {loading ? (
                <div className="col-span-2 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              ) : error ? (
                <div className="col-span-2 text-center text-white">
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {heroImages.slice(0, 2).map((image, index) => (
                      <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Error loading image ${image.name}:`, e);
                            e.currentTarget.src = 'https://placehold.co/600x600?text=Image+Not+Found';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4 pt-8">
                    {heroImages.slice(2, 4).map((image, index) => (
                      <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Error loading image ${image.name}:`, e);
                            e.currentTarget.src = 'https://placehold.co/600x600?text=Image+Not+Found';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-white/70 animate-bounce">
          <span className="text-sm font-medium mb-2">Scroll to explore</span>
          <ArrowRight className="w-5 h-5 transform rotate-90" />
        </div>
      </section>

      {/* Collections Section */}
      <section 
        ref={collectionsAnimation.ref}
        className={`py-24 bg-white scroll-animation ${collectionsAnimation.isVisible ? 'animate' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Cookie Collections
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Explore our curated collections for every occasion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Wedding & Engagement",
                description: "Elegant cookies for your special day",
                features: ["Personalized designs", "Color matching", "Luxury packaging"],
                icon: <Sparkles className="h-16 w-16" />,
                gradient: "from-pink-50 to-rose-100"
              },
              {
                title: "Birthday & Celebration",
                description: "Fun and festive designs for any party",
                features: ["Custom themes", "Age-specific designs", "Party favors"],
                icon: <Cookie className="h-16 w-16" />,
                gradient: "from-purple-50 to-indigo-100"
              },
              {
                title: "Corporate Events",
                description: "Professional cookies for business occasions",
                features: ["Logo branding", "Bulk ordering", "Corporate packaging"],
                icon: <Shapes className="h-16 w-16" />,
                gradient: "from-blue-50 to-sky-100"
              },
              {
                title: "Baby Showers",
                description: "Sweet treats for welcoming little ones",
                features: ["Gender reveal", "Baby themes", "Pastel colors"],
                icon: <Palette className="h-16 w-16" />,
                gradient: "from-yellow-50 to-amber-100"
              },
              {
                title: "Seasonal Collections",
                description: "Holiday-themed cookies throughout the year",
                features: ["Holiday specials", "Seasonal flavors", "Festive designs"],
                icon: <Star className="h-16 w-16" />,
                gradient: "from-green-50 to-emerald-100"
              },
              {
                title: "Custom Collections",
                description: "Your unique vision brought to life",
                features: ["Your design", "Custom shapes", "Special requests"],
                icon: <Palette className="h-16 w-16" />,
                gradient: "from-sage-50 to-sage-100"
              }
            ].map((collection, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 scroll-animation ${
                  collectionsAnimation.isVisible ? 'animate' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon Section */}
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${collection.gradient} flex items-center justify-center mx-auto mb-6`}>
                    <div className="text-gray-600">
                      {React.cloneElement(collection.icon, { className: 'h-8 w-8' })}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                    {collection.title}
                  </h3>
                  
                  <p className="text-gray-600 text-center mb-6">
                    {collection.description}
                  </p>

                  <div className="space-y-3">
                    {collection.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ACC0B9]" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 text-center">
                    <Link
                      to="/quote-builder"
                      className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-[#ACC0B9] hover:text-gray-900 transition-colors gap-2"
                    >
                      Get Quote
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaAnimation.ref}
        className="relative py-16 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#ACC0B9]/5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ACC0B9' fill-opacity='0.1'%3E%3Cpath d='M24 22v-2h-1v2h-2v1h2v2h1v-2h2v-1h-2zm0-20V0h-1v2h-2v1h2v2h1V3h2V2h-2zM4 22v-2H3v2H1v1h2v2h1v-2h2v-1H4zM4 2V0H3v2H1v1h2v2h1V3h2V2H4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className={`bg-white rounded-xl shadow-lg overflow-hidden scroll-animation ${
              ctaAnimation.isVisible ? 'animate' : ''
            }`}
          >
            <div className="grid lg:grid-cols-5">
              {/* Image Side */}
              <div className="relative lg:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ACC0B9]/20 to-[#ACC0B9]/40 mix-blend-multiply" />
                <img
                  src="https://gshfksgxrvbeokyxfryk.supabase.co/storage/v1/object/public/Images//Bee%20Photo%20Product.png"
                  alt="Custom Cookie Design"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Content Side */}
              <div className="p-8 lg:p-10 lg:col-span-3">
                <div className="max-w-lg">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Design Your Dream Cookies
                  </h2>
                  <p className="mt-3 text-base text-gray-600">
                    From corporate events to weddings, make your celebration unforgettable with our custom-designed cookies.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    {[
                      'Personalized designs',
                      'Premium ingredients',
                      'Professional consultation',
                      'Bulk discounts'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#ACC0B9]" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Link
                      to="/quote-builder"
                      className="group inline-flex items-center justify-center rounded-full bg-[#ACC0B9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#9BB0A9] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ACC0B9] active:bg-[#8AA19A] active:text-white/80 transition-all duration-200"
                    >
                      Start Designing
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <TimelineSection />

      {/* Gallery Section */}
      <section 
        ref={galleryAnimation.ref}
        className="py-16 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 scroll-animation ${
            galleryAnimation.isVisible ? 'animate' : ''
          }`}>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Cookie Gallery
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A showcase of our beautiful custom cookie designs
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-sage-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="col-span-full text-center text-red-600 py-12">
                <p>{error}</p>
              </div>
            ) : (
              galleryImages.map((image, index) => (
                <div
                  key={index}
                  className={`relative group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 scroll-animation-scale ${
                    galleryAnimation.isVisible ? 'animate' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-4 py-2 rounded-full backdrop-blur-sm">
                        {image.metadata.category || 'Custom Design'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        ref={testimonialsAnimation.ref}
        className="py-16 bg-[#ACC0B9]/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-3xl font-extrabold text-gray-900 text-center mb-12 scroll-animation ${
            testimonialsAnimation.isVisible ? 'animate' : ''
          }`}>
            What Our Customers Say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`bg-white p-6 rounded-lg shadow-sm border border-[#ACC0B9]/20 hover:border-[#ACC0B9]/40 transition-colors scroll-animation-right ${
                  testimonialsAnimation.isVisible ? 'animate' : ''
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {testimonial.name}
                  </span>
                  {testimonial.location && (
                    <span className="text-[#ACC0B9] text-sm">{testimonial.location}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <ContactForm />
    </div>
  );
}