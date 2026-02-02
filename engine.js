/**
 * 기계신의 눈물 - 게임 엔진
 * 렌파이 스타일 + 이전 대사 / 로그 기능
 */

class Game {
    constructor() {
        this.state = {
            scene: null,
            lineIndex: 0,
            chapter: 0,
            auto: false
        };
        
        // 히스토리 (이전 대사로 돌아가기용)
        this.history = [];
        this.historyIndex = -1;
        
        this.autoTimer = null;
        this.typing = false;
        this.typeTimer = null;
        
        this.els = {
            title: document.getElementById('title-screen'),
            game: document.getElementById('game-screen'),
            ending: document.getElementById('ending-screen'),
            stage: document.getElementById('stage'),
            chapter: document.getElementById('chapter-label'),
            textbox: document.getElementById('textbox'),
            speaker: document.getElementById('speaker'),
            dialogue: document.getElementById('dialogue'),
            clickIcon: document.getElementById('click-icon'),
            choices: document.getElementById('choices'),
            toast: document.getElementById('toast'),
            endTitle: document.getElementById('ending-title'),
            endSub: document.getElementById('ending-sub'),
            endQuote: document.getElementById('ending-quote'),
            logPanel: document.getElementById('log-panel'),
            logContent: document.getElementById('log-content')
        };
        
        this.init();
    }

