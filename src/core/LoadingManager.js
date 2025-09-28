export class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('loading-progress');
        this.loadingText = document.querySelector('.loading-text');
        this.progress = 0;
    }

    show() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
    }

    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
            console.log('Loading screen hidden');
        } else {
            console.warn('Loading screen element not found!');
        }
    }

    setProgress(progress, text = null) {
        this.progress = Math.max(0, Math.min(100, progress));
        
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
        
        if (text && this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    showError(message) {
        if (this.loadingText) {
            this.loadingText.textContent = message;
            this.loadingText.style.color = '#ef4444';
        }
    }

    // Simulate loading progress for development
    simulateLoading(duration = 2000) {
        return new Promise((resolve) => {
            const steps = [
                { progress: 20, text: 'Loading Viimsi Parish map data...' },
                { progress: 40, text: 'Generating terrain...' },
                { progress: 60, text: 'Loading Estonian landmarks...' },
                { progress: 80, text: 'Initializing game systems...' },
                { progress: 100, text: 'Ready to explore Viimsi!' }
            ];
            
            let currentStep = 0;
            const stepDuration = duration / steps.length;
            
            const updateStep = () => {
                if (currentStep < steps.length) {
                    const step = steps[currentStep];
                    this.setProgress(step.progress, step.text);
                    currentStep++;
                    
                    if (currentStep < steps.length) {
                        setTimeout(updateStep, stepDuration);
                    } else {
                        setTimeout(resolve, 500);
                    }
                }
            };
            
            updateStep();
        });
    }
}