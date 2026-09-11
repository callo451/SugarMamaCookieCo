import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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


const captions: Record<string,string> = {
 'IMG_0035.jpeg':'Unicorn cookies', 'IMG_0036.jpeg':'Custom cookie designs',
 'IMG_1074.jpeg':'Personalised business gifts', 'IMG_8431.jpeg':'Country-themed cookies',
 'IMG_9864.jpeg':'Pink floral gift box',
};
const caption = (image: GalleryImage) => captions[image.name] || (image.category !== 'General' ? image.category + ' cookies' : 'Custom cookies by Sugar Mama');
export default function Gallery() {
 const [images,setImages]=useState<GalleryImage[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [searchTerm,setSearchTerm]=useState('');
 const [selectedCategory,setSelectedCategory]=useState('all');
 const [selected,setSelected]=useState<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ void fetchImages(); },[]);
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


 const categories=['all',...new Set(images.map(i=>i.category))];
 const filtered=images.filter(i=>(selectedCategory==='all'||i.category===selectedCategory)&&(!searchTerm||(caption(i)+' '+prettyName(i.name)).toLowerCase().includes(searchTerm.toLowerCase())));
 useEffect(()=>{if(selected!==null)dialog.current?.showModal();},[selected]);
 function close(){dialog.current?.close();setSelected(null);}
 return <div className="bakery-wrap">
  <header className="bakery-gallery-header"><p className="bakery-kicker">THE COOKIE GALLERY</p><h1>A little inspiration<br/>for your next occasion.</h1><p>Real cookies from Sugar Mama’s kitchen. Take a closer look at the colours, shapes and personal details, then tell us what you have in mind.</p><Link className="bakery-button" to="/quote-builder">Plan your own cookies</Link></header>
  <div className="bakery-gallery-toolbar"><input aria-label="Search cookie photos" type="search" placeholder="Search cookies…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>{categories.length>2&&categories.map(c=><button key={c} aria-pressed={selectedCategory===c} onClick={()=>setSelectedCategory(c)}>{c==='all'?'All cookies':c}</button>)}</div>
  {loading?<p role="status">Opening the cookie gallery…</p>:error?<div role="alert"><p>We couldn’t load the photos just now.</p><button className="bakery-text-link" onClick={fetchImages}>Try again</button></div>:filtered.length===0?<div><p>No cookies match your search.</p><button className="bakery-text-link" onClick={()=>{setSearchTerm('');setSelectedCategory('all');}}>Clear filters</button></div>:<><p>{filtered.length} {filtered.length === 1 ? 'photo' : 'photos'} · Select a photo for a closer look</p><div className="bakery-photo-grid">{filtered.map((image,index)=><button key={image.url} onClick={()=>setSelected(index)} aria-label={'View '+caption(image)+' photo '+(index+1)}><img src={image.url} alt={caption(image)} loading="lazy"/><span>{caption(image)}</span></button>)}</div></>}
  <section className="bakery-gallery-cta"><h2>Something caught your eye?</h2><p>Mention the design in your quote request, along with your colours, quantity and event date.</p><Link to="/quote-builder" className="bakery-button">Get a cookie quote</Link></section>
  <dialog ref={dialog} className="bakery-lightbox" aria-label="Cookie photo viewer" onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)} onKeyDown={e=>{if(e.key==='ArrowLeft'&&selected!==null)setSelected(Math.max(0,selected-1));if(e.key==='ArrowRight'&&selected!==null)setSelected(Math.min(filtered.length-1,selected+1));}}>
   <div className="bakery-lightbox-controls"><p>{selected!==null?caption(filtered[selected]):''}</p><button onClick={close}>Close</button></div>
   {selected!==null&&filtered[selected]&&<img src={filtered[selected].url} alt={caption(filtered[selected])}/>}
   <div className="bakery-lightbox-controls"><button disabled={selected===0} onClick={()=>setSelected(n=>Math.max(0,(n||0)-1))}>Previous</button><p>{(selected||0)+1} / {filtered.length}</p><button disabled={selected===filtered.length-1} onClick={()=>setSelected(n=>Math.min(filtered.length-1,(n||0)+1))}>Next</button></div>
  </dialog>
 </div>;
}
