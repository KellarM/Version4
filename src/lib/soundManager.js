// Casino sound effects and dealer voice management

export const SOUND_EFFECTS = {
  chipPlace: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  cardDeal: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2022/2022-preview.mp3',
  casinoAmbiance: 'https://assets.mixkit.co/active_storage/sfx/2821/2821-preview.mp3',
};

export class SoundManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.audioElements = {};
    this.casinoLoops = [];
    this.isMuted = localStorage.getItem('soundMuted') === 'true';
    this.voiceEnabled = localStorage.getItem('voiceEnabled') !== 'false';
    this.effectsEnabled = localStorage.getItem('effectsEnabled') !== 'false';
  }

  async playSound(soundKey) {
    if (!this.effectsEnabled || this.isMuted) return;

    try {
      const url = SOUND_EFFECTS[soundKey];
      if (!url) return;

      if (!this.audioElements[soundKey]) {
        const audio = new Audio(url);
        audio.volume = 0.3;
        this.audioElements[soundKey] = audio;
      }

      this.audioElements[soundKey].currentTime = 0;
      this.audioElements[soundKey].play().catch(() => {
        // Gracefully handle autoplay restrictions
      });
    } catch (e) {
      console.log('Sound play failed:', soundKey);
    }
  }

  speakDealer(text) {
    if (!this.voiceEnabled || this.isMuted) return;

    this.synth.cancel(); // Cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    utterance.volume = 0.7;

    this.synth.speak(utterance);
  }

  startCasinoAmbiance() {
    if (this.isMuted || this.effectsEnabled === false) return;

    try {
      const ambient = new Audio(SOUND_EFFECTS.casinoAmbiance);
      ambient.loop = true;
      ambient.volume = 0.15;
      ambient.play().catch(() => {});
      this.casinoLoops.push(ambient);
    } catch (e) {
      console.log('Ambiance start failed');
    }
  }

  stopCasinoAmbiance() {
    this.casinoLoops.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.casinoLoops = [];
  }

  toggleMute(muted) {
    this.isMuted = muted;
    localStorage.setItem('soundMuted', muted);
  }

  toggleVoice(enabled) {
    this.voiceEnabled = enabled;
    localStorage.setItem('voiceEnabled', enabled);
  }

  toggleEffects(enabled) {
    this.effectsEnabled = enabled;
    localStorage.setItem('effectsEnabled', enabled);
  }
}

// Singleton instance
export const soundManager = new SoundManager();