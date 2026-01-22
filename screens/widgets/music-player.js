// Music Player Widget Module
const MusicPlayerWidget = (function() {
    'use strict';
    
    // Music stations
    const STATIONS = {
        'lofi': { name: 'Lo-Fi', url: 'https://live.hunter.fm/lofi_high' },
        '00s': { name: '2000s', url: 'https://stream.revma.ihrhls.com/zc6850' },
        '80hh': { name: '80s Hip Hop', url: 'https://regiocast.streamabc.net/regc-80s80shiphop3449572-mp3-192-3635250' },
        '80s': { name: '80s', url: 'https://live.hunter.fm/80s_stream?ag=mp3' },
        '90hh': { name: '90s Hip Hop', url: 'https://streams.90s90s.de/hiphop/mp3-192' },
        '90s': { name: '90s', url: 'https://streams.90s90s.de/main/aac-64' },
        'classical': { name: 'Classical', url: 'https://cms.stream.publicradio.org/cms.aac' },
        'kfai': { name: 'KFAI', url: 'https://kfai.broadcasttool.stream/kfai-1' },
        'kpop': { name: 'K-Pop', url: 'https://live.hunter.fm/kpop_stream?ag=mp3' },
        'master': { name: 'Master Mix', url: 'https://live.hunter.fm/master_stream?ag=mp3' },
        'pop': { name: 'Pop', url: 'https://live.hunter.fm/pop_stream?ag=mp3' },
        'pop2k': { name: 'Pop 2000s', url: 'https://live.hunter.fm/pop2k_stream?ag=mp3' },
        'trance': { name: 'Trance', url: 'https://fr3.1mix.co.uk:8000/stream13' },
        'wnyc': { name: 'WNYC', url: 'https://opera-stream.wqxr.org/wnycfm-tunein.aac' },
        'xmas': { name: 'Christmas', url: 'https://christmasfm.cdnstream1.com/2547_64.aac' },
        'xmas-c': { name: 'Xmas Country', url: 'http://christmasfm.cdnstream1.com/2550_64.aac' },
        'xmas-cl': { name: 'Xmas Classical', url: 'http://christmasfm.cdnstream1.com/2549_64.aac' }
    };
    
    const STORAGE_KEY = 'musicPlayerStation';
    const instances = [];
    
    function createInstance(container) {
        const instance = {
            container: container,
            audio: null,
            isPlaying: false,
            currentStation: localStorage.getItem(STORAGE_KEY) || 'lofi',
            elements: {}
        };
        
        // Render the widget
        instance.render = function() {
            this.container.innerHTML = `
                <div class="flex gap-2 items-center opacity-50 hover:opacity-100 transition-opacity">
                    <select id="station-select" class="px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent">
                        ${Object.entries(STATIONS).map(([key, station]) => 
                            `<option value="${key}" ${key === this.currentStation ? 'selected' : ''}>${station.name}</option>`
                        ).join('')}
                    </select>
                    <button id="play-btn" class="p-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button id="pause-btn" class="p-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors hidden">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Store element references
            this.elements.stationSelect = this.container.querySelector('#station-select');
            this.elements.playBtn = this.container.querySelector('#play-btn');
            this.elements.pauseBtn = this.container.querySelector('#pause-btn');
            
            // Attach event listeners
            this.elements.stationSelect.addEventListener('change', () => this.changeStation());
            this.elements.playBtn.addEventListener('click', () => this.play());
            this.elements.pauseBtn.addEventListener('click', () => this.pause());
        };
        
        // Change station
        instance.changeStation = function() {
            const wasPlaying = this.isPlaying;
            if (wasPlaying) {
                this.pause();
            }
            this.currentStation = this.elements.stationSelect.value;
            localStorage.setItem(STORAGE_KEY, this.currentStation);
            if (wasPlaying) {
                this.play();
            }
        };
        
        // Play audio
        instance.play = function() {
            if (!this.audio) {
                this.audio = new Audio(STATIONS[this.currentStation].url);
            } else {
                this.audio.src = STATIONS[this.currentStation].url;
            }
            
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.elements.playBtn.classList.add('hidden');
                this.elements.pauseBtn.classList.remove('hidden');
            }).catch(error => {
                console.error('Error playing audio:', error);
                alert('Unable to play audio. Please try again.');
            });
        };
        
        // Pause audio
        instance.pause = function() {
            if (this.audio) {
                this.audio.pause();
            }
            this.isPlaying = false;
            this.elements.playBtn.classList.remove('hidden');
            this.elements.pauseBtn.classList.add('hidden');
        };
        
        // Initialize
        instance.render();
        
        return instance;
    }
    
    return {
        init: function() {
            const containers = document.querySelectorAll('.music-player-widget');
            containers.forEach(container => {
                const instance = createInstance(container);
                instances.push(instance);
            });
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MusicPlayerWidget.init);
} else {
    MusicPlayerWidget.init();
}