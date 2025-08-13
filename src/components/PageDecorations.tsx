import React, { useEffect, useState } from 'react';

const PageDecorations = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState(() => {
    return {
      cookies: Array.from({ length: 20 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        baseX: Math.random() * 100,
        baseY: Math.random() * 100,
        speed: 0.15 + Math.random() * 0.1,
        color: Math.floor(Math.random() * 8),
        scale: 0.5 + Math.random(),
        delay: -Math.random() * 10,
      })),
      sprinkles: Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        baseX: Math.random() * 100,
        baseY: Math.random() * 100,
        speed: 0.1 + Math.random() * 0.1,
        color: Math.floor(Math.random() * 8),
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        delay: -Math.random() * 15,
      })),
    };
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });

      setElements(prev => {
        const newElements = { ...prev };
        
        // Update cookies
        newElements.cookies = prev.cookies.map(cookie => {
          const dx = x - cookie.baseX;
          const dy = y - cookie.baseY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 30; // Maximum influence distance
          const influence = Math.max(0, 1 - distance / maxDistance);
          
          return {
            ...cookie,
            x: cookie.baseX + dx * influence * cookie.speed,
            y: cookie.baseY + dy * influence * cookie.speed,
          };
        });

        // Update sprinkles
        newElements.sprinkles = prev.sprinkles.map(sprinkle => {
          const dx = x - sprinkle.baseX;
          const dy = y - sprinkle.baseY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 40; // Maximum influence distance
          const influence = Math.max(0, 1 - distance / maxDistance);
          
          return {
            ...sprinkle,
            x: sprinkle.baseX + dx * influence * sprinkle.speed,
            y: sprinkle.baseY + dy * influence * sprinkle.speed,
          };
        });

        return newElements;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const colors = [
    '#FF1493', // Deep pink
    '#FFD700', // Gold
    '#00FA9A', // Spring green
    '#00BFFF', // Deep sky blue
    '#9370DB', // Medium purple
    '#FF6B6B', // Light red
    '#4FACFE', // Bright blue
    '#FFB347', // Pastel orange
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating Cookie Elements */}
      {elements.cookies.map((cookie, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${cookie.x}%`,
            top: `${cookie.y}%`,
            animation: `float ${10 + cookie.delay}s linear infinite`,
            animationDelay: `${cookie.delay}s`,
            filter: 'blur(0.5px)',
            transition: 'transform 0.3s ease-out, left 0.3s ease-out, top 0.3s ease-out',
          }}
        >
          <div 
            className="w-4 h-4 rounded-full opacity-40 shadow-lg"
            style={{
              backgroundColor: colors[cookie.color],
              transform: `scale(${cookie.scale})`,
              boxShadow: '0 0 10px rgba(255,255,255,0.5)',
            }}
          />
        </div>
      ))}

      {/* Confetti Sprinkles */}
      {elements.sprinkles.map((sprinkle, i) => (
        <div
          key={`sprinkle-${i}`}
          className="absolute animate-sprinkle"
          style={{
            left: `${sprinkle.x}%`,
            top: `${sprinkle.y}%`,
            animation: `sprinkle ${15 + sprinkle.delay}s linear infinite`,
            animationDelay: `${sprinkle.delay}s`,
            filter: 'blur(0.5px)',
            transition: 'transform 0.3s ease-out, left 0.3s ease-out, top 0.3s ease-out',
          }}
        >
          <div
            className="w-1.5 h-6 rounded-full opacity-50 shadow-lg"
            style={{
              backgroundColor: colors[sprinkle.color],
              transform: `rotate(${sprinkle.rotation}deg) scale(${sprinkle.scale})`,
              boxShadow: '0 0 8px rgba(255,255,255,0.4)',
            }}
          />
        </div>
      ))}

      {/* Gradient Orbs */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full opacity-30 animate-pulse mix-blend-soft-light"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${300 + Math.random() * 400}px`,
            height: `${300 + Math.random() * 400}px`,
            background: `radial-gradient(circle, ${colors[i % colors.length].replace('#', 'rgba(').slice(0, -1)}, 0.6)} 0%, transparent 70%)`,
            animation: `pulse ${5 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${-Math.random() * 5}s`,
            filter: 'blur(40px)',
          }}
        />
      ))}

      {/* Sparkle Effects */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute animate-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `sparkle ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${-Math.random() * 3}s`,
          }}
        >
          <div
            className="w-2 h-2 rotate-45 opacity-60"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 20px 2px rgba(255,255,255,0.8)',
              transform: `scale(${0.2 + Math.random() * 0.8})`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default PageDecorations;
