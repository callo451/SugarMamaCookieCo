import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); if (location.hash) { requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView()); } else { window.scrollTo(0, 0); } }, [location.pathname, location.hash]);
  return <header className="bakery-header">
    <a className="bakery-skip" href="#public-main">Skip to content</a>
    <div className="bakery-announcement">Custom cookies · Albury–Wodonga</div>
    <div className="bakery-nav">
      <Link to="/" className="bakery-brand" aria-label="Sugar Mama Cookie Co. home">Sugar Mama<span>COOKIE CO.</span></Link>
      <button className="bakery-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="bakery-links" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      <nav id="bakery-links" aria-label="Main navigation" className={open ? 'is-open' : ''}>
        <Link to="/gallery" aria-current={location.pathname === '/gallery' ? 'page' : undefined}>The cookies</Link>
        <Link to="/#how-to-order">How to order</Link>
        <Link to="/#about">Meet Sugar Mama</Link>
        <Link to="/#contact">Contact</Link>
        <Link to="/quote-builder" className="bakery-button">Get a cookie quote</Link>
      </nav>
    </div>
  </header>;
}
