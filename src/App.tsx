import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Instagram, Linkedin, ArrowRight, Upload, Trash2, LogOut, Menu, X, ArrowUp } from 'lucide-react';

// --- SVGs for Icons not in Lucide ---
const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const BehanceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.3 14.4c-1.8 0-2.8-1.2-2.8-2.6 0-1.6 1.2-2.8 3-2.8 1.6 0 2.6 1.1 2.6 2.6h-5.2c.1 1.1 1 1.6 2.1 1.6.8 0 1.5-.3 1.9-.9l1.3.8c-.7 1-1.9 1.5-3.1 1.5zM7.1 10.4c-.8 0-1.4.5-1.5 1.2h3c-.1-.7-.7-1.2-1.5-1.2zM14 10.5h4v1.5h-4zM16 14.5c1.6 0 2.8-1.1 2.8-2.7s-1.2-2.7-2.8-2.7c-1.6 0-2.8 1.1-2.8 2.7s1.2 2.7 2.8 2.7zm0-4c.8 0 1.4.6 1.4 1.3 0 .8-.6 1.4-1.4 1.4-.8 0-1.4-.6-1.4-1.4 0-.7.6-1.3 1.4-1.3z"></path>
  </svg>
);

// --- Interfaces ---
interface Experience {
  id: number;
  company: string;
  role: string;
  logo_url: string;
}

interface Skill {
  id: number;
  category: 'software' | 'platform' | 'competence' | 'language';
  name: string;
  description: string;
  icon: string;
}

