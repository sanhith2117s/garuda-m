import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';
import { useAuthStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Flashlight, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Search, Clock, UtensilsCrossed, Sparkles } from 'lucide-react';
import logo from '../../assets/logo.png';

interface ScanResult {
  valid: bool;
  found: bool;
  title?: string;
  name?: string;
  student_name?: string;
  roll_number?: string;
  admn_no?: string;
  college_name?: string;
  reason?: string;
  message?: string;
  scan_type?: string;
  limit_exceeded?: bool;
  photo_url?: string;
}

export default function SecurityApp() {
  const token = useAuthStore(s => s.token);
  const fullName = useAuthStore(s => s.fullName);
  const collegeName = useAuthStore(s => s.collegeName);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const headers = { Authorization: `Bearer ${token}` };

  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(15);

  useEffect(() => {
    if (!result) return;
    setTimerSeconds(15);
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNextScan();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Audio beep generator using Web Audio API
  const playBeep = (type: 'success' | 'error' | 'warning') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch { /* Silent if audio context not permitted */ }

    // Haptic vibration
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([100]);
      else if (type === 'warning') navigator.vibrate([100, 50, 100]);
      else navigator.vibrate([200, 100, 200]);
    }
  };

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (scanning && !result) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanning, result, startCamera]);

  // Frame scanning loop via jsQR
  useEffect(() => {
    const scanFrame = () => {
      if (!scanning || result || isProcessingRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleProcessCode(code.data);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scanning, result]);

  // Process Scanned Code via Backend API
  const handleProcessCode = async (codeStr: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);

    try {
      const res = await axios.post('/api/gate/scan', { admn_no: codeStr.trim() }, { headers });
      const scanRes: ScanResult = res.data;
      setResult(scanRes);

      if (scanRes.valid) {
        playBeep('success');
      } else if (scanRes.limit_exceeded || scanRes.message?.includes('Limit')) {
        playBeep('warning');
      } else {
        playBeep('error');
      }

      setRecentScans(prev => [scanRes, ...prev.slice(0, 9)]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Scan verification failed';
      const errRes: ScanResult = {
        valid: false,
        found: false,
        name: codeStr,
        message: errorMsg,
        reason: 'VERIFICATION ERROR'
      };
      setResult(errRes);
      playBeep('error');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleProcessCode(manualInput.trim());
      setManualInput('');
    }
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        const newTorch = !torchOn;
        try {
          await (track as any).applyConstraints({ advanced: [{ torch: newTorch }] });
          setTorchOn(newTorch);
        } catch { /* torch not supported on browser */ }
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleNextScan = () => {
    setResult(null);
    setScanning(true);
  };

  const handleLogout = () => {
    stopCamera();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Mobile Top Header */}
      <header className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Garuda" className="h-8 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">Garuda Gate Scanner</h1>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{collegeName || 'Campus Access'} • Security</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300 hidden sm:inline">{fullName}</span>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4">
        {/* Scanner Canvas / Video Viewport */}
        {!result ? (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-4/3 sm:aspect-square shadow-2xl border border-slate-800 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="w-64 h-64 border-2 border-emerald-500/70 rounded-3xl relative animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>

            {/* Scanner Controls Bar */}
            <div className="absolute bottom-3 inset-x-3 flex justify-between items-center px-4 py-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/50">
              <button 
                onClick={toggleTorch} 
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${torchOn ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'}`}
              >
                <Flashlight className="w-4 h-4" /> {torchOn ? 'Torch On' : 'Torch'}
              </button>
              <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase animate-pulse">Scanning QR...</span>
              <button 
                onClick={toggleCameraFacing} 
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-semibold"
              >
                <RefreshCw className="w-4 h-4" /> Flip
              </button>
            </div>
          </div>
        ) : (
          /* Scan Result Card Screen */
          <div className={`rounded-2xl p-5 border shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 ${
            result.valid 
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100' 
              : result.limit_exceeded 
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-100'
          }`}>
            {/* Status Header Badge */}
            <div className="flex items-center justify-between border-b pb-3 border-current/20">
              <div className="flex items-center gap-2.5">
                {result.valid ? (
                  <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                ) : result.limit_exceeded ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                )}
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider">
                    {result.valid ? 'ENTRY GRANTED' : result.limit_exceeded ? 'LIMIT EXCEEDED' : 'ACCESS DENIED'}
                  </h2>
                  <p className="text-xs opacity-80 font-medium">{result.reason || result.title || 'Gate Verification'}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                result.valid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {result.scan_type || 'GATE SCAN'}
              </span>
            </div>

            {/* Student Photo & Profile Data */}
            <div className="flex gap-4 items-center bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <img 
                src={result.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.student_name || result.name || 'Student')}&background=0284c7&color=fff`} 
                alt="Student Photo" 
                className="w-20 h-20 rounded-xl object-cover border-2 border-slate-700 shrink-0"
                onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.student_name || result.name || 'S')}&background=334155&color=fff`; }}
              />
              <div className="space-y-1 overflow-hidden">
                <h3 className="text-base font-bold text-white truncate">{result.student_name || result.name || 'Unknown Student'}</h3>
                <p className="text-xs font-mono font-bold text-slate-400">Roll: {result.roll_number || 'N/A'}</p>
                <p className="text-xs text-slate-400">Admn: {result.admn_no || 'N/A'}</p>
                <p className="text-[11px] font-semibold text-emerald-400">{result.college_name || collegeName}</p>
              </div>
            </div>

            {/* Message / Reason text */}
            {result.message && (
              <div className="p-3 rounded-xl bg-black/40 text-xs font-medium border border-current/20 leading-relaxed">
                {result.message}
              </div>
            )}

            {/* Next Scan Action Button */}
            <button 
              onClick={handleNextScan} 
              className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5" /> Scan Next Student ({timerSeconds}s)
            </button>
          </div>
        )}

        {/* Manual HTNO Search Input Box */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Enter Admission No / HTNO..."
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !manualInput.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shrink-0"
          >
            Verify
          </button>
        </form>

        {/* Recent Scans History Drawer */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Recent Gate Activity
          </h3>
          {recentScans.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No scans recorded in this session yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recentScans.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl text-xs border border-slate-800/80">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.valid ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    <div className="truncate">
                      <p className="font-bold text-slate-200 truncate">{s.student_name || s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.roll_number || s.admn_no}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${s.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {s.valid ? 'PASSED' : 'DENIED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
