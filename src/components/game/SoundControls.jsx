import { Volume2, VolumeX, Mic, MicOff, Zap, ZapOff } from 'lucide-react';
import { soundManager } from '@/lib/soundManager';
import { useState } from 'react';

export default function SoundControls() {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [voiceEnabled, setVoiceEnabled] = useState(soundManager.voiceEnabled);
  const [effectsEnabled, setEffectsEnabled] = useState(soundManager.effectsEnabled);

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    soundManager.toggleMute(newState);
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    soundManager.toggleVoice(newState);
  };

  const toggleEffects = () => {
    const newState = !effectsEnabled;
    setEffectsEnabled(newState);
    soundManager.toggleEffects(newState);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Master Mute */}
      <button
        onClick={toggleMute}
        className={`p-1.5 rounded-lg transition-all ${
          isMuted
            ? 'bg-red-900/40 text-red-400 border border-red-600/40'
            : 'bg-yellow-900/20 text-yellow-400 border border-yellow-700/40 hover:bg-yellow-900/40'
        }`}
        title={isMuted ? 'Unmute all sounds' : 'Mute all sounds'}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Voice Toggle */}
      <button
        onClick={toggleVoice}
        disabled={isMuted}
        className={`p-1.5 rounded-lg transition-all ${
          voiceEnabled && !isMuted
            ? 'bg-blue-900/40 text-blue-400 border border-blue-600/40 hover:bg-blue-900/60'
            : 'bg-gray-900/20 text-gray-500 border border-gray-700/40 cursor-not-allowed'
        }`}
        title={isMuted ? 'Unmute to enable voice' : voiceEnabled ? 'Dealer voice on' : 'Dealer voice off'}
      >
        {voiceEnabled && !isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </button>

      {/* Effects Toggle */}
      <button
        onClick={toggleEffects}
        disabled={isMuted}
        className={`p-1.5 rounded-lg transition-all ${
          effectsEnabled && !isMuted
            ? 'bg-purple-900/40 text-purple-400 border border-purple-600/40 hover:bg-purple-900/60'
            : 'bg-gray-900/20 text-gray-500 border border-gray-700/40 cursor-not-allowed'
        }`}
        title={isMuted ? 'Unmute to enable effects' : effectsEnabled ? 'Sound effects on' : 'Sound effects off'}
      >
        {effectsEnabled && !isMuted ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
      </button>
    </div>
  );
}