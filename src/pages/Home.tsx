import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import ContactForm from '../components/ContactForm';
const examples = [
  { image: '/cookies/unicorns.jpg', title: 'For the birthday table', detail: 'Favourite colours, characters and a little imagination.', alt: 'Hand-piped unicorn cookies with pink and blue manes' },
  { image: '/cookies/country-cookies.jpg', title: 'For something a little different', detail: 'A theme that feels like you, down to the smallest detail.', alt: 'Highland cow, cactus, horseshoe and cowboy hat cookies' },
  { image: '/cookies/business-gifts.jpg', title: 'For a thoughtful thank-you', detail: 'Personalised cookies for local businesses, teams and clients.', alt: 'House and key cookies personalised for a real estate business' },
];
export default function Home() {
 return <>
  <section className="bakery-hero bakery-wrap">
   <div className="bakery-hero-copy"><p className="bakery-kicker">BAKED LOCAL. MADE PERSONAL.</p><h1>A little cookie.<br/>A big <em>occasion.</em></h1><p>Custom-decorated cookies for birthdays, weddings, thank-yous and just-because gifts. Made by Sugar Mama Cookie Co. in Albury–Wodonga.</p><div className="bakery-hero-actions"><Link className="bakery-button" to="/quote-builder">Get a cookie quote</Link><Link className="bakery-text-link" to="/gallery">See what’s been baking</Link></div><p className="bakery-small">Have a date in mind? Allow at least two weeks for custom designs.</p></div>
   <figure className="bakery-hero-photo"><img src="/cookies/floral-gift.jpg" alt="A gift box of pink flower cookies decorated by Sugar Mama Cookie Co." fetchPriority="high" width="1050" height="1400"/><figcaption>A bunch of flowers, with a sweeter finish.</figcaption></figure>
  </section>
  <div className="bakery-ribbon"><span>YOUR COLOURS</span><span>YOUR OCCASION</span><span>YOUR LITTLE DETAILS</span></div>
  <section className="bakery-wrap bakery-section"><div className="bakery-section-heading"><div><p className="bakery-kicker">FROM THE COOKIE GALLERY</p><h2>Made for real celebrations.</h2></div><Link className="bakery-text-link" to="/gallery">Browse all the cookies</Link></div><div className="bakery-examples">{examples.map(e=><Link to="/gallery" key={e.image}><img src={e.image} alt={e.alt} loading="lazy" width="900" height="1000"/><h3>{e.title}</h3><p>{e.detail}</p></Link>)}</div></section>
  <section className="bakery-process" id="how-to-order"><div className="bakery-wrap"><div className="bakery-section-heading"><div><p className="bakery-kicker">LET’S PLAN YOUR BATCH</p><h2>From an idea to a box of cookies.</h2></div><p>You don’t need to have every detail worked out. A date, a rough quantity and an idea are a good place to start.</p></div><ol>{[
   ['Tell us what you’re celebrating','Choose your cookie style, quantity and design details in the quote builder. Add your event date and any special requests in the notes.'],
   ['Work out the details','Submit your quote request so Faith can confirm the design, availability and final price with you. A quote request isn’t a confirmed booking.'],
   ['Get ready for your occasion','Arrange collection or local delivery with us when your order is confirmed. Then all that’s left is sharing them.'],
  ].map(([title,text],i)=><li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><Link className="bakery-button" to="/quote-builder">Start your quote</Link></div></section>
  <section className="bakery-wrap bakery-about bakery-section" id="about"><div><p className="bakery-kicker">MEET SUGAR MAMA</p><h2>A local baker.<br/>Your personal touches.</h2></div><div><p className="bakery-lead">Behind Sugar Mama Cookie Co. is Faith, making custom cookies for the Albury–Wodonga community.</p><p>A name in icing. Colours from your invitation. A thank-you that looks like your business. It’s those details that make each order personal.</p><p>Browse her work, bring your ideas, and get in touch to talk through what you have in mind.</p><a className="bakery-text-link" href="#contact">Have a chat about your cookies</a></div></section>
  <section className="bakery-quotes"><div className="bakery-wrap"><p className="bakery-kicker">A FEW WORDS FROM OUR CUSTOMERS</p><div><figure><Star className="bakery-quote-star" size={30} strokeWidth={1.3} aria-hidden="true"/><blockquote>“They were delicious.. once again!!”</blockquote><figcaption>Lucy Rose Harrison · Albury</figcaption></figure><figure><Star className="bakery-quote-star" size={30} strokeWidth={1.3} aria-hidden="true"/><blockquote>“They were awesome. Looked amazing and tasty too! We’ll be ordering again next year.”</blockquote><figcaption>Wodonga Hockey Club</figcaption></figure></div></div></section>
  <ContactForm/>
 </>;
}
