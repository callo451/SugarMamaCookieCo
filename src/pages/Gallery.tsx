import React, { useState, useEffect } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { Loader2, Search, Filter } from 'lucide-react';

interface GalleryImage {
  name: string;
  url: string;
  created_at: string;
  metadata: {
    category?: string;
  };
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Attempting to fetch images from Supabase storage...');
      
      // First, let's check what buckets are available
      const { data: buckets, error: bucketsError } = await supabase.storage
        .listBuckets();
      
      console.log('Available buckets:', buckets);
      if (bucketsError) {
        console.error('Error fetching buckets:', bucketsError);
      }

      const { data: imageList, error: storageError } = await supabase.storage
        .from('Gallery')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      console.log('Storage list response:', { imageList, storageError });

      if (storageError) {
        console.error('Storage error details:', storageError);
        throw storageError;
      }

      if (!imageList || imageList.length === 0) {
        console.log('No images found in the Gallery bucket');
        setError('No images found in the gallery');
        return;
      }

      console.log('Found images:', imageList);

      // Get public URLs for all images
      const imagesWithUrls = await Promise.all(
        imageList.map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('Gallery')
            .getPublicUrl(file.name);

          return {
            name: file.name,
            url: publicUrl,
            created_at: file.created_at,
            metadata: file.metadata || {}
          };
        })
      );

      console.log('Images with URLs:', imagesWithUrls);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(imagesWithUrls.map(img => img.metadata.category).filter(Boolean))
      );
      setCategories(['all', ...uniqueCategories]);

      setImages(imagesWithUrls);
    } catch (err) {
      console.error('Detailed error:', err);
      setError(err instanceof Error ? err.message : 'Error loading gallery images');
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = images.filter(image => {
    const matchesSearch = image.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || image.metadata.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Cookie Gallery
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Explore our collection of custom-designed cookies
          </p>
        </div>

        {/* Filters */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search gallery..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-sage-500 focus:border-sage-500 sm:text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sage-500 focus:border-sage-500 sm:text-sm rounded-md"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="mt-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 text-sage-500 animate-spin" />
              <p className="text-sage-600">Loading gallery images...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 max-w-lg mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Unable to load gallery images</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={fetchImages}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sage-600 hover:bg-sage-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No images found matching your search criteria</p>
              {searchTerm || selectedCategory !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 text-sage-600 hover:text-sage-700 text-sm font-medium"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredImages.map((image, index) => (
                <div
                  key={image.name}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {image.metadata.category && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">
                          {image.metadata.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 