// --- API Helpers ---
const api = {
  getProjects: () => fetch('/api/projects').then(res => res.json()),
  getSettings: () => fetch('/api/settings').then(res => res.json()),
  login: (data: any) => fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateSettings: (data: any, token: string) => fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  uploadProject: (formData: FormData, token: string) => fetch('/api/projects', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }).then(res => res.json()),
  deleteProject: (id: number, token: string) => fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),
  getLogos: () => fetch('/api/logos').then(res => res.json()),
  uploadLogo: (data: any, token: string) => fetch('/api/logos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteLogo: (id: number, token: string) => fetch(`/api/logos/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),
  getExperiences: () => fetch('/api/experiences').then(res => res.json()),
  addExperience: (data: any, token: string) => fetch('/api/experiences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteExperience: (id: number, token: string) => fetch(`/api/experiences/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),
  getSkills: () => fetch('/api/skills').then(res => res.json()),
  addSkill: (data: any, token: string) => fetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteSkill: (id: number, token: string) => fetch(`/api/skills/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json())
};

// --- Components ---

const formatIconName = (str: string) => {
  if (!str) return 'HelpCircle';
  
  const lowerStr = str.toLowerCase().trim();
  if (lowerStr === 'corel draw' || lowerStr === 'corel') return 'Palette';
  if (lowerStr === 'gather') return 'Users';
  if (lowerStr === 'estratégia' || lowerStr === 'estrategia') return 'Target';

  return str
    .trim()
    .replace(/([-_ ][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', '').replace(' ', ''))
    .replace(/^[a-z]/, ($1) => $1.toUpperCase());
};

const DynamicIcon = ({ name, size = 24, className = "text-primary" }: { name: string, size?: number, className?: string }) => {
  const formattedName = formatIconName(name);
  const IconComponent = (LucideIcons as any)[formattedName] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (ref.current) observer.unobserve(ref.current);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options]);

  return [ref, isIntersecting] as const;
};

const FadeInSection = ({ children, id, className }: { children: React.ReactNode, id?: string, className?: string }) => {
  const [ref, isVisible] = useIntersectionObserver();
  return (
    <section 
      id={id} 
      ref={ref as any} 
      className={`${className} transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {children}
    </section>
  );
};

function Home() {
  const [projects, setProjects] = useState<any[]>([]);
  const [logos, setLogos] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [aboutText, setAboutText] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [contactSettings, setContactSettings] = useState<any>({});
  const [filter, setFilter] = useState('Branding');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentExperienceIndex, setCurrentExperienceIndex] = useState(0);
  const filters = ['Branding', 'Social Media', 'Fotografia'];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    api.getProjects().then(setProjects);
    api.getLogos().then(setLogos);
    api.getExperiences().then(setExperiences);
    api.getSkills().then(setSkills);
    api.getSettings().then(data => {
      setAboutText(data.about_text || '');
      setProfilePhoto(data.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80');
      setContactSettings(data);
    });

    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextExperience = () => {
    if (experiences.length > 0) {
      setCurrentExperienceIndex((prev) => (prev + 1) % experiences.length);
    }
  };

  const prevExperience = () => {
    if (experiences.length > 0) {
      setCurrentExperienceIndex((prev) => (prev - 1 + experiences.length) % experiences.length);
    }
  };

  const visibleExperiences = [];
  if (experiences.length > 0) {
    // Show 3 experiences at a time
    for (let i = 0; i < Math.min(3, experiences.length); i++) {
      visibleExperiences.push(experiences[(currentExperienceIndex + i) % experiences.length]);
    }
  }

  const filteredProjects = projects.filter(p => p.category === filter);

  return (
    <div className="min-h-screen bg-transparent text-gray-900 font-sans selection:bg-primary selection:text-white relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-white">
        <style>
          {`
            @keyframes float-slow {
              0% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(5%, 5%) scale(1.05); }
              66% { transform: translate(-5%, 10%) scale(0.95); }
              100% { transform: translate(0, 0) scale(1); }
            }
            .animate-float-slow {
              animation: float-slow 10s ease-in-out infinite;
            }
            .animate-float-slower {
              animation: float-slow 15s ease-in-out infinite reverse;
            }
          `}
        </style>
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] transition-transform duration-700 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.05}px, ${mousePos.y * 0.05}px)` }}
        >
          <div className="w-full h-full bg-blue-300/20 rounded-full blur-[100px] animate-float-slow"></div>
        </div>
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] transition-transform duration-700 ease-out"
          style={{ transform: `translate(${mousePos.x * -0.05}px, ${mousePos.y * -0.05}px)` }}
        >
          <div className="w-full h-full bg-cyan-200/20 rounded-full blur-[120px] animate-float-slower"></div>
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full bg-gradient-to-r from-[#0E12DF] to-[#0a0b1a] z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="font-heading font-bold text-2xl tracking-tight text-white">
            ANALU<span className="text-white/70">.</span>
          </a>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-8">
            <a href="#sobre" className="font-bold text-white/90 hover:text-white transition-colors">Sobre</a>
            <a href="#experiencias" className="font-bold text-white/90 hover:text-white transition-colors">Experiências</a>
            <a href="#trabalhos" className="font-bold text-white/90 hover:text-white transition-colors">Trabalhos</a>
            <a href="#skills" className="font-bold text-white/90 hover:text-white transition-colors">Skills</a>
            <a href="#contato" className="font-bold text-white/90 hover:text-white transition-colors">Contato</a>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#0a0b1a] shadow-lg border-t border-white/10 flex flex-col items-center py-6 gap-6">
            <a href="#sobre" onClick={() => setIsMenuOpen(false)} className="font-bold text-xl text-white/90 hover:text-white transition-colors w-full text-center py-2">Sobre</a>
            <a href="#experiencias" onClick={() => setIsMenuOpen(false)} className="font-bold text-xl text-white/90 hover:text-white transition-colors w-full text-center py-2">Experiências</a>
            <a href="#trabalhos" onClick={() => setIsMenuOpen(false)} className="font-bold text-xl text-white/90 hover:text-white transition-colors w-full text-center py-2">Trabalhos</a>
            <a href="#skills" onClick={() => setIsMenuOpen(false)} className="font-bold text-xl text-white/90 hover:text-white transition-colors w-full text-center py-2">Skills</a>
            <a href="#contato" onClick={() => setIsMenuOpen(false)} className="font-bold text-xl text-white/90 hover:text-white transition-colors w-full text-center py-2">Contato</a>
          </div>
        )}
      </header>

      <main>
        {/* Hero / Sobre */}
        <FadeInSection 
          id="sobre" 
          className="pt-40 pb-24 px-6 md:px-12 lg:px-24 min-h-[80vh] flex flex-col justify-center"
        >
          <div className="max-w-6xl mx-auto w-full flex flex-col-reverse md:flex-row items-center md:items-start text-left gap-8 md:gap-12">
            <div className="w-full md:w-1/2 flex flex-col items-start text-left">
              <h1 className="font-heading text-5xl md:text-7xl font-extrabold leading-tight mb-6 text-primary-dark w-full text-left">
                Analu <br />
                <span className="text-primary">Portfólio</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed font-light">
                {aboutText}
              </p>
              <a 
                href="#trabalhos" 
                className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold hover:bg-primary-dark transition-all hover:gap-4"
              >
                Ver meus trabalhos
                <ArrowRight size={20} />
              </a>
            </div>
            <div className="w-full md:w-1/2 flex justify-center md:justify-end mb-4 md:mb-0">
              <div className="w-48 h-48 md:w-96 md:h-96 rounded-full overflow-hidden border-8 border-white shadow-2xl">
                <img 
                  src={profilePhoto || undefined} 
                  alt="Analu" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Experiências Section */}
        {experiences.length > 0 && (
          <FadeInSection id="experiencias" className="py-24 px-6 md:px-12 lg:px-24 bg-white overflow-hidden">
            <div className="max-w-6xl mx-auto w-full mb-16 flex flex-col items-start text-left">
              <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-primary-dark w-full text-left">Experiências</h2>
            </div>
            
            <div className="relative w-full max-w-6xl mx-auto overflow-hidden py-12 flex items-center justify-center">
              <button 
                onClick={prevExperience}
                className="absolute left-0 md:left-4 z-20 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shadow-sm"
                aria-label="Anterior"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>

              {/* Central Line */}
              <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-200 -translate-y-1/2 z-0 hidden md:block"></div>
              
              {/* Carousel Container */}
              <div className="flex justify-center items-center gap-4 md:gap-8 overflow-hidden w-full px-12 md:px-20">
                {visibleExperiences.map((exp, index) => (
                  <div key={`${exp.id}-${index}`} className="flex-shrink-0 w-full md:w-80 px-4 relative flex flex-col justify-center h-64">
                    
                    {/* Top Content (Even index) */}
                    {index % 2 === 0 && (
                      <div className="absolute top-0 left-0 w-full text-center px-4 hidden md:block">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">{exp.company}</h3>
                        <p className="text-primary font-medium text-sm">{exp.role}</p>
                      </div>
                    )}

                    {/* Center Node (Logo) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      {exp.logo_url ? (
                        <img src={exp.logo_url} alt={exp.company} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300" />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-md bg-primary flex items-center justify-center text-white font-bold text-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                          {exp.company.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Bottom Content (Odd index) */}
                    {index % 2 !== 0 && (
                      <div className="absolute bottom-0 left-0 w-full text-center px-4 hidden md:block">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">{exp.company}</h3>
                        <p className="text-primary font-medium text-sm">{exp.role}</p>
                      </div>
                    )}

                    {/* Mobile Content (Always visible below logo on small screens) */}
                    <div className="absolute bottom-4 left-0 w-full text-center px-4 md:hidden">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{exp.company}</h3>
                      <p className="text-primary font-medium text-sm">{exp.role}</p>
                    </div>

                  </div>
                ))}
              </div>

              <button 
                onClick={nextExperience}
                className="absolute right-0 md:right-4 z-20 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shadow-sm"
                aria-label="Próximo"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </FadeInSection>
        )}

        {/* Trabalhos Section */}
        <FadeInSection 
          id="trabalhos" 
          className="py-24 px-6 md:px-12 lg:px-24 bg-gray-50"
        >
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
              <div className="w-full text-left">
                <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-primary-dark mb-4 w-full text-left">Trabalhos</h2>
                <p className="text-gray-600 max-w-xl font-light">Explore meus projetos por categoria.</p>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col items-start md:items-center self-start md:self-auto max-w-full w-full md:w-auto">
                <button 
                  className="md:hidden flex items-center justify-between w-full gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm mb-2"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  Filtrar Categoria <span>{isFilterOpen ? '▴' : '▾'}</span>
                </button>
                <div className={`${isFilterOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row justify-center gap-2 md:gap-4 w-full md:w-auto`}>
                  {filters.map(f => (
                    <button 
                      key={f}
                      onClick={() => { setFilter(f); setIsFilterOpen(false); }}
                      className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-sm font-bold transition-all w-full md:w-auto text-left md:text-center ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white md:bg-transparent border md:border-0 border-gray-100 text-gray-600 hover:text-primary hover:bg-primary-light/50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Layouts */}
            <div 
              className={`transition-opacity duration-500 ${filter === 'Fotografia' ? 'columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}`}
            >
              {filteredProjects.map((project) => (
                <div key={project.id} className={filter === 'Fotografia' ? 'break-inside-avoid' : ''}>
                  <Link to={`/projeto/${project.id}`} className={`group relative block hover:-translate-y-1 hover:shadow-md transition-all duration-300 ${filter === 'Fotografia' ? '' : 'aspect-[4/3]'}`}>
                    <div className="overflow-hidden rounded-2xl bg-gray-200 w-full h-full relative">
                      <img 
                        src={project.cover_url || project.image_url || undefined} 
                        alt={project.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6 text-center">
                        <h3 className="font-heading text-white font-extrabold text-2xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          {project.title}
                        </h3>
                      </div>
                      {/* Tags for Design */}
                      {filter !== 'Fotografia' && project.tags && (
                        <div className="absolute top-4 left-4 flex gap-2">
                          {project.tags.split(',').map((tag: string, i: number) => (
                            <span key={i} className="bg-white/90 backdrop-blur-sm text-primary-dark text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* External Title and Subtitle */}
                    <div className="mt-4 bg-transparent">
                      <h3 className="font-bold text-lg text-gray-900">{project.title}</h3>
                      {project.subtitle && <p className="font-light text-sm text-gray-500">{project.subtitle}</p>}
                    </div>
                  </Link>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500 font-light italic">
                  Nenhum projeto encontrado nesta categoria ainda.
                </div>
              )}
            </div>
          </div>
        </FadeInSection>

        {/* Logos Marquee Section */}
        {logos.length > 0 && (
          <section className="py-16 bg-white overflow-hidden border-y border-gray-100">
            <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
              <h3 className="font-heading text-2xl font-bold text-gray-400 uppercase tracking-widest">Marcas que já fiz parte da história</h3>
            </div>
            <div className="relative flex w-full overflow-hidden">
              <div className="flex w-max animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]">
                {[...logos, ...logos].map((logo, idx) => (
                  <div key={`${logo.id}-${idx}`} className="flex-shrink-0 mx-8 md:mx-16 flex items-center justify-center w-32 md:w-48 h-20">
                    <img 
                      src={logo.image_url} 
                      alt={logo.name} 
                      className="max-w-full max-h-full object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Skills Section */}
        {skills.length > 0 && (
          <FadeInSection id="skills" className="py-24 px-6 md:px-12 lg:px-24 bg-white">
            <div className="max-w-6xl mx-auto w-full">
              <div className="flex flex-col items-start text-left mb-16">
                <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-primary-dark w-full text-left">Skills</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna 1: Softwares */}
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-6 border-b-2 border-primary pb-2 inline-block">Softwares</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {skills.filter(s => s.category === 'software').map(skill => (
                      <div key={skill.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg p-2">
                          <DynamicIcon name={skill.icon} size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-light text-gray-800 truncate whitespace-nowrap block">{skill.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna 2: Plataformas */}
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-6 border-b-2 border-primary pb-2 inline-block">Plataformas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {skills.filter(s => s.category === 'platform').map(skill => (
                      <div key={skill.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg p-2">
                          <DynamicIcon name={skill.icon} size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-light text-gray-800 truncate whitespace-nowrap block">{skill.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna 3: Competências */}
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-6 border-b-2 border-primary pb-2 inline-block">Competências</h3>
                  <div className="flex flex-col gap-4">
                    {skills.filter(s => s.category === 'competence').map(skill => (
                      <div key={skill.id} className="bg-white rounded-xl p-4 flex flex-col gap-2 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg p-2">
                            <DynamicIcon name={skill.icon} size={20} />
                          </div>
                          <span className="font-bold text-gray-900">{skill.name}</span>
                        </div>
                        {skill.description && (
                          <p className="text-sm font-light text-gray-500">{skill.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        )}

       {/* --- CONTACT SECTION --- */}
        <footer 
          id="contato" 
          className="bg-gradient-to-br from-[#0E12DF] to-[#0a0b1a] text-white py-24 px-6 md:px-12 lg:px-24 relative z-10"
        >
          <div className="max-w-6xl mx-auto w-full flex flex-col items-start text-left">
            
            {/* Call to Action Texts */}
            <p className="uppercase text-sm tracking-widest mb-4 font-light text-white/70">
              contato
            </p>
            <h2 className="text-4xl md:text-5xl font-bold font-syne mb-4">
              Vamos criar algo incrível juntos?
            </h2>
            <p className="font-light text-lg text-white/80 mb-12 max-w-2xl">
              {contactSettings.footer_text || 'Aberta a novos projetos, parcerias e conversas criativas. Me mande uma mensagem!'}
            </p>

            {/* Contact Information (Standardized sizes) */}
            <div className="flex flex-col gap-6 mb-12">
              
              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white border border-white/5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                {/* text-lg applied to match Location */}
                <a href={`mailto:${contactSettings.contact_email || 'analuizaapassos@gmail.com'}`} className="font-light text-lg hover:opacity-80 transition-opacity">E-mail / <span className="opacity-80">{contactSettings.contact_email || 'analuizaapassos@gmail.com'}</span></a>
              </div>

              {/* Location */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white border border-white/5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                {/* text-lg applied to match Email */}
                <a href="https://www.google.com/maps?q=Campinas,SP" target="_blank" rel="noopener noreferrer" className="font-light text-lg hover:opacity-80 transition-opacity">Localização / <span className="opacity-80">Campinas, SP</span></a>
              </div>

            </div>

            {/* Social Media Links */}
            <div className="flex gap-4">
              <a href={contactSettings.contact_whatsapp || "https://wa.me/5519989646588?text=Oi%2C%20Analu!%20Vi%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20saber%20mais%20sobre%20o%20seu%20trabalho."} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#595c9b]/40 transition-colors border border-white/5">
                {/* WhatsApp Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </a>
              <a href={contactSettings.contact_instagram || "https://www.instagram.com/analuszsz/"} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#595c9b]/40 transition-colors border border-white/5">
                {/* Instagram Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href={contactSettings.contact_behance || "https://www.behance.net/analupassos/projects"} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#595c9b]/40 transition-colors border border-white/5">
                {/* Behance Icon */}
                <span className="font-bold font-syne text-lg">Bē</span>
              </a>
              <a href={contactSettings.contact_linkedin || "https://www.linkedin.com/in/analualcantara"} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-[#595c9b]/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#595c9b]/40 transition-colors border border-white/5">
                {/* LinkedIn Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>

          </div>
          
          {/* Tiny Login Link */}
          <Link to="/login" className="absolute bottom-4 right-6 text-xs text-white/30 hover:text-white/80 transition-colors font-light">
            © 2026
          </Link>
        </footer>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:-translate-y-1"
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin');
      } else {
        setError(data.error || 'Credenciais inválidas');
        alert('Erro: ' + (data.error || 'Credenciais inválidas'));
      }
    } catch (err) {
      setError('Erro de conexão');
      alert('Erro de conexão com o servidor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="font-extrabold text-3xl text-primary-dark mb-2">Login</h1>
          <p className="text-gray-500 font-normal">Acesso restrito ao painel de controle</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold text-center">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
              required
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors">
            Entrar
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary font-bold">Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [logos, setLogos] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [aboutText, setAboutText] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  
  // Contact Settings State
  const [contactEmail, setContactEmail] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactBehance, setContactBehance] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [footerText, setFooterText] = useState('');
  
  // Project Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Branding');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Logo Form State
  const [logoName, setLogoName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Experience Form State
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expLogoFile, setExpLogoFile] = useState<File | null>(null);

  // Skills Form State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillCategory, setSkillCategory] = useState<'software' | 'platform' | 'competence' | 'language'>('software');
  const [skillIcon, setSkillIcon] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');

  const [activeTab, setActiveTab] = useState('Sobre');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    const p = await api.getProjects();
    setProjects(p);
    const l = await api.getLogos();
    setLogos(l);
    const e = await api.getExperiences();
    setExperiences(e);
    const sk = await api.getSkills();
    setSkills(sk);
    const s = await api.getSettings();
    setAboutText(s.about_text || '');
    setProfilePhoto(s.profile_photo || '');
    setContactEmail(s.contact_email || '');
    setContactLinkedin(s.contact_linkedin || '');
    setContactInstagram(s.contact_instagram || '');
    setContactBehance(s.contact_behance || '');
    setContactWhatsapp(s.contact_whatsapp || '');
    setFooterText(s.footer_text || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const handleSaveSettings = async () => {
    if (!token) return;
    setLoading(true);
    await api.updateSettings({ 
      about_text: aboutText, 
      profile_photo: profilePhoto,
      contact_email: contactEmail,
      contact_linkedin: contactLinkedin,
      contact_instagram: contactInstagram,
      contact_behance: contactBehance,
      contact_whatsapp: contactWhatsapp,
      footer_text: footerText
    }, token);
    setLoading(false);
    alert('Configurações salvas com sucesso!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover' | 'block', blockIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'analu_preset');
    
    setLoading(true);
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/ds0o82lax/image/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());
      
      if (type === 'profile') setProfilePhoto(res.secure_url);
      if (type === 'cover') setCoverUrl(res.secure_url);
      if (type === 'block' && blockIndex !== undefined) {
        const newBlocks = [...blocks];
        newBlocks[blockIndex].content = res.secure_url;
        setBlocks(newBlocks);
      }
    } catch (err) {
      alert('Erro ao fazer upload da imagem');
    }
    setLoading(false);
  };

  const addBlock = (type: 'text' | 'image') => {
    setBlocks([...blocks, { type, content: '' }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlockContent = (index: number, content: string) => {
    const newBlocks = [...blocks];
    newBlocks[index].content = content;
    setBlocks(newBlocks);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title || !coverUrl) return alert('Preencha o título e a capa.');
    
    setLoading(true);
    const projectData = { title, subtitle, category, tags, cover_url: coverUrl, blocks };

    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(projectData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert('Erro ao atualizar: ' + (data.error || 'Servidor rejeitou a requisição'));
          setLoading(false);
          return;
        }
        alert('Projeto atualizado!');
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(projectData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert('Erro ao criar: ' + (data.error || 'Servidor rejeitou a requisição'));
          setLoading(false);
          return;
        }
        alert('Projeto criado!');
      }
      resetForm();
      fetchData();
    } catch (err) {
      alert('Erro ao salvar projeto');
    }
    setLoading(false);
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        alert('Erro ao carregar projeto para edição.');
        return;
      }
      const p = await res.json();
      setEditingId(p.id);
      setTitle(p.title);
      setSubtitle(p.subtitle || '');
      setCategory(p.category);
      setTags(p.tags || '');
      setCoverUrl(p.cover_url);
      setBlocks(p.blocks || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Erro de conexão ao carregar projeto.');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Certeza que deseja excluir este projeto?")) return;
    
    try {
      const res = await api.deleteProject(id, token);
      if (res.success) {
        setProjects(prev => prev.filter(p => Number(p.id) !== Number(id)));
        alert("Projeto excluído com sucesso!");
      } else {
        alert("Erro do servidor: " + (res.error || "Desconhecido"));
      }
    } catch (error) {
      alert("Erro de conexão ao excluir.");
    }
  };

  const handleUploadLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !logoFile) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', logoFile);
    formData.append('upload_preset', 'analu_preset');

    try {
      const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/ds0o82lax/image/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      await api.uploadLogo({ name: logoName, image_url: cloudinaryRes.secure_url }, token);
      setLogoName('');
      setLogoFile(null);
      fetchData();
      alert('Logo adicionado com sucesso!');
    } catch (err) {
      alert('Erro ao fazer upload do logo');
    }
    setLoading(false);
  };

  const handleDeleteLogo = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Certeza que deseja excluir este cliente?")) return;

    try {
      const res = await api.deleteLogo(id, token);
      if (res.success) {
        setLogos(prev => prev.filter(l => Number(l.id) !== Number(id)));
        alert("Logo excluído com sucesso!");
      }
    } catch (error) {
      alert("Erro ao excluir logo.");
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !expCompany || !expRole || !expLogoFile) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', expLogoFile);
    formData.append('upload_preset', 'analu_preset');

    try {
      const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/ds0o82lax/image/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      await api.addExperience({ company: expCompany, role: expRole, logo_url: cloudinaryRes.secure_url }, token);
      setExpCompany('');
      setExpRole('');
      setExpLogoFile(null);
      fetchData();
      alert('Experiência adicionada com sucesso!');
    } catch (err) {
      alert('Erro ao adicionar experiência');
    }
    setLoading(false);
  };

  const handleDeleteExperience = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Certeza que deseja excluir esta experiência?")) return;

    try {
      const res = await api.deleteExperience(id, token);
      if (res.success) {
        setExperiences(prev => prev.filter(exp => Number(exp.id) !== Number(id)));
        alert("Experiência excluída com sucesso!");
      }
    } catch (error) {
      alert("Erro ao excluir experiência.");
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !skillName || !skillIcon) return;
    setLoading(true);
    try {
      await api.addSkill({ category: skillCategory, name: skillName, description: skillDescription, icon: skillIcon }, token);
      setSkillName('');
      setSkillIcon('');
      setSkillDescription('');
      fetchData();
      alert('Skill adicionada com sucesso!');
    } catch (err) {
      alert('Erro ao adicionar skill');
    }
    setLoading(false);
  };

  const handleDeleteSkill = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Certeza que deseja excluir esta skill?")) return;

    try {
      const res = await api.deleteSkill(id, token);
      if (res.success) {
        setSkills(prev => prev.filter(s => Number(s.id) !== Number(id)));
        alert("Skill excluída com sucesso!");
      }
    } catch (error) {
      alert("Erro ao excluir skill.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setCategory('Branding');
    setTags('');
    setCoverUrl('');
    setBlocks([]);
  };

  const handleReorder = async (type: string, items: any[]) => {
    if (!token) return;
    try {
      await fetch(`/api/reorder/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: items.map((item, index) => ({ id: item.id, sort_order: index })) })
      });
    } catch (err) {
      console.error('Failed to reorder', err);
    }
  };

  const moveItem = (list: any[], setList: any, index: number, direction: 'up' | 'down', type: string) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const newList = [...list];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    
    setList(newList);
    handleReorder(type, newList);
  };

  if (!token) return null;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <span className="font-extrabold text-2xl tracking-tight">Painel Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {['Sobre', 'Experiências', 'Trabalhos', 'Skills', 'Clientes', 'Contato/Rodapé'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link to="/" className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Ver Site
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-10">
        
        {activeTab === 'Sobre' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Gerenciar Perfil</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Texto "Sobre Mim"</label>
                <textarea 
                  value={aboutText}
                  onChange={e => setAboutText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal resize-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Perfil</label>
                <div className="flex items-center gap-6">
                  {profilePhoto && (
                    <img src={profilePhoto} alt="Perfil" className="w-24 h-24 rounded-full object-cover border border-gray-200" />
                  )}
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary transition-colors bg-gray-50 flex-1">
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      onChange={e => handleFileUpload(e, 'profile')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1 text-gray-500">
                      <Upload size={20} className="text-primary" />
                      <span className="font-bold text-sm">Trocar Foto</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              disabled={loading}
              className="mt-6 bg-primary text-white font-bold py-2.5 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Salvar Configurações
            </button>
          </section>
        )}

        {activeTab === 'Contato/Rodapé' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Gerenciar Contato e Rodapé</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Texto do Rodapé</label>
                <textarea 
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal resize-none"
                  placeholder="Ex: Aberta a novos projetos, parcerias e conversas criativas. Me mande uma mensagem!"
                ></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">E-mail</label>
                  <input 
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="analuizaapassos@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp (Link completo)</label>
                  <input 
                    type="text"
                    value={contactWhatsapp}
                    onChange={e => setContactWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="https://wa.me/5519989646588"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Instagram (Link completo)</label>
                  <input 
                    type="text"
                    value={contactInstagram}
                    onChange={e => setContactInstagram(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="https://www.instagram.com/analuszsz/"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Behance (Link completo)</label>
                  <input 
                    type="text"
                    value={contactBehance}
                    onChange={e => setContactBehance(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="https://www.behance.net/analupassos/projects"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn (Link completo)</label>
                  <input 
                    type="text"
                    value={contactLinkedin}
                    onChange={e => setContactLinkedin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="https://www.linkedin.com/in/analualcantara"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              disabled={loading}
              className="mt-8 bg-primary text-white font-bold py-2.5 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Salvar Configurações
            </button>
          </section>
        )}

        {activeTab === 'Trabalhos' && (
          <>
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-extrabold text-primary-dark">
                  {editingId ? 'Editar Projeto' : 'Novo Projeto'}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-sm font-bold text-gray-500 hover:text-primary">
                    Cancelar Edição
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveProject} className="space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Título do Projeto</label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo (Opcional)</label>
                      <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-gray-700 bg-white">
                          <option value="Branding">Branding</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Fotografia">Fotografia</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tags (separadas por vírgula)</label>
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Ex: Figma, Photoshop" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Capa do Projeto</label>
                    {coverUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 h-32">
                        <img src={coverUrl} className="w-full h-full object-cover" alt="Capa" />
                        <button type="button" onClick={() => setCoverUrl('')} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600"><Trash2 size={16}/></button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-gray-300 rounded-xl h-32 flex items-center justify-center hover:border-primary transition-colors bg-white">
                        <input type="file" accept=".jpg,.jpeg,.png" onChange={e => handleFileUpload(e, 'cover')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="flex flex-col items-center gap-1 text-gray-500">
                          <Upload size={20} className="text-primary" />
                          <span className="font-bold text-sm">Upload da Capa</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blocks Builder */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Conteúdo do Estudo de Caso</h3>
                  <div className="space-y-4 mb-4">
                    {blocks.map((block, index) => (
                      <div key={index} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Bloco {index + 1} - {block.type === 'text' ? 'Texto' : 'Imagem'}</span>
                          {block.type === 'text' ? (
                            <textarea 
                              value={block.content} 
                              onChange={e => updateBlockContent(index, e.target.value)}
                              placeholder="Digite o texto aqui..."
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal resize-none"
                            />
                          ) : (
                            block.content ? (
                              <div className="relative rounded-lg overflow-hidden border border-gray-200 inline-block">
                                <img src={block.content} className="h-32 object-cover" alt={`Bloco ${index}`} />
                                <button type="button" onClick={() => updateBlockContent(index, '')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600"><Trash2 size={14}/></button>
                              </div>
                            ) : (
                              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors bg-gray-50 w-64">
                                <input type="file" accept=".jpg,.jpeg,.png" onChange={e => handleFileUpload(e, 'block', index)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="font-bold text-sm text-gray-500">Upload Imagem</span>
                              </div>
                            )
                          )}
                        </div>
                        <button type="button" onClick={() => removeBlock(index)} className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button type="button" onClick={() => addBlock('text')} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      + Adicionar Texto
                    </button>
                    <button type="button" onClick={() => addBlock('image')} className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      + Adicionar Imagem
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : (editingId ? 'Atualizar Projeto' : 'Publicar Projeto')}
                  </button>
                </div>
              </form>
            </section>

            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Trabalhos Cadastrados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-4 px-4 font-bold text-gray-500 text-sm">Capa</th>
                      <th className="py-4 px-4 font-bold text-gray-500 text-sm">Título</th>
                      <th className="py-4 px-4 font-bold text-gray-500 text-sm">Categoria</th>
                      <th className="py-4 px-4 font-bold text-gray-500 text-sm">Ordem</th>
                      <th className="py-4 px-4 font-bold text-gray-500 text-sm text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p, index) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <img src={p.cover_url || p.image_url || undefined} alt={p.title} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">{p.title}</td>
                        <td className="py-3 px-4">
                          <span className="bg-primary-light text-primary text-xs font-bold px-3 py-1 rounded-full">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => moveItem(projects, setProjects, index, 'up', 'projects')} disabled={index === 0} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                              <ArrowUp size={16} />
                            </button>
                            <button onClick={() => moveItem(projects, setProjects, index, 'down', 'projects')} disabled={index === projects.length - 1} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                              <ArrowUp size={16} className="rotate-180" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => handleEdit(p.id)} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors mr-2 font-bold text-sm">
                            Editar
                          </button>
                          <button onClick={(e) => handleDeleteProject(e, p.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors relative z-10" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 font-normal italic">
                          Nenhum projeto cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === 'Clientes' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Clientes (Logos)</h2>
            
            <form onSubmit={handleUploadLogo} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={logoName}
                  onChange={e => setLogoName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                  required
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-bold text-gray-700 mb-1">Imagem do Logo (.png, .svg)</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl h-12 flex items-center justify-center hover:border-primary transition-colors bg-white">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.svg"
                    onChange={e => setLogoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex items-center gap-2 text-gray-500">
                    <Upload size={16} className="text-primary" />
                    <span className="font-bold text-sm truncate px-2">{logoFile ? logoFile.name : 'Upload do Logo'}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  type="submit"
                  disabled={loading || !logoFile}
                  className="bg-primary text-white font-bold py-2 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Adicionar Logo'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {logos.map(logo => (
                <div key={logo.id} className="relative group border border-gray-200 rounded-xl p-4 flex items-center justify-center h-24 bg-white hover:border-primary transition-colors">
                  <img src={logo.image_url} alt={logo.name} className="max-w-full max-h-full object-contain" />
                  <button 
                    onClick={(e) => handleDeleteLogo(e, logo.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm z-10 cursor-pointer"
                    title="Excluir Logo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {logos.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 font-normal italic">
                  Nenhum logo cadastrado.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'Experiências' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Experiências</h2>
            
            <form onSubmit={handleAddExperience} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Empresa/Local</label>
                <input 
                  type="text" 
                  value={expCompany}
                  onChange={e => setExpCompany(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sua Função</label>
                <input 
                  type="text" 
                  value={expRole}
                  onChange={e => setExpRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Logo da Empresa (.png, .svg)</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl h-12 flex items-center justify-center hover:border-primary transition-colors bg-white">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.svg"
                    onChange={e => setExpLogoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex items-center gap-2 text-gray-500">
                    <Upload size={16} className="text-primary" />
                    <span className="font-bold text-sm truncate px-2">{expLogoFile ? expLogoFile.name : 'Upload do Logo'}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  type="submit"
                  disabled={loading || !expLogoFile}
                  className="bg-primary text-white font-bold py-2 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Adicionar Experiência'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {experiences.map((exp, index) => (
                <div key={exp.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
                  <div className="flex items-center gap-4">
                    {exp.logo_url && (
                      <img src={exp.logo_url} alt={exp.company} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.company}</h3>
                      <p className="text-sm text-gray-500">{exp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 mr-4">
                      <button onClick={() => moveItem(experiences, setExperiences, index, 'up', 'experiences')} disabled={index === 0} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                      <button onClick={() => moveItem(experiences, setExperiences, index, 'down', 'experiences')} disabled={index === experiences.length - 1} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                        <ArrowUp size={16} className="rotate-180" />
                      </button>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteExperience(e, exp.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Excluir Experiência"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {experiences.length === 0 && (
                <div className="py-8 text-center text-gray-500 font-normal italic">
                  Nenhuma experiência cadastrada.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'Skills' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-extrabold text-primary-dark mb-6">Habilidades & Competências</h2>
            
            <form onSubmit={handleAddSkill} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                <select 
                  value={skillCategory}
                  onChange={e => setSkillCategory(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-gray-700 bg-white"
                >
                  <option value="software">Softwares</option>
                  <option value="platform">Plataformas</option>
                  <option value="competence">Competências</option>
                  <option value="language">Línguas</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ícone (lucide.dev/icons)</label>
                <input 
                  type="text" 
                  value={skillIcon}
                  onChange={e => setSkillIcon(e.target.value)}
                  placeholder="Ex: Figma, Monitor, Globe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use os nomes exatos do site lucide.dev/icons</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Skill</label>
                <input 
                  type="text" 
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                  required
                />
              </div>
              {(skillCategory === 'competence' || skillCategory === 'language') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                  <textarea 
                    value={skillDescription}
                    onChange={e => setSkillDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal resize-none"
                  ></textarea>
                </div>
              )}
              <div className="md:col-span-2 flex justify-end">
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-white font-bold py-2 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Adicionar Skill'}
                </button>
              </div>
            </form>

            <div className="space-y-8">
              {['software', 'platform', 'competence', 'language'].map(cat => {
                const catSkills = skills.filter(s => s.category === cat);
                if (catSkills.length === 0) return null;
                
                const catNames = {
                  software: 'Softwares',
                  platform: 'Plataformas',
                  competence: 'Competências',
                  language: 'Línguas'
                };

                return (
                  <div key={cat}>
                    <h3 className="font-bold text-lg text-gray-800 mb-4 border-b border-gray-200 pb-2">{(catNames as any)[cat]}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catSkills.map((skill, index) => (
                        <div key={skill.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
                          <div className="flex items-center gap-4">
                            <DynamicIcon name={skill.icon} />
                            <div>
                              <h4 className="font-bold text-gray-900">{skill.name}</h4>
                              {skill.description && <p className="text-sm text-gray-500">{skill.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 mr-4">
                              <button onClick={() => moveItem(skills, setSkills, skills.findIndex(s => s.id === skill.id), 'up', 'skills')} disabled={index === 0} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                                <ArrowUp size={16} />
                              </button>
                              <button onClick={() => moveItem(skills, setSkills, skills.findIndex(s => s.id === skill.id), 'down', 'skills')} disabled={index === catSkills.length - 1} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                                <ArrowUp size={16} className="rotate-180" />
                              </button>
                            </div>
                            <button 
                              onClick={(e) => handleDeleteSkill(e, skill.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Excluir Skill"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {skills.length === 0 && (
                <div className="py-8 text-center text-gray-500 font-normal italic">
                  Nenhuma skill cadastrada.
                </div>
              )}
            </div>
          </section>
        )}

        </div>
      </main>
    </div>
  );
}

function ProjectDetail() {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center">Projeto não encontrado.</div>;

  // Group consecutive image blocks into masonry galleries
  const groupedBlocks: any[] = [];
  let currentImageGroup: any[] = [];

  if (project?.blocks) {
    project.blocks.forEach((block: any) => {
      if (block.type === 'image') {
        currentImageGroup.push(block);
      } else {
        if (currentImageGroup.length > 0) {
          groupedBlocks.push({ type: 'imageGroup', images: currentImageGroup });
          currentImageGroup = [];
        }
        groupedBlocks.push(block);
      }
    });
    if (currentImageGroup.length > 0) {
      groupedBlocks.push({ type: 'imageGroup', images: currentImageGroup });
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-gray-900 font-sans">
      <header className="fixed top-0 w-full bg-gradient-to-r from-[#0E12DF] to-[#0a0b1a] z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-2xl tracking-tight text-white">
            ANALU<span className="text-white/70">.</span>
          </Link>
          <Link to="/" className="font-bold text-white/90 hover:text-white transition-colors flex items-center gap-2">
            <ArrowRight size={20} className="rotate-180" /> Voltar
          </Link>
        </div>
      </header>

      <main className="pt-20">
        {/* Cover */}
        <div className="w-full h-[60vh] relative">
          <img src={project.cover_url || project.image_url || undefined} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-end p-12">
            <div className="max-w-5xl mx-auto w-full">
              <span className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full mb-4 inline-block">
                {project.category}
              </span>
              <h1 className="font-heading text-5xl md:text-7xl font-extrabold text-white mb-2">{project.title}</h1>
              {project.tags && (
                <p className="text-white/80 font-light text-lg">{project.tags.split(',').join(' • ')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Blocks */}
        <div className="max-w-6xl mx-auto py-24 px-6 space-y-16">
          {groupedBlocks.map((group: any, index: number) => {
            if (group.type === 'text') {
              return (
                <div key={index} className="max-w-4xl mx-auto w-full">
                  <p className="text-xl md:text-2xl leading-relaxed text-gray-700 font-light whitespace-pre-wrap">
                    {group.content}
                  </p>
                </div>
              );
            } else if (group.type === 'imageGroup') {
              return (
                <div key={index} className="columns-1 sm:columns-2 md:columns-3 gap-6 w-full">
                  {group.images.map((img: any, imgIndex: number) => (
                    <img 
                      key={imgIndex} 
                      src={img.content || undefined} 
                      alt={`Galeria ${index} - Imagem ${imgIndex}`} 
                      className="break-inside-avoid mb-6 w-full h-auto rounded-xl shadow-lg object-cover" 
                    />
                  ))}
                </div>
              );
            }
            return null;
          })}
          {groupedBlocks.length === 0 && (
            <div className="text-center text-gray-500 italic">Este projeto ainda não possui um estudo de caso detalhado.</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projeto/:id" element={<ProjectDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
