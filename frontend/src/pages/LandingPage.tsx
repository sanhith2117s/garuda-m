import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Html, OrbitControls, Sparkles as DreiSparkles, Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { ArrowDown, ArrowRight, Building2, Check, ChevronRight, Fingerprint, KeyRound, Layers3, Menu, Moon, Orbit, ScanLine, ShieldCheck, Sparkles, Sun, Users, X } from 'lucide-react';
import * as THREE from 'three';

const chapters = [
  { eyebrow: '01 / Identity', title: 'One campus.\nOne pulse.', copy: 'Garuda turns fragmented campus movement into one precise operational layer.', metric: '03', label: 'Connected institutions' },
  { eyebrow: '02 / Movement', title: 'Passes that\nmove with intent.', copy: 'Every request, approval, exit, and return becomes visible, accountable, and calm.', metric: '100%', label: 'Digital movement' },
  { eyebrow: '03 / Control', title: 'Security sees\nthe whole picture.', copy: 'A gate console designed for speed, confidence, and the moments that matter.', metric: '24/7', label: 'Gate readiness' },
];

const leadership = [
  { name: 'Dr. Deepa Ganu', role: 'Leadership / KMIT', image: '/images/leadership/deepa_ganu.jpg' },
  { name: 'Neil Gogte', role: 'Leadership / Garuda', image: '/images/leadership/neil_gogte.jpg' },
  { name: 'Nithin Sahasrabudhe', role: 'Leadership / NGIT', image: '/images/leadership/nithin_sahasrabudhe.jpg' },
];
const mentors = [
  { name: 'ALK Bilhari', role: 'Mentor / Systems', image: '/images/mentors/alk_bilhari.jpg' },
  { name: 'Para Upendar', role: 'Mentor / Operations', image: '/images/mentors/para_upendar.jpg' },
  { name: 'Vanitha', role: 'Mentor / Student experience', image: '/images/mentors/vanitha.jpg' },
];
const team = [
  { name: 'Sanhith Reddy', role: 'Product & platform', image: '/images/team/sanhith_reddy.jpg' },
  { name: 'Bharath Mahesh Reddy', role: 'Engineering', image: '/images/team/bharath_mahesh_reddy.jpg' },
  { name: 'Pranay Teja', role: 'Experience systems', image: '/images/team/pranay_teja.jpg' },
  { name: 'Sai Kishor', role: 'Campus operations', image: '/images/team/sai_kishor.jpg' },
];

function CampusBuilding() {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.035;
  });

  const windows = Array.from({ length: 18 }, (_, index) => {
    const floor = Math.floor(index / 6);
    const column = index % 6;
    return <mesh key={index} position={[-0.88 + column * 0.35, -0.55 + floor * 0.55, 0.62]}><boxGeometry args={[0.18, 0.25, 0.035]} /><meshStandardMaterial color={column % 3 === 0 ? '#f28c28' : '#8bd1c0'} emissive={column % 3 === 0 ? '#f28c28' : '#8bd1c0'} emissiveIntensity={0.55} /></mesh>;
  });

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      <mesh position={[0, -1.05, 0]} rotation={[0, 0.15, 0]}><cylinderGeometry args={[1.55, 1.82, 0.14, 6]} /><meshStandardMaterial color="#17365d" metalness={0.65} roughness={0.28} /></mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0.15, 0]}><boxGeometry args={[2.35, 2.25, 1.45]} /><meshStandardMaterial color="#bfc9c8" metalness={0.25} roughness={0.22} /></mesh>
      <mesh position={[0, 1.35, 0]} rotation={[0, 0.15, 0]}><boxGeometry args={[1.42, 0.38, 1.2]} /><meshStandardMaterial color="#f28c28" metalness={0.32} roughness={0.24} /></mesh>
      {windows}
      <mesh position={[0, -0.66, 0.75]}><boxGeometry args={[0.38, 0.72, 0.05]} /><meshStandardMaterial color="#17365d" metalness={0.3} roughness={0.16} /></mesh>
      <mesh position={[0, 1.85, 0]}><cylinderGeometry args={[0.035, 0.035, 0.72, 12]} /><meshStandardMaterial color="#f28c28" emissive="#f28c28" emissiveIntensity={1.2} /></mesh>
      <mesh position={[0, 2.22, 0]}><sphereGeometry args={[0.12, 20, 20]} /><meshStandardMaterial color="#f28c28" emissive="#f28c28" emissiveIntensity={1.8} /></mesh>
      <mesh scale={1.55} rotation={[0.2, 0.5, 0]}><torusGeometry args={[1.42, 0.012, 16, 160]} /><meshBasicMaterial color="#72b5a4" transparent opacity={0.72} /></mesh>
      <mesh scale={1.78} rotation={[1.2, 0.15, 0.4]}><torusGeometry args={[1.42, 0.008, 16, 160]} /><meshBasicMaterial color="#f28c28" transparent opacity={0.42} /></mesh>
    </group>
  );
}

