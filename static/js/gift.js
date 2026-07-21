// Interactive Gift Logic

document.addEventListener('DOMContentLoaded', () => {
    const data = window.giftData || {
        recipient: 'Friend',
        occasion: 'Birthday',
        wrapStyle: 'scratch',
        giftItem: 'iPhone 15 Pro Titanium',
        message: 'Wishing you a wonderful day filled with joy and surprises!'
    };

    const revealedContent = document.getElementById('revealed-content');
    const interactiveStage = document.getElementById('interactive-stage');
    const giftCard = document.getElementById('gift-card');
    const greetingNote = document.getElementById('greeting-note');
    let isRevealed = false;

    // Web Audio Sound Synthesizer
    const playSound = (type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            if (type === 'scratch') {
                // Generate a soft scratching friction sound
                const bufferSize = ctx.sampleRate * 0.1; // 100ms
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1000;
                filter.Q.value = 2.0;

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start();

            } else if (type === 'unwrap') {
                // Sweep / Woosh sound for ribbons
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);

                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);

            } else if (type === 'reveal') {
                // Uplifting chord/chime sound
                const now = ctx.currentTime;
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord

                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + 1.5);
                });
            }
        } catch (e) {
            console.warn('Web Audio synthesis failed or blocked:', e);
        }
    };

    // ------------------------------------------------------------------
    // AMBIENT BACKGROUND ANIMATION
    // ------------------------------------------------------------------
    const ambientCanvas = document.getElementById('ambient-canvas');
    const ambCtx = ambientCanvas.getContext('2d');
    let ambParticles = [];

    const resizeAmbientCanvas = () => {
        ambientCanvas.width = window.innerWidth;
        ambientCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeAmbientCanvas);
    resizeAmbientCanvas();

    class AmbientParticle {
        constructor() {
            this.x = Math.random() * ambientCanvas.width;
            this.y = ambientCanvas.height + Math.random() * 100;
            this.size = Math.random() * 15 + 10;
            this.speedY = Math.random() * 0.8 + 0.4;
            this.speedX = Math.sin(Math.random() * Math.PI * 2) * 0.4;
            this.angle = Math.random() * 360;
            this.spin = Math.random() * 0.5 - 0.25;
            
            // Choose colors based on occasion
            if (data.occasion.includes('Birthday')) {
                const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.type = 'balloon';
            } else if (data.occasion.includes('Anniversary') || data.occasion.includes('Valentine')) {
                const colors = ['#f43f5e', '#ec4899', '#f472b6', '#fda4af'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.type = 'heart';
            } else if (data.occasion.includes('Christmas')) {
                this.color = '#ffffff';
                this.type = 'snowflake';
                this.y = -Math.random() * 100; // Snow falls down
                this.speedY = Math.random() * 1 + 0.5;
                this.size = Math.random() * 6 + 2;
            } else {
                this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`;
                this.type = 'star';
                this.size = Math.random() * 4 + 1;
            }
        }

        update() {
            if (this.type === 'snowflake') {
                this.y += this.speedY;
                this.x += this.speedX + Math.sin(this.y / 30) * 0.5;
                if (this.y > ambientCanvas.height) {
                    this.y = -20;
                    this.x = Math.random() * ambientCanvas.width;
                }
            } else {
                this.y -= this.speedY;
                this.x += this.speedX + Math.sin(this.y / 50) * 0.2;
                if (this.y < -50) {
                    this.y = ambientCanvas.height + 50;
                    this.x = Math.random() * ambientCanvas.width;
                }
            }
            this.angle += this.spin;
        }

        draw() {
            ambCtx.save();
            ambCtx.translate(this.x, this.y);
            ambCtx.rotate(this.angle * Math.PI / 180);
            ambCtx.fillStyle = this.color;
            ambCtx.shadowBlur = this.type === 'star' ? 10 : 0;
            ambCtx.shadowColor = this.color;

            if (this.type === 'balloon') {
                // Draw balloon shape
                ambCtx.beginPath();
                ambCtx.ellipse(0, 0, this.size * 0.8, this.size, 0, 0, Math.PI * 2);
                ambCtx.fill();
                // Balloon string
                ambCtx.beginPath();
                ambCtx.moveTo(0, this.size);
                ambCtx.lineTo(0, this.size + 15);
                ambCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ambCtx.lineWidth = 1;
                ambCtx.stroke();
            } else if (this.type === 'heart') {
                // Draw heart shape
                ambCtx.beginPath();
                ambCtx.moveTo(0, this.size * 0.4);
                ambCtx.bezierCurveTo(-this.size * 0.8, -this.size * 0.5, -this.size * 1.2, this.size * 0.2, 0, this.size * 1.1);
                ambCtx.bezierCurveTo(this.size * 1.2, this.size * 0.2, this.size * 0.8, -this.size * 0.5, 0, this.size * 0.4);
                ambCtx.fill();
            } else if (this.type === 'snowflake') {
                // Draw simple snowflake
                ambCtx.strokeStyle = '#ffffff';
                ambCtx.lineWidth = 1.5;
                for (let i = 0; i < 6; i++) {
                    ambCtx.beginPath();
                    ambCtx.moveTo(0, 0);
                    ambCtx.lineTo(0, this.size);
                    ambCtx.stroke();
                    ambCtx.rotate(Math.PI / 3);
                }
            } else {
                // Star
                ambCtx.beginPath();
                ambCtx.arc(0, 0, this.size, 0, Math.PI * 2);
                ambCtx.fill();
            }
            ambCtx.restore();
        }
    }

    // Populate ambient particles
    const particleCount = data.occasion.includes('Christmas') ? 80 : 30;
    for (let i = 0; i < particleCount; i++) {
        ambParticles.push(new AmbientParticle());
    }

    const animateAmbient = () => {
        ambCtx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
        ambParticles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateAmbient);
    };
    animateAmbient();

    // ------------------------------------------------------------------
    // CONFETTI RAIN ANIMATION (POST-REVEAL)
    // ------------------------------------------------------------------
    const confettiCanvas = document.getElementById('confetti-canvas');
    const conCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];
    let runConfetti = false;

    const resizeConfettiCanvas = () => {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeConfettiCanvas);
    resizeConfettiCanvas();

    class ConfettiParticle {
        constructor() {
            this.x = Math.random() * confettiCanvas.width;
            this.y = -20 - Math.random() * 100;
            this.size = Math.random() * 8 + 6;
            this.speedY = Math.random() * 3 + 2;
            this.speedX = Math.random() * 4 - 2;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 5 + 2;
            
            const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#ef4444', '#eab308'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y / 30) * 0.5;
            this.rotation += this.rotationSpeed;
            
            if (this.y > confettiCanvas.height) {
                this.y = -20;
                this.x = Math.random() * confettiCanvas.width;
            }
        }

        draw() {
            conCtx.save();
            conCtx.translate(this.x, this.y);
            conCtx.rotate(this.rotation * Math.PI / 180);
            conCtx.fillStyle = this.color;
            conCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);
            conCtx.restore();
        }
    }

    const startConfetti = () => {
        runConfetti = true;
        for (let i = 0; i < 150; i++) {
            confettiParticles.push(new ConfettiParticle());
        }
        
        const animateConfetti = () => {
            if (!runConfetti) return;
            conCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiParticles.forEach(c => {
                c.update();
                c.draw();
            });
            requestAnimationFrame(animateConfetti);
        };
        animateConfetti();
    };

    // ------------------------------------------------------------------
    // WRAPPER SELECTION & CHOICE SELECTION
    // ------------------------------------------------------------------
    const choiceGridContainer = document.getElementById('choice-grid-container');
    const revealGiftImg = document.getElementById('reveal-gift-img');
    const revealGiftTitle = document.getElementById('reveal-gift-title');

    // Gift definition mapping
    const giftMap = {
        iphone: {
            title: 'iPhone 15 Pro Max',
            image: '/static/images/iphone.png'
        },
        ps5: {
            title: 'PlayStation 5',
            image: '/static/images/ps5.png'
        },
        airpods: {
            title: 'AirPods Max',
            image: '/static/images/airpods.png'
        },
        watch: {
            title: 'Luxury Watch',
            image: '/static/images/watch.png'
        }
    };

    const revealChoiceGrid = () => {
        // Phase 1: Hide Box Wrap Wrapper
        const activeWrapper = document.getElementById('classic-wrap-wrapper');
        if (activeWrapper) {
            activeWrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            activeWrapper.style.opacity = '0';
            activeWrapper.style.transform = 'scale(0.8)';
            setTimeout(() => {
                activeWrapper.classList.add('hidden');
                
                // Phase 2: Fade in the Choice Grid
                choiceGridContainer.classList.remove('hidden');
                playSound('reveal');
            }, 600);
        }
    };

    const revealSelectedGift = async (giftKey) => {
        if (isRevealed) return;
        isRevealed = true;

        const gift = giftMap[giftKey] || giftMap.iphone;

        // Phase 1: Fade out Choice Grid
        choiceGridContainer.classList.add('fade-out');

        // Phase 2: Configure final card content
        revealGiftImg.src = gift.image;
        revealGiftImg.alt = gift.title;
        revealGiftTitle.textContent = gift.title;

        // Save selection in the database via API call
        if (data.giftId) {
            try {
                await fetch('/select/' + data.giftId, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gift_item: giftKey
                    })
                });
            } catch (e) {
                console.error('Failed to save gift selection:', e);
            }
        }

        setTimeout(() => {
            choiceGridContainer.classList.add('hidden');
            
            // Phase 3: Show revealed content card and start confetti
            revealedContent.classList.remove('hidden');
            playSound('reveal');
            startConfetti();

            // Phase 4: Slide greeting note open
            setTimeout(() => {
                greetingNote.classList.add('slide-up');
            }, 500);
        }, 550);
    };

    // Attach Event Listeners to choice cards
    const choiceCards = document.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
        card.addEventListener('click', () => {
            const giftKey = card.getAttribute('data-gift');
            revealSelectedGift(giftKey);
        });
    });

    // Classic Ribbon Gift Box unwrapping interaction
    const giftBox = document.getElementById('gift-box');
    if (giftBox) {
        giftBox.addEventListener('click', () => {
            if (giftBox.classList.contains('untie')) return;
            
            // Phase 1: Untie ribbons
            playSound('unwrap');
            giftBox.classList.add('untie');
            
            // Phase 2: Lift Lid
            setTimeout(() => {
                giftBox.classList.add('open-lid');
            }, 650);

            // Phase 3: Dissolve Body & Reveal Choice Grid
            setTimeout(() => {
                giftBox.classList.add('open-body');
                revealChoiceGrid();
            }, 1300);
        });
    }

    // ------------------------------------------------------------------
    // 3D CARD INTERACTIVE HOVER TILT EFFECT
    // ------------------------------------------------------------------
    if (giftCard) {
        giftCard.addEventListener('mousemove', (e) => {
            const rect = giftCard.getBoundingClientRect();
            // Mouse coordinates relative to card center
            const x = (e.clientX - rect.left) / rect.width - 0.5; // range [-0.5, 0.5]
            const y = (e.clientY - rect.top) / rect.height - 0.5; // range [-0.5, 0.5]

            // Apply 3D tilt transform
            giftCard.style.transform = `rotateX(${-y * 25}deg) rotateY(${x * 25}deg) scale(1.04)`;
            
            // Dynamic subtle reflection highlight position
            const glow = giftCard.querySelector('.card-glow');
            if (glow) {
                glow.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
            }
        });

        giftCard.addEventListener('mouseleave', () => {
            // Reset to identity matrix
            giftCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
            const glow = giftCard.querySelector('.card-glow');
            if (glow) {
                glow.style.transform = '';
            }
        });
    }
});
