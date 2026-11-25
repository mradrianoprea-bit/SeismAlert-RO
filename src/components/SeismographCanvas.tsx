import React, { useEffect, useRef, useState } from 'react';
import { Activity, Smartphone } from 'lucide-react';

interface SeismographCanvasProps {
  activeAlarmMagnitude: number | null;
  onLocalTremorDetected?: (peakG: number) => void;
}

export const SeismographCanvas: React.FC<SeismographCanvasProps> = ({
  activeAlarmMagnitude,
  onLocalTremorDetected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<number[]>(new Array(180).fill(0));
  const [memsEnabled, setMemsEnabled] = useState(false);
  const [memsSupported, setMemsSupported] = useState(true);
  const [peakG, setPeakG] = useState(0.002);
  const memsDeltaRef = useRef(0);

  const toggleMemsSensor = async () => {
    if (memsEnabled) {
      setMemsEnabled(false);
      return;
    }

    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setMemsSupported(false);
      return;
    }

    const dmEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof dmEvent.requestPermission === 'function') {
      try {
        const perm = await dmEvent.requestPermission();
        if (perm !== 'granted') {
          setMemsSupported(false);
          return;
        }
      } catch {
        setMemsSupported(false);
        return;
      }
    }
    setMemsEnabled(true);
  };

  useEffect(() => {
    if (!memsEnabled) return;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const mag = Math.sqrt(x * x + y * y + z * z);
      // Normalize Earth gravity (~9.81) if accelerationIncludingGravity is used
      const delta = e.acceleration ? mag : Math.abs(mag - 9.81);
      memsDeltaRef.current = Math.min(4.0, delta / 9.81);
      if (memsDeltaRef.current > 0.35 && onLocalTremorDetected) {
        onLocalTremorDetected(memsDeltaRef.current);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [memsEnabled, onLocalTremorDetected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;

    const draw = () => {
      phase += 0.14;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const w = rect.width || 600;
      const h = rect.height || 130;
      const midY = h / 2;

      // Compute next sample: real MEMS reading if active, else baseline micro-noise or active alarm P/S wave
      let sample = 0;
      if (memsEnabled) {
        sample = memsDeltaRef.current * (Math.sin(phase * 3.1) > 0 ? 1 : -1);
        memsDeltaRef.current *= 0.85;
      } else if (activeAlarmMagnitude && activeAlarmMagnitude >= 3.0) {
        const amp = Math.min(0.95, (activeAlarmMagnitude - 2.2) * 0.25);
        sample =
          Math.sin(phase * 2.8) * amp * 0.65 +
          Math.sin(phase * 6.3) * amp * 0.35;
      } else {
        sample =
          Math.sin(phase * 1.4) * 0.025 +
          Math.cos(phase * 3.7) * 0.015;
      }

      const arr = samplesRef.current;
      arr.push(sample);
      if (arr.length > 180) arr.shift();

      const maxAbs = Math.max(0.002, ...arr.map((v) => Math.abs(v)));
      if (Math.round(phase * 10) % 10 === 0) {
        setPeakG(Number((maxAbs * 0.12).toFixed(4)));
      }

      // Clear background
      ctx.fillStyle = '#070B12';
      ctx.fillRect(0, 0, w, h);

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Waveform line
      const isAlarm = Boolean(activeAlarmMagnitude && activeAlarmMagnitude >= 3.0);
      ctx.strokeStyle = isAlarm ? '#EF4444' : memsEnabled ? '#10B981' : '#06B6D4';
      ctx.lineWidth = isAlarm ? 2 : 1.5;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = (i / (arr.length - 1)) * w;
        const y = midY - arr[i] * (h * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [activeAlarmMagnitude, memsEnabled]);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>SEISMOGRAMĂ TRIAXIALĂ &amp; SENZOR P-WAVE</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prag declanșare alarmă: 3.0 grade Richter · Monitorizare continuă
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right font-mono tabular-nums">
            <div className="text-[11px] text-slate-500">Vârf PGA</div>
            <div className="text-sm font-semibold text-slate-100">{peakG.toFixed(4)} g</div>
          </div>

          <button
            type="button"
            onClick={() => void toggleMemsSensor()}
            disabled={!memsSupported}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] whitespace-nowrap ${
              memsEnabled
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-[#070B12] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {!memsSupported
              ? 'MEMS Indisponibil'
              : memsEnabled
              ? 'Accelerometru Telefon Activ'
              : 'Activează Senzor Telefon'}
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-[120px] rounded-lg border border-slate-800/80 block"
      />
    </div>
  );
};