function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5.8], fov: 42 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 4, 4]} intensity={14} color="#f28c28" />
      <pointLight position={[-4, -2, 2]} intensity={10} color="#6aa99b" />
      <Suspense fallback={null}>
        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.48}>
          <CampusBuilding key="campus-building" />
        </Float>
        <DreiSparkles count={85} scale={7} size={1.8} speed={0.28} color="#f28c28" />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />
    </Canvas>
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}>{children}</div>;
}

function PeopleSection({ id, eyebrow, title, intro, people }: { id: string; eyebrow: string; title: string; intro: string; people: { name: string; role: string; image: string }[] }) {
  return (
    <section id={id} className="relative overflow-hidden border-t border-slate-900/10 dark:border-white/10 py-28 sm:py-40">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <Reveal><div className="grid lg:grid-cols-[.7fr_1fr] gap-10 items-end"><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#17365d] dark:text-[#72b5a4]">{eyebrow}</p><div><h2 className="display-title whitespace-pre-line text-5xl sm:text-7xl font-black leading-[.88] tracking-[-.065em]">{title}</h2><p className="mt-6 max-w-lg text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">{intro}</p></div></div></Reveal>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{people.map((person, i) => <Reveal key={person.name} delay={i * 100}><article className="group overflow-hidden rounded-[2rem] border border-slate-900/10 dark:border-white/10 bg-white/55 dark:bg-white/[.035] transition-all duration-700 hover:-translate-y-2 hover:border-[#f28c28]/70"><div className="relative aspect-[4/3] overflow-hidden bg-[#17365d]"><img src={person.image} alt={person.name} className="h-full w-full object-cover grayscale-[.15] transition duration-700 group-hover:scale-105 group-hover:grayscale-0" /><div className="absolute inset-0 bg-gradient-to-t from-[#101820]/60 via-transparent to-transparent" /></div><div className="p-6"><h3 className="text-xl font-black tracking-tight">{person.name}</h3><p className="mt-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#f28c28]">{person.role}</p></div></article></Reveal>)}</div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const getPortalPath = () => !token ? '/login' : role === 'security' ? '/security' : role === 'hod' ? '/hod' : role === 'mentor' ? '/mentor' : role === 'student' ? '/student' : '/admin';
  const links = useMemo(() => [['About', 'about'], ['System', 'system'], ['Leadership', 'leadership'], ['Mentors', 'mentors'], ['Team', 'team'], ['Institutions', 'institutions']], []);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  useEffect(() => {
    const onScroll = () => setChapter(Math.min(chapters.length - 1, Math.floor(window.scrollY / Math.max(window.innerHeight * 1.08, 680))));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <main className="garuda-home bg-[#f5f2eb] text-[#101820] dark:bg-[#0b1117] dark:text-[#f5f0e7] overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between rounded-full border border-slate-900/10 dark:border-white/10 bg-[#f5f2eb]/75 dark:bg-[#0b1117]/75 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-[0_12px_60px_rgba(0,0,0,.08)]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3" aria-label="Back to top">
            <span className="grid size-9 place-items-center rounded-full bg-[#f28c28] text-[#101820]"><ShieldCheck size={18} /></span>
            <span className="text-sm font-black tracking-[0.26em]">GARUDA</span>
          </button>
          <nav className="hidden md:flex items-center gap-7 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {links.map(([label, id]) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#f28c28] transition-colors">{label}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="grid size-9 place-items-center rounded-full border border-slate-900/10 dark:border-white/10" aria-label="Toggle color mode">{darkMode ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button onClick={() => navigate(getPortalPath())} className="hidden sm:flex items-center gap-2 rounded-full bg-[#101820] dark:bg-[#f5f0e7] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white dark:text-[#101820]">Enter platform <ArrowRight size={13} /></button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden grid size-9 place-items-center" aria-label="Toggle navigation">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden mt-2 rounded-3xl border border-slate-900/10 dark:border-white/10 bg-[#f5f2eb]/95 dark:bg-[#0b1117]/95 p-4 flex flex-col gap-3">{links.map(([label, id]) => <button key={id} onClick={() => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left text-xs font-bold uppercase tracking-widest py-2">{label}</button>)}<button onClick={() => navigate(getPortalPath())} className="rounded-full bg-[#f28c28] px-4 py-3 text-xs font-black uppercase tracking-widest">Enter platform</button></div>}
      </header>

      <section id="hero" className="relative min-h-[100svh] flex items-center pt-28 pb-16">
        <div className="absolute inset-0 hero-grid opacity-30 dark:opacity-20" />
        <div className="absolute -top-32 -right-32 size-[36rem] rounded-full bg-[#f28c28]/20 blur-[110px]" />
        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 sm:px-10 grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center">
          <div className="max-w-3xl">
            <Reveal><p className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.34em] text-[#72b5a4]"><span className="h-px w-10 bg-[#f28c28]" /> Smart campus infrastructure</p></Reveal>
            <Reveal delay={100}><h1 className="display-title text-[clamp(3.8rem,9vw,8.6rem)] font-black leading-[.84] tracking-[-0.075em]">Move with<br /><span className="text-[#f28c28]">clarity.</span></h1></Reveal>
            <Reveal delay={180}><p className="mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400">Garuda is the quiet operating system behind safer gates, simpler passes, and a more connected campus.</p></Reveal>
            <Reveal delay={260}><div className="mt-9 flex flex-wrap gap-3"><button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full bg-[#101820] dark:bg-[#f5f0e7] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white dark:text-[#101820] transition-transform hover:-translate-y-1">Explore the system <ArrowDown className="inline ml-2" size={14} /></button><button onClick={() => navigate(getPortalPath())} className="rounded-full border border-slate-900/15 dark:border-white/15 px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-all hover:border-[#f28c28]">Access platform <ArrowRight className="inline ml-2" size={14} /></button></div></Reveal>
            <Reveal delay={340}><div className="mt-14 flex items-center gap-8 border-t border-slate-900/10 dark:border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span><strong className="block text-2xl tracking-normal text-current">03</strong>Institutions</span><span><strong className="block text-2xl tracking-normal text-current">24/7</strong>Gate readiness</span><span><strong className="block text-2xl tracking-normal text-current">100%</strong>Digital flow</span></div></Reveal>
          </div>
          <Reveal delay={220} className="h-[min(72vw,680px)] min-h-[420px]"><div className="relative h-full rounded-[3rem] border border-slate-900/10 dark:border-white/10 bg-[#e7e1d5]/55 dark:bg-white/[.025] shadow-2xl overflow-hidden"><div className="absolute left-6 top-6 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500"><span className="size-2 rounded-full bg-[#f28c28] animate-pulse" /> Core intelligence / live</div><HeroScene /><div className="absolute bottom-7 left-7 right-7 flex items-end justify-between text-[10px] font-bold uppercase tracking-[.18em] text-slate-500"><span>01 — Orchestrate</span><span>Scroll to navigate ↓</span></div></div></Reveal>
        </div>
      </section>

      <section id="about" className="relative py-28 sm:py-40"><div className="max-w-7xl mx-auto px-6 sm:px-10"><Reveal><div className="grid lg:grid-cols-[.65fr_1fr] gap-12 items-end"><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#72b5a4]">The premise / 01</p><h2 className="display-title text-5xl sm:text-7xl font-black leading-[.9] tracking-[-.06em]">Less friction.<br /><span className="text-[#f28c28]">More presence.</span></h2></div></Reveal><Reveal delay={120}><p className="mt-16 max-w-3xl text-2xl sm:text-4xl font-medium leading-[1.1] tracking-[-.04em] text-slate-700 dark:text-slate-300">A campus should feel like one considered place — not a stack of disconnected systems. Garuda brings every movement into focus.</p></Reveal><div className="mt-24 grid md:grid-cols-3 gap-4">{[{icon: Fingerprint, title: 'Identity', copy: 'Role-aware access that understands who is moving and why.'}, {icon: KeyRound, title: 'Permission', copy: 'A clean path from request to approval to verified return.'}, {icon: ScanLine, title: 'Awareness', copy: 'Every gate has context, without adding noise to the moment.'}].map(({ icon: Icon, title, copy }, i) => <Reveal key={title} delay={i * 100}><article className="group min-h-56 rounded-3xl border border-slate-900/10 dark:border-white/10 bg-white/50 dark:bg-white/[.035] p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#f28c28]/60"><Icon className="text-[#f28c28]" size={22} /><h3 className="mt-16 text-2xl font-black tracking-tight">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{copy}</p></article></Reveal>)}</div></div></section>

      <PeopleSection id="leadership" eyebrow="Leadership / 02" title="Direction with\nconviction." people={leadership} intro="The people setting a clear direction for safer, more connected campuses." />
      <PeopleSection id="mentors" eyebrow="Mentors / 03" title="Experience that\nkeeps us grounded." people={mentors} intro="Guidance from the people who understand the campus beyond the interface." />

      <section id="system" className="relative min-h-[300svh] bg-[#101820] text-[#f5f0e7]"><div className="sticky top-0 min-h-screen flex items-center overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(220,168,107,.16),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(106,169,155,.15),transparent_30%)]" /><div className="relative z-10 max-w-7xl w-full mx-auto px-6 sm:px-10 grid lg:grid-cols-[.75fr_1fr] gap-16 items-center"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#72b5a4]">The system / {String(chapter + 1).padStart(2, '0')}</p><h2 className="mt-8 whitespace-pre-line text-6xl sm:text-8xl font-black leading-[.84] tracking-[-.07em]">{chapters[chapter].title}</h2><p className="mt-8 max-w-md text-base leading-relaxed text-slate-400">{chapters[chapter].copy}</p><div className="mt-10 flex gap-3">{chapters.map((item, i) => <button key={item.eyebrow} onClick={() => setChapter(i)} className={`h-1.5 transition-all ${i === chapter ? 'w-16 bg-[#f28c28]' : 'w-7 bg-white/20'}`} aria-label={`Show chapter ${i + 1}`} />)}</div></div><div className="relative h-[28rem] sm:h-[36rem] grid place-items-center"><div className="absolute size-[21rem] sm:size-[30rem] rounded-full border border-white/10 animate-[spin_28s_linear_infinite]" /><div className="absolute size-[15rem] sm:size-[22rem] rounded-full border border-[#f28c28]/30 animate-[spin_20s_linear_infinite_reverse]" /><div className="relative grid size-56 sm:size-72 place-items-center rounded-full border border-[#f28c28]/50 bg-[#f28c28]/10 shadow-[0_0_100px_rgba(220,168,107,.15)] transition-all duration-700"><Orbit className="text-[#f28c28]" size={90} strokeWidth={1} /><div className="absolute bottom-8 rounded-full bg-[#f28c28] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#101820]">{chapters[chapter].metric} / {chapters[chapter].label}</div></div></div></div></div></section>

      <section id="signals" className="py-32 sm:py-44"><div className="max-w-7xl mx-auto px-6 sm:px-10"><Reveal><div className="flex flex-col sm:flex-row justify-between gap-8 items-start"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#72b5a4]">Signals / 04</p><h2 className="mt-6 text-5xl sm:text-7xl font-black tracking-[-.06em] leading-[.9]">Designed for<br /><span className="text-[#f28c28]">the hand.</span></h2></div><p className="max-w-xs text-sm leading-relaxed text-slate-500">Every interaction is tuned for the people who use Garuda in motion — at a desk, at a gate, or between classes.</p></div></Reveal><div className="mt-20 grid lg:grid-cols-2 gap-5">{['Request in seconds.', 'Approve with context.', 'Verify without doubt.', 'Return with a record.'].map((label, i) => <Reveal key={label} delay={i * 90}><div className="flex items-center justify-between border-t border-slate-900/10 dark:border-white/10 py-6 group"><div className="flex items-center gap-6"><span className="font-mono text-xs text-[#f28c28]">0{i + 1}</span><h3 className="text-2xl sm:text-4xl font-black tracking-tight transition-transform group-hover:translate-x-2">{label}</h3></div><ChevronRight className="text-slate-400 transition-transform group-hover:translate-x-2" /></div></Reveal>)}</div></div></section>

      <PeopleSection id="team" eyebrow="Team / 04" title="Built by people\nwho care." people={team} intro="A cross-functional team turning everyday campus movement into a calmer, more trusted experience." />

      <section id="institutions" className="border-y border-slate-900/10 dark:border-white/10 py-24"><div className="max-w-7xl mx-auto px-6 sm:px-10"><Reveal><p className="text-center text-[10px] font-black uppercase tracking-[.3em] text-[#17365d] dark:text-[#72b5a4]">A shared operating layer for</p><div className="mt-10 grid sm:grid-cols-3 gap-3">{['KMIT', 'KMEC', 'NGIT'].map((name, i) => <div key={name} className="group rounded-3xl border border-slate-900/10 dark:border-white/10 p-8 text-center transition-all hover:bg-[#f28c28] hover:text-[#101820]"><Building2 className="mx-auto mb-5 opacity-60 group-hover:opacity-100" size={22} /><div className="text-4xl font-black tracking-[-.05em]">{name}</div><p className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Connected institution / 0{i + 1}</p></div>)}</div></Reveal></div></section>

      <footer className="bg-[#101820] text-[#f5f0e7] py-20"><div className="max-w-7xl mx-auto px-6 sm:px-10"><div className="flex flex-col md:flex-row justify-between gap-12"><div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#f28c28] text-[#101820]"><ShieldCheck size={20} /></span><span className="text-xl font-black tracking-[.22em]">GARUDA</span></div><p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-400">A considered platform for campus movement, designed for clarity at every layer.</p></div><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#72b5a4]">Ready when you are</p><button onClick={() => navigate(getPortalPath())} className="mt-5 rounded-full bg-[#f28c28] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-[#101820] transition-transform hover:-translate-y-1">Enter Garuda <ArrowRight className="inline ml-2" size={14} /></button></div></div><div className="mt-20 flex justify-between border-t border-white/10 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-500"><span>© {new Date().getFullYear()} Garuda</span><span>Move with clarity.</span></div></div></footer>
    </main>
  );
}
