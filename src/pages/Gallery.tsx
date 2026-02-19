import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Camera, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryImage {
  name: string;
  url: string;
  category: string;
}

interface StorageFile {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown>;
}

const VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function isImageFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext && VALID_EXTENSIONS.includes(ext);
}

function prettyName(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function listStorageFiles(bucket: string, prefix = ''): Promise<StorageFile[]> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 500, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error('Failed to list storage files');
  return res.json();
}

function getPublicUrl(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const allImages: GalleryImage[] = [];
      const rootFiles = await listStorageFiles('Gallery');
      const potentialFolders: string[] = [];

      for (const entry of rootFiles) {
        if (isImageFile(entry.name)) {
          allImages.push({
            name: entry.name,
            url: getPublicUrl('Gallery', entry.name),
            category: 'General',
          });
        } else if (!entry.name.includes('.')) {
          potentialFolders.push(entry.name);
        }
      }

      for (const folder of potentialFolders) {
        const folderFiles = await listStorageFiles('Gallery', folder);
        for (const file of folderFiles) {
          if (isImageFile(file.name)) {
            allImages.push({
              name: file.name,
              url: getPublicUrl('Gallery', `${folder}/${file.name}`),
              category: folder
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            });
          }
        }
      }

      setImages(allImages);
    } catch (err) {
      console.error('Gallery fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(images.map((img) => img.category)))];

  const filteredImages = images.filter((image) => {
    const matchesSearch =
      !searchTerm || prettyName(image.name).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || image.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const navigateLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < filteredImages.length) setLightboxIndex(next);
  };

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, filteredImages.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-sage-50">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative px-6 py-24 sm:px-10 md:px-16 lg:px-20 lg:py-32 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-medium uppercase tracking-[0.2em] text-sage-600"
          >
            Our Creations
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 font-display text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            Cookie Gallery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-lg text-gray-500 max-w-xl mx-auto"
          >
            Browse our collection of custom-designed cookies crafted for weddings, celebrations, and events
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 max-w-md mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search photos..."
                className="w-full rounded-full border border-gray-200 bg-white pl-11 pr-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
              />
            </div>
          </motion.div>

          {/* Category pills */}
          {categories.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex justify-center gap-2 flex-wrap"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-sage-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-sage-50 hover:text-sage-700 border border-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Gallery grid */}
      <section className="px-6 py-16 sm:px-10 md:px-16 lg:px-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-600" />
              <p className="mt-4 text-sm text-gray-400">Loading gallery...</p>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchImages}
                className="text-sm font-medium text-sage-600 hover:text-sage-700"
              >
                Try again
              </button>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-24">
              <Camera className="mx-auto h-14 w-14 text-gray-200 mb-4" />
              <p className="font-display text-xl font-semibold text-gray-900">
                {searchTerm || selectedCategory !== 'all' ? 'No matches found' : 'Gallery coming soon'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Check back soon for our latest creations.'}
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sage-600 hover:text-sage-700"
                >
                  Clear filters
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-8 text-sm text-gray-400">
                {filteredImages.length} photo{filteredImages.length !== 1 ? 's' : ''}
              </p>

              {/* Masonry-style grid */}
              <motion.div
                className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
              >
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.url}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl break-inside-avoid"
                    onClick={() => openLightbox(index)}
                  >
                    <img
                      src={image.url}
                      alt={prettyName(image.name)}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-sm font-medium text-white truncate">
                        {prettyName(image.name)}
                      </p>
                      {image.category !== 'General' && (
                        <span className="mt-1 inline-block rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white">
                          {image.category}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      {!loading && filteredImages.length > 0 && (
        <section className="px-6 pb-24 sm:px-10 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl rounded-3xl bg-sage-50 p-10 sm:p-14 text-center"
          >
            <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">
              Love what you see?
            </h2>
            <p className="mt-3 text-gray-500">
              Every cookie is custom-made to match your vision. Tell us about your event and we'll bring it to life.
            </p>
            <Link
              to="/quote-builder"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-sage-600 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sage-700"
            >
              Start Your Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredImages[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Prev button */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                className="absolute left-4 z-10 rounded-full bg-white/10 p-2.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Next button */}
            {lightboxIndex < filteredImages.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                className="absolute right-4 z-10 rounded-full bg-white/10 p-2.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={filteredImages[lightboxIndex].url}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={filteredImages[lightboxIndex].url}
              alt={prettyName(filteredImages[lightboxIndex].name)}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/60 backdrop-blur-sm">
              {lightboxIndex + 1} / {filteredImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
