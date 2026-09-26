import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Flashlight,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuthStore } from '../../store';

interface ScanResult {
  valid: boolean;
  found: boolean;
  title?: string;
  name?: string;
  student_name?: string;
  roll_number?: string;
  admn_no?: string;
  college_name?: string;
  reason?: string;
  message?: string;
  scan_type?: string;
  limit_exceeded?: boolean;
  photo_url?: string;
}

type Activity = ScanResult & { id: number; scannedAt: string };

const statusFor = (result: ScanResult) => {
  if (result.valid) return { label: 'VALID · ACCESS GRANTED', tone: 'valid' as const, icon: ShieldCheck };
  if (result.limit_exceeded) return { label: 'LIMIT EXCEEDED', tone: 'warning' as const, icon: AlertTriangle };
  if (!result.found) return { label: 'STUDENT NOT FOUND', tone: 'invalid' as const, icon: XCircle };
  if (result.message?.toLowerCase().includes('expired')) return { label: 'EXPIRED / NO ACTIVE PASS', tone: 'invalid' as const, icon: XCircle };
  return { label: 'ACCESS DENIED', tone: 'invalid' as const, icon: ShieldAlert };
};

const initials = (name?: string) => (name || 'ST').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export default function SecurityApp() {
  const token = useAuthStore((s) => s.token);
  const fullName = useAuthStore((s) => s.fullName);
  const collegeName = useAuthStore((s) => s.collegeName);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [timerSeconds, setTimerSeconds] = useState(15);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available here. Use the admission number field below.');
      return;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Camera permission is unavailable. Continue with manual verification.');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (scanning && !result) startCamera();
    else stopCamera();
    return stopCamera;
  }, [result, scanning, startCamera, stopCamera]);

  const playFeedback = (kind: 'success' | 'error' | 'warning') => {
    try {
      const context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = kind === 'success' ? 880 : kind === 'warning' ? 587 : 300;
      gain.gain.value = kind === 'error' ? 0.24 : 0.15;
      oscillator.start();
      oscillator.stop(context.currentTime + (kind === 'error' ? 0.35 : 0.15));
    } catch { /* Audio is an optional operator cue. */ }
    if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [90] : [180, 80, 180]);
  };

  const processCode = useCallback(async (code: string) => {
    if (processingRef.current || !code.trim()) return;
    processingRef.current = true;
    setLoading(true);
    try {
      const response = await axios.post('/api/gate/scan', { admn_no: code.trim() }, { headers });
      const scan = response.data as ScanResult;
      setResult(scan);
      setScanning(false);
      setActivity((current) => [{ ...scan, id: Date.now(), scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current].slice(0, 8));
      playFeedback(scan.valid ? 'success' : scan.limit_exceeded ? 'warning' : 'error');
    } catch (error: any) {
      const scan: ScanResult = { valid: false, found: false, name: code.trim(), reason: 'VERIFICATION ERROR', message: error.response?.data?.detail || 'Verification could not be completed. Try again.' };
      setResult(scan);
      setScanning(false);
      setActivity((current) => [{ ...scan, id: Date.now(), scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current].slice(0, 8));
      playFeedback('error');
    } finally {
      setLoading(false);
      window.setTimeout(() => { processingRef.current = false; }, 600);
    }
  }, [headers]);

  useEffect(() => {
    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (scanning && !result && !processingRef.current && video && canvas && video.readyState >= 3) {
        const context = canvas.getContext('2d');
        if (context && video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) processCode(code.data);
        }
      }
      frameRef.current = requestAnimationFrame(scanFrame);
    };
    frameRef.current = requestAnimationFrame(scanFrame);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [processCode, result, scanning]);

  useEffect(() => {
    if (!result) return;
    setTimerSeconds(15);
    const timer = window.setInterval(() => setTimerSeconds((seconds) => {
      if (seconds <= 1) { window.clearInterval(timer); resetScanner(); return 15; }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [result]);

  const resetScanner = () => { setResult(null); setScanning(true); setCameraError(''); };
  const submitManual = (event: React.FormEvent) => { event.preventDefault(); processCode(manualInput); setManualInput(''); };
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as (MediaStreamTrack & { applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void> }) | undefined;
    if (!track?.applyConstraints) return;
    const next = !torchOn;
    try { await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); setTorchOn(next); } catch { setCameraError('Torch is not supported on this device.'); }
  };
  const handleLogout = () => { stopCamera(); logout(); navigate('/login'); };

  const currentStatus = result ? statusFor(result) : null;
  const StatusIcon = currentStatus?.icon;
  const displayName = result?.student_name || result?.name || 'Unknown student';

  return (
    <div className="portal-shell min-h-screen bg-[#0c1117] text-[#f4f1e9] font-sans selection:bg-[#e2a85c]/30">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#121922]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0c1117] p-2"><img src={logo} alt="Garuda" className="max-h-full max-w-full object-contain" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-black tracking-tight">Gate operations</p><p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#72b5a4]">{collegeName || 'Campus access'} · Security</p></div>
          </div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-400 sm:inline">{fullName || 'Security operator'}</span><button onClick={handleLogout} aria-label="Log out" className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#18222d] text-slate-300 transition hover:border-[#e2a85c]/50 hover:text-[#e2a85c]"><LogOut data-icon="inline-start" /></button></div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)] lg:py-8">
        <section className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#e2a85c]">Live gate desk</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Verify access.</h1><p className="mt-2 max-w-xl text-sm text-slate-400">Scan a student QR code or enter an admission number. Every decision is recorded by the gate service.</p></div><div className="hidden items-center gap-2 rounded-full border border-[#72b5a4]/25 bg-[#72b5a4]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#72b5a4] sm:flex"><span className="size-2 rounded-full bg-[#72b5a4]" /> Ready</div></div>

          {!result ? <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121922] shadow-2xl shadow-black/20">
            <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden bg-[#06090d] sm:aspect-[16/10] lg:aspect-[16/9]">
              <video ref={videoRef} className="size-full object-cover" muted aria-label="QR scanner camera" /><canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="relative size-[min(62vw,280px)] rounded-3xl border border-[#e2a85c]/50 shadow-[0_0_0_999px_rgba(6,9,13,.32)]"><span className="absolute -left-px -top-px size-10 rounded-tl-3xl border-l-4 border-t-4 border-[#e2a85c]" /><span className="absolute -right-px -top-px size-10 rounded-tr-3xl border-r-4 border-t-4 border-[#e2a85c]" /><span className="absolute -bottom-px -left-px size-10 rounded-bl-3xl border-b-4 border-l-4 border-[#e2a85c]" /><span className="absolute -bottom-px -right-px size-10 rounded-br-3xl border-b-4 border-r-4 border-[#e2a85c]" /></div></div>
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c1117]/85 px-3 py-2 backdrop-blur-md"><button onClick={toggleTorch} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10"><Flashlight data-icon="inline-start" />{torchOn ? 'Torch on' : 'Torch'}</button><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#e2a85c]"><QrCode data-icon="inline-start" /> Scan QR</span><button onClick={() => setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment')} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10"><RefreshCw data-icon="inline-start" /> Flip</button></div>
            </div>
            {cameraError && <div role="status" className="flex items-start gap-3 border-t border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 shrink-0" />{cameraError}</div>}
            <form onSubmit={submitManual} className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row"><label htmlFor="admission-number" className="sr-only">Admission number</label><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input id="admission-number" value={manualInput} onChange={(event) => setManualInput(event.target.value)} placeholder="Admission number or roll number" className="min-h-12 w-full rounded-xl border border-white/10 bg-[#0c1117] pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#e2a85c] focus:outline-none" /></div><button disabled={loading || !manualInput.trim()} className="min-h-12 rounded-xl bg-[#e2a85c] px-6 text-sm font-black text-[#17120b] transition hover:bg-[#efbd78] disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Verifying…' : 'Verify student'}<ArrowRight className="ml-2 inline" /></button></form>
          </div> : <VerificationResult result={result} status={currentStatus!} statusIcon={StatusIcon!} displayName={displayName} collegeName={collegeName} timerSeconds={timerSeconds} onReset={resetScanner} />}
        </section>

        <aside className="min-w-0"><div className="rounded-[1.75rem] border border-white/10 bg-[#121922] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">This session</p><h2 className="mt-1 text-lg font-black">Recent activity</h2></div><Clock3 className="text-[#72b5a4]" /></div>{activity.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center"><Clock3 className="mx-auto mb-3 text-slate-600" /><p className="text-sm font-bold text-slate-300">No scans yet</p><p className="mt-1 text-xs text-slate-500">Verified gate activity will appear here.</p></div> : <div className="flex flex-col gap-2">{activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div>}</div><div className="mt-4 rounded-[1.75rem] border border-[#72b5a4]/15 bg-[#72b5a4]/[0.06] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#72b5a4]" /><div><p className="text-sm font-black">Gate protocol</p><p className="mt-1 text-xs leading-5 text-slate-400">Verify the student identity before allowing movement. A valid scan consumes the active pass through the existing gate service.</p></div></div></div></aside>
      </main>
    </div>
  );
}

function VerificationResult({ result, status, statusIcon: StatusIcon, displayName, collegeName, timerSeconds, onReset }: { result: ScanResult; status: ReturnType<typeof statusFor>; statusIcon: React.ComponentType<{ className?: string }>; displayName: string; collegeName?: string; timerSeconds: number; onReset: () => void }) {
  const tone = status.tone === 'valid' ? 'border-[#72b5a4]/40 bg-[#72b5a4]/[0.08] text-[#d8f0e9]' : status.tone === 'warning' ? 'border-[#e2a85c]/40 bg-[#e2a85c]/[0.08] text-[#fff0d6]' : 'border-rose-400/35 bg-rose-400/[0.07] text-rose-100';
  return <div className={`rounded-[1.75rem] border p-5 shadow-2xl shadow-black/20 sm:p-7 ${tone}`}><div className="flex items-start justify-between gap-4 border-b border-current/15 pb-5"><div className="flex items-start gap-3"><StatusIcon className="mt-0.5 size-9 shrink-0" /><div><p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">Verification result</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{status.label}</h2><p className="mt-1 text-xs font-medium opacity-70">{result.reason || result.title || 'Gate pass verification'}</p></div></div><span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-black uppercase">{result.scan_type || 'Gate scan'}</span></div><div className="my-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0c1117]/65 p-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#18222d]">{result.photo_url ? <img src={result.photo_url} alt={`${displayName} profile`} className="size-full object-cover" /> : <span className="text-lg font-black text-[#e2a85c]">{initials(displayName)}</span>}</div><div className="min-w-0"><h3 className="truncate text-lg font-black text-white">{displayName}</h3><p className="mt-1 font-mono text-xs text-slate-400">{result.roll_number || 'No roll number'} · {result.admn_no || 'No admission number'}</p><p className="mt-1 text-xs text-slate-400">{result.college_name || collegeName || 'Garuda campus'}</p></div></div>{result.message && <div className="mb-5 rounded-xl border border-current/15 bg-black/20 p-3 text-sm leading-6">{result.message}</div>}<div className="flex flex-col gap-3 sm:flex-row"><button onClick={onReset} className="min-h-12 flex-1 rounded-xl bg-[#f4f1e9] px-4 text-sm font-black text-[#0c1117] transition hover:bg-white"><Camera className="mr-2 inline" />Scan next student</button><span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-current/15 px-4 text-xs font-bold opacity-70"><RefreshCw /> Reset in {timerSeconds}s</span></div></div>;
}

function ActivityRow({ item }: { item: Activity }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1117]/60 p-3"><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.valid ? 'bg-[#72b5a4]/10 text-[#72b5a4]' : 'bg-rose-400/10 text-rose-300'}`}>{item.valid ? <CheckCircle2 /> : <X />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-200">{item.student_name || item.name || 'Unknown student'}</p><p className="truncate font-mono text-[10px] text-slate-500">{item.roll_number || item.admn_no || '—'} · {item.scannedAt}</p></div><span className={`text-[9px] font-black uppercase ${item.valid ? 'text-[#72b5a4]' : 'text-rose-300'}`}>{item.valid ? 'Allowed' : 'Denied'}</span></div>;
}