    init() {
        document.getElementById('btn-start').onclick = () => this.start();
        document.getElementById('btn-continue').onclick = () => this.load();
        
        this.els.textbox.onclick = (e) => {
            e.stopPropagation();
            this.next();
        };
        
        document.addEventListener('keydown', (e) => {
            if (this.els.logPanel && !this.els.logPanel.classList.contains('hidden')) {
                if (e.code === 'Escape') this.hideLog();
                return;
            }
            
            if (this.els.game.classList.contains('active')) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.next();
                } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
                    this.prev();
                }
            }
        });
        
        this.checkSave();
    }

    show(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        this.els[screen].classList.add('active');
    }

    start() {
        if (typeof sound !== 'undefined') sound.play('page');
        
        this.state = { scene: STORY.start, lineIndex: 0, chapter: 0, auto: false };
        this.history = [];
        this.historyIndex = -1;
        
        this.show('game');
        this.loadScene(STORY.start);
    }

    loadScene(sceneId) {
        const scene = STORY.scenes[sceneId];
        if (!scene) return console.error('Scene not found:', sceneId);
        
        this.state.scene = sceneId;
        this.state.lineIndex = 0;
        
        if (scene.chapter && scene.chapter !== this.state.chapter) {
            this.state.chapter = scene.chapter;
            this.showChapter(scene.chapter);
            if (typeof sound !== 'undefined') sound.play('chapter');
        }
        
        if (scene.ambient && typeof sound !== 'undefined') {
            sound.playAmbient(scene.ambient);
        }
        
        if (scene.sfx && typeof sound !== 'undefined') {
            sound.play(scene.sfx);
        }
        
        this.els.choices.classList.add('hidden');
        this.els.clickIcon.classList.remove('hidden');
        
        this.showLine();
    }

    showChapter(num) {
        this.els.chapter.textContent = STORY.chapters[num] || '';
        this.els.chapter.classList.add('visible');
        setTimeout(() => this.els.chapter.classList.remove('visible'), 3000);
    }

    showLine(skipHistory = false) {
        const scene = STORY.scenes[this.state.scene];
        if (!scene || !scene.lines) return;
        
        const line = scene.lines[this.state.lineIndex];
        if (!line) return;
        
        // 화자
        if (line.speaker) {
            this.els.speaker.textContent = line.speaker;
            this.els.speaker.style.display = 'block';
        } else {
            this.els.speaker.style.display = 'none';
        }
        
        // 히스토리에 추가 (새 대사일 때만)
        if (!skipHistory) {
            const entry = {
                scene: this.state.scene,
                lineIndex: this.state.lineIndex,
                speaker: line.speaker || '',
                text: line.text
            };
            
            // 현재 위치가 히스토리 끝이 아니면 (뒤로 갔다가 앞으로 온 경우)
            if (this.historyIndex < this.history.length - 1) {
                // 같은 위치면 추가 안함
                const current = this.history[this.historyIndex + 1];
                if (!current || current.scene !== entry.scene || current.lineIndex !== entry.lineIndex) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                    this.history.push(entry);
                }
            } else {
                this.history.push(entry);
            }
            this.historyIndex = this.history.length - 1;
        }
        
        this.typeText(line.text);
    }

    typeText(text) {
        if (this.typeTimer) clearInterval(this.typeTimer);
        
        this.typing = true;
        this.els.dialogue.textContent = '';
        this.els.clickIcon.classList.add('hidden');
        
        let i = 0;
        const speed = 25;
        
        this.typeTimer = setInterval(() => {
            if (i < text.length) {
                this.els.dialogue.textContent += text[i];
                i++;
            } else {
                this.finishTyping();
            }
        }, speed);
    }

    finishTyping() {
        if (this.typeTimer) clearInterval(this.typeTimer);
        this.typing = false;
        this.els.clickIcon.classList.remove('hidden');
        
        if (this.state.auto) {
            this.autoTimer = setTimeout(() => this.next(), 2000);
        }
    }

    // 다음
    next() {
        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }
        
        if (this.typing) {
            if (this.typeTimer) clearInterval(this.typeTimer);
            const scene = STORY.scenes[this.state.scene];
            const line = scene.lines[this.state.lineIndex];
            this.els.dialogue.textContent = line.text;
            this.finishTyping();
            return;
        }
        
        const scene = STORY.scenes[this.state.scene];
        if (!scene) return;
        
        this.state.lineIndex++;
        
        if (this.state.lineIndex < scene.lines.length) {
            if (typeof sound !== 'undefined') sound.play('page');
            this.showLine();
        } else {
            if (scene.choices) {
                this.showChoices(scene.choices);
            } else if (scene.next) {
                this.loadScene(scene.next);
            } else if (scene.ending) {
                this.showEnding(scene.ending);
            }
        }
    }

    // 이전
    prev() {
        if (this.typing) {
            if (this.typeTimer) clearInterval(this.typeTimer);
            this.typing = false;
        }
        
        if (this.historyIndex <= 0) {
            this.toast('처음입니다');
            return;
        }
        
        this.historyIndex--;
        const entry = this.history[this.historyIndex];
        
        if (entry) {
            this.state.scene = entry.scene;
            this.state.lineIndex = entry.lineIndex;
            
            // 선택지 숨기기
            this.els.choices.classList.add('hidden');
            this.els.clickIcon.classList.remove('hidden');
            
            // 화자 표시
            if (entry.speaker) {
                this.els.speaker.textContent = entry.speaker;
                this.els.speaker.style.display = 'block';
            } else {
                this.els.speaker.style.display = 'none';
            }
            
            // 텍스트 바로 표시 (타이핑 없이)
            this.els.dialogue.textContent = entry.text;
            this.els.clickIcon.classList.remove('hidden');
            
            if (typeof sound !== 'undefined') sound.play('page');
        }
    }

    // 로그 표시
    showLog() {
        this.els.logContent.innerHTML = '';
        
        this.history.forEach((entry, idx) => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `
                ${entry.speaker ? `<div class="log-speaker">${entry.speaker}</div>` : ''}
                <div class="log-text">${entry.text}</div>
            `;
            div.onclick = () => this.jumpToLog(idx);
            this.els.logContent.appendChild(div);
        });
        
        this.els.logPanel.classList.remove('hidden');
        
        // 스크롤을 맨 아래로
        this.els.logContent.scrollTop = this.els.logContent.scrollHeight;
    }

    hideLog() {
        this.els.logPanel.classList.add('hidden');
    }

    jumpToLog(idx) {
        const entry = this.history[idx];
        if (!entry) return;
        
        this.historyIndex = idx;
        this.state.scene = entry.scene;
        this.state.lineIndex = entry.lineIndex;
        
        this.hideLog();
        
        // 선택지 숨기기
        this.els.choices.classList.add('hidden');
        this.els.clickIcon.classList.remove('hidden');
        
        if (entry.speaker) {
            this.els.speaker.textContent = entry.speaker;
            this.els.speaker.style.display = 'block';
        } else {
            this.els.speaker.style.display = 'none';
        }
        
        this.els.dialogue.textContent = entry.text;
    }

    showChoices(choices) {
        this.els.choices.innerHTML = '';
        this.els.choices.classList.remove('hidden');
        this.els.clickIcon.classList.add('hidden');
        
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = () => {
                if (typeof sound !== 'undefined') sound.play('page');
                this.loadScene(choice.next);
            };
            this.els.choices.appendChild(btn);
        });
    }

    showEnding(endingId) {
        const ending = STORY.endings[endingId];
        if (!ending) return;
        
        this.saveEnding(endingId);
        
        if (typeof sound !== 'undefined') {
            sound.stopAmbient();
            sound.play('chapter');
        }
        
        setTimeout(() => {
            this.els.endTitle.textContent = ending.title;
            this.els.endSub.textContent = ending.sub;
            this.els.endQuote.textContent = ending.quote;
            this.show('ending');
        }, 1500);
    }

    saveEnding(id) {
        let endings = JSON.parse(localStorage.getItem('novelEndings') || '[]');
        if (!endings.includes(id)) {
            endings.push(id);
            localStorage.setItem('novelEndings', JSON.stringify(endings));
        }
    }

    save() {
        const data = { 
            state: this.state, 
            history: this.history,
            historyIndex: this.historyIndex,
            ts: Date.now() 
        };
        localStorage.setItem('novelSave', JSON.stringify(data));
        if (typeof sound !== 'undefined') sound.play('save');
        this.toast('저장됨');
    }

    load() {
        const raw = localStorage.getItem('novelSave');
        if (!raw) return;
        
        const data = JSON.parse(raw);
        this.state = data.state;
        this.history = data.history || [];
        this.historyIndex = data.historyIndex || this.history.length - 1;
        
        if (typeof sound !== 'undefined') sound.play('page');
        
        this.show('game');
        
        // 현재 대사 복원
        const entry = this.history[this.historyIndex];
        if (entry) {
            if (entry.speaker) {
                this.els.speaker.textContent = entry.speaker;
                this.els.speaker.style.display = 'block';
            } else {
                this.els.speaker.style.display = 'none';
            }
            this.els.dialogue.textContent = entry.text;
            this.els.clickIcon.classList.remove('hidden');
            this.els.choices.classList.add('hidden');
        }
        
        this.toast('불러옴');
    }

    checkSave() {
        if (localStorage.getItem('novelSave')) {
            document.getElementById('btn-continue').disabled = false;
        }
    }

    toggleAuto() {
        this.state.auto = !this.state.auto;
        const btns = document.querySelectorAll('#quickmenu button');
        btns[3].classList.toggle('active', this.state.auto);
        this.toast(this.state.auto ? '자동 ON' : '자동 OFF');
        
        if (this.state.auto && !this.typing) {
            this.autoTimer = setTimeout(() => this.next(), 2000);
        }
    }

    toTitle() {
        if (typeof sound !== 'undefined') sound.stopAmbient();
        if (this.autoTimer) clearTimeout(this.autoTimer);
        if (this.typeTimer) clearInterval(this.typeTimer);
        this.state.auto = false;
        this.show('title');
    }

    toast(msg) {
        this.els.toast.textContent = msg;
        this.els.toast.classList.remove('hidden');
        setTimeout(() => this.els.toast.classList.add('hidden'), 1500);
    }
}

const game = new Game();
