/**
 * 기계신의 눈물 - 사운드 시스템
 * 고퀄리티 앰비언트 + 이펙트
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.bgmGain = null;
        this.sfxGain = null;
        
        this.bgmVolume = 0.4;
        this.sfxVolume = 0.6;
        
        this.currentAmbient = null;
        this.ambientNodes = [];
        this.isReady = false;
        
        this.init();
    }

    init() {
        const start = () => {
            if (!this.isReady) this.setup();
        };
        document.addEventListener('click', start, { once: true });
        document.addEventListener('keydown', start, { once: true });
    }

    setup() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.bgmVolume;
            this.bgmGain.connect(this.master);
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.master);
            
            this.isReady = true;
        } catch(e) {
            console.warn('Audio not supported');
        }
    }

    // ==================== 앰비언트 ====================

    playAmbient(type) {
        if (!this.isReady) return;
        if (this.currentAmbient === type) return;
        
        this.stopAmbient();
        this.currentAmbient = type;
        
        switch(type) {
            case 'rain': this.createRain(); break;
            case 'factory': this.createFactory(); break;
            case 'tension': this.createTension(); break;
            case 'heart': this.createHeartbeat(); break;
            case 'silence': this.createSilence(); break;
            default: this.createDark();
        }
    }

    stopAmbient() {
        this.ambientNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch(e) {}
        });
        this.ambientNodes = [];
        this.currentAmbient = null;
    }

    // 비 내리는 거리
    createRain() {
        // 레이어드 노이즈
        const createNoiseLayer = (freq, gain) => {
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            
            const gainNode = this.ctx.createGain();
            gainNode.gain.value = gain;
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.bgmGain);
            
            noise.start();
            this.ambientNodes.push(noise);
        };
        
        // 부드러운 비 소리 레이어
        createNoiseLayer(600, 0.04);
        createNoiseLayer(1200, 0.02);
        
        // 저음 바람
        const wind = this.ctx.createOscillator();
        wind.type = 'sine';
        wind.frequency.value = 80;
        
        const windGain = this.ctx.createGain();
        windGain.gain.value = 0.03;
        
        const windLfo = this.ctx.createOscillator();
        windLfo.type = 'sine';
        windLfo.frequency.value = 0.1;
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.015;
        
        windLfo.connect(lfoGain);
        lfoGain.connect(windGain.gain);
        
        wind.connect(windGain);
        windGain.connect(this.bgmGain);
        
        wind.start();
        windLfo.start();
        
        this.ambientNodes.push(wind, windLfo);
    }

    // 공장 내부
    createFactory() {
        // 저음 드론
        const drone = this.ctx.createOscillator();
        drone.type = 'sawtooth';
        drone.frequency.value = 55;
        
        const droneFilter = this.ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 120;
        
        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.06;
        
        drone.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.bgmGain);
        
        drone.start();
        this.ambientNodes.push(drone);
        
        // 기계 클릭 (랜덤)
        const scheduleClick = () => {
            if (this.currentAmbient !== 'factory') return;
            
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 100 + Math.random() * 200;
            
            const clickGain = this.ctx.createGain();
            clickGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
            clickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 300;
            
            osc.connect(filter);
            filter.connect(clickGain);
            clickGain.connect(this.bgmGain);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.03);
            
            setTimeout(scheduleClick, 300 + Math.random() * 500);
        };
        
        setTimeout(scheduleClick, 500);
    }

    // 긴장감
    createTension() {
        // 불협화음 드론
        const freqs = [110, 117, 123];
        
        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = this.ctx.createGain();
            gain.gain.value = 0.04;
            
            // 느린 트레몰로
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.08 + i * 0.02;
            
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.02;
            
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            
            osc.connect(gain);
            gain.connect(this.bgmGain);
            
            osc.start();
            lfo.start();
            
            this.ambientNodes.push(osc, lfo);
        });
    }

    // 심장박동
    createHeartbeat() {
        const beat = () => {
            if (this.currentAmbient !== 'heart') return;
            
            // 첫 번째 비트
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(70, this.ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.15);
            
            const gain1 = this.ctx.createGain();
            gain1.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
            
            osc1.connect(gain1);
            gain1.connect(this.sfxGain);
            
            osc1.start();
            osc1.stop(this.ctx.currentTime + 0.25);
            
            // 두 번째 비트 (짧게)
            setTimeout(() => {
                if (this.currentAmbient !== 'heart') return;
                
                const osc2 = this.ctx.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(55, this.ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1);
                
                const gain2 = this.ctx.createGain();
                gain2.gain.setValueAtTime(0.1, this.ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
                
                osc2.connect(gain2);
                gain2.connect(this.sfxGain);
                
                osc2.start();
                osc2.stop(this.ctx.currentTime + 0.15);
            }, 150);
            
            setTimeout(beat, 900);
        };
        
        beat();
        
        // 저음 서스펜스
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 40;
        
        const subGain = this.ctx.createGain();
        subGain.gain.value = 0.05;
        
        sub.connect(subGain);
        subGain.connect(this.bgmGain);
        
        sub.start();
        this.ambientNodes.push(sub);
    }

    // 어두운 정적
    createDark() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 60;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.04;
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        
        osc.start();
        this.ambientNodes.push(osc);
    }

    // 고요함
    createSilence() {
        // 미세한 고주파 노이즈 (진짜 고요함)
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.01;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.02;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        
        noise.start();
        this.ambientNodes.push(noise);
    }

    // ==================== 효과음 ====================

    play(type) {
        if (!this.isReady) return;
        
        switch(type) {
            case 'page': this.playPageTurn(); break;
            case 'choice': this.playChoice(); break;
            case 'save': this.playSave(); break;
            case 'chapter': this.playChapter(); break;
            case 'resonance': this.playResonance(); break;
        }
    }

    playPageTurn() {
        // 부드러운 페이지 넘기는 소리
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
        }
        
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.08;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        noise.start();
    }

    playChoice() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 400;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playSave() {
        // 두 음 화음
        [600, 800].forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.3);
            }, i * 100);
        });
    }

    playChapter() {
        // 깊은 공명음
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 150;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }

    playResonance() {
        // 금속성 공명
        const harmonics = [220, 440, 550, 880];
        
        harmonics.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = this.ctx.createGain();
            const vol = 0.06 / (i + 1);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 2);
        });
    }

    // ==================== 볼륨 ====================

    setBgmVolume(val) {
        this.bgmVolume = val / 100;
        if (this.bgmGain) {
            this.bgmGain.gain.value = this.bgmVolume;
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = val / 100;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
}

const sound = new SoundSystem();
