import { db, collection, onSnapshot, doc } from './firebase-config.js';

/**
 * Settings Service
 */
const SettingsService = {
    settings: {
        logo: '',
        motd: '',
        machines: []
    },
    
    initRealtimeUpdates(callback) {
        const docRef = doc(db, 'settings', 'global');
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                this.settings = docSnap.data();
            }
            callback();
        });
    }
};

/**
 * Data Storage Service (Firebase - Solo Lectura)
 */
const StorageService = {
    collectionName: 'bookings',
    bookingsCache: [],
    
    initRealtimeUpdates(callback) {
        const q = collection(db, this.collectionName);
        onSnapshot(q, (snapshot) => {
            this.bookingsCache = [];
            snapshot.forEach((doc) => {
                this.bookingsCache.push({ id: doc.id, ...doc.data() });
            });
            callback();
        });
    },

    async getBookings() {
        return this.bookingsCache;
    }
};

/**
 * Lógica de la Interfaz de Usuario (Cliente)
 */
document.addEventListener('DOMContentLoaded', () => {
    const scheduleBody = document.getElementById('schedule-body');
    const currentDateEl = document.getElementById('current-date');
    const weekDaysContainer = document.getElementById('week-days');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const zoomBtn = document.getElementById('zoom-btn');
    const scheduleContainerMain = document.getElementById('schedule-container-main');
    const dailyNavigator = document.getElementById('daily-navigator');
    
    // View controls
    const viewDailyBtn = document.getElementById('view-daily-btn');
    const viewWeeklyBtn = document.getElementById('view-weekly-btn');
    let currentView = 'daily'; 

    // Header Logo element
    const headerLogo = document.querySelector('.logo');
    
    // MOTD Elements
    const motdModal = document.getElementById('motd-modal');
    const motdText = document.getElementById('motd-text');
    const motdOkBtn = document.getElementById('motd-ok-btn');
    const closeMotdBtn = document.getElementById('close-motd-btn');

    // Estado de Fechas
    let selectedDate = new Date();
    let currentWeekStart = getStartOfWeek(new Date());

    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        d.setHours(0,0,0,0);
        return d;
    }

    function updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        if (currentView === 'daily') {
            currentDateEl.textContent = selectedDate.toLocaleDateString('es-ES', options);
        } else {
            const endOfWeek = new Date(currentWeekStart);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            currentDateEl.textContent = `Semana: ${currentWeekStart.toLocaleDateString('es-ES', {month:'short', day:'numeric'})} - ${endOfWeek.toLocaleDateString('es-ES', {month:'short', day:'numeric'})}`;
        }
    }

    function renderWeekNav() {
        if (currentView !== 'daily') return;
        weekDaysContainer.innerHTML = '';
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            
            const isSelected = formatDate(d) === formatDate(selectedDate);
            
            const btn = document.createElement('button');
            btn.className = `day-btn ${isSelected ? 'active' : ''}`;
            btn.innerHTML = `
                <span class="day-name">${dayNames[i]}</span>
                <span class="day-number">${d.getDate()}</span>
            `;
            
            btn.addEventListener('click', () => {
                selectedDate = d;
                updateDateDisplay();
                renderWeekNav();
                renderBookings();
            });
            
            weekDaysContainer.appendChild(btn);
        }
    }

    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        if (currentView === 'daily') {
            selectedDate.setDate(selectedDate.getDate() - 7);
            renderWeekNav();
        } else {
            generateWeeklyGrid();
        }
        updateDateDisplay();
        renderBookings();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        if (currentView === 'daily') {
            selectedDate.setDate(selectedDate.getDate() + 7);
            renderWeekNav();
        } else {
            generateWeeklyGrid();
        }
        updateDateDisplay();
        renderBookings();
    });

    zoomBtn.addEventListener('click', () => {
        scheduleContainerMain.classList.toggle('compact-view');
        const isCompact = scheduleContainerMain.classList.contains('compact-view');
        zoomBtn.textContent = isCompact ? '➕' : '🔍';
        zoomBtn.title = isCompact ? 'Expandir Vista' : 'Comprimir Vista';
    });

    viewDailyBtn.addEventListener('click', () => {
        currentView = 'daily';
        viewDailyBtn.classList.add('btn-primary', 'active-view');
        viewDailyBtn.classList.remove('btn-outline');
        viewWeeklyBtn.classList.add('btn-outline');
        viewWeeklyBtn.classList.remove('btn-primary', 'active-view');
        dailyNavigator.style.display = 'flex';
        document.querySelector('.schedule-header').style.display = 'grid';
        scheduleBody.classList.remove('agenda-view');
        updateDateDisplay();
        renderWeekNav();
        generateDailyGrid();
        renderBookings();
    });

    viewWeeklyBtn.addEventListener('click', () => {
        currentView = 'weekly';
        viewWeeklyBtn.classList.add('btn-primary', 'active-view');
        viewWeeklyBtn.classList.remove('btn-outline');
        viewDailyBtn.classList.add('btn-outline');
        viewDailyBtn.classList.remove('btn-primary', 'active-view');
        dailyNavigator.style.display = 'none';
        document.querySelector('.schedule-header').style.display = 'none';
        scheduleBody.classList.add('agenda-view');
        updateDateDisplay();
        generateWeeklyGrid();
        renderBookings();
    });

    function formatTime12(hour, min) {
        const h = hour === 12 ? 12 : (hour > 12 ? hour - 12 : hour);
        const ampm = hour < 12 || hour === 24 ? 'AM' : 'PM';
        return `${h}:${min} ${ampm}`;
    }

    // Actualiza UI desde Ajustes
    function updateUIFromSettings() {
        // Logo
        if (SettingsService.settings.logo) {
            headerLogo.innerHTML = `<img src="${SettingsService.settings.logo}" alt="Logo" style="max-height: 40px;">`;
        } else {
            headerLogo.innerHTML = `
                <span class="neon-text-magenta">X</span>
                <span class="neon-text-cyan">GAMES</span>
                <span class="neon-text-yellow">BARCADE</span>
            `;
        }
        
        // MOTD (Mensaje del Día)
        if (SettingsService.settings.motd && !sessionStorage.getItem('motd_seen')) {
            motdText.textContent = SettingsService.settings.motd;
            motdModal.classList.remove('hidden');
        }

        // Refrescar grilla si estamos en daily
        if (currentView === 'daily') {
            generateDailyGrid();
        }
        renderBookings();
    }

    function closeMotd() {
        motdModal.classList.add('hidden');
        sessionStorage.setItem('motd_seen', 'true');
    }

    motdOkBtn.addEventListener('click', closeMotd);
    closeMotdBtn.addEventListener('click', closeMotd);
    motdModal.addEventListener('click', (e) => {
        if (e.target === motdModal) closeMotd();
    });

    function generateDailyGrid() {
        scheduleBody.innerHTML = '';
        const header = document.getElementById('schedule-header');
        
        const machines = SettingsService.settings.machines || [];
        const cols = machines.length;
        
        // Ajustar columnas dinámicamente
        header.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, 1fr)`;
        
        // Reconstruir cabecera
        header.innerHTML = `<div class="time-col-header">Hora</div>`;
        machines.forEach((m) => {
            const imgHtml = m.image ? `<img src="${m.image}" class="machine-header-img" alt="${m.name}">` : '';
            header.innerHTML += `
                <div class="machine-header" data-machine="${m.id}">
                    ${imgHtml}
                    <div class="machine-header-name">${m.name}</div>
                </div>
            `;
        });
        
        for (let hour = 12; hour < 24; hour++) {
            for (let min of ['00', '30']) {
                const timeStr = formatTime12(hour, min);
                
                const row = document.createElement('div');
                row.className = 'schedule-row';
                row.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, 1fr)`;
                
                const timeCell = document.createElement('div');
                timeCell.className = 'time-cell';
                timeCell.textContent = timeStr;
                row.appendChild(timeCell);

                machines.forEach(m => {
                    const machineCell = document.createElement('div');
                    machineCell.className = 'machine-cell';
                    machineCell.dataset.machine = m.id;
                    machineCell.dataset.time = timeStr;
                    machineCell.dataset.date = formatDate(selectedDate);
                    
                    const cellContent = document.createElement('div');
                    cellContent.className = 'cell-content empty';
                    cellContent.style.cursor = 'default';
                    
                    machineCell.appendChild(cellContent);
                    row.appendChild(machineCell);
                });
                
                scheduleBody.appendChild(row);
            }
        }
    }

    function generateWeeklyGrid() {
        scheduleBody.innerHTML = '';
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            const dateStr = formatDate(d);
            
            const dayCard = document.createElement('div');
            dayCard.className = 'agenda-day-card';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'agenda-day-header';
            dayHeader.innerHTML = `📅 ${dayNames[d.getDay()]} ${d.getDate()}`;
            
            const bookingsList = document.createElement('div');
            bookingsList.className = 'agenda-bookings-list';
            bookingsList.id = `agenda-list-${dateStr}`;
            
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'agenda-empty-msg';
            emptyMsg.textContent = '(Sin reservas)';
            bookingsList.appendChild(emptyMsg);
            
            dayCard.appendChild(dayHeader);
            dayCard.appendChild(bookingsList);
            scheduleBody.appendChild(dayCard);
        }
    }

    function getBlockStyle(duration) {
        const slots = duration / 30;
        if (slots > 1) {
            return `height: calc(${slots * 100}% + ${slots - 1}px); z-index: 10;`;
        }
        return 'height: calc(100% - 4px);'; // 30 mins
    }
    
    function getMachineName(id) {
        const machines = SettingsService.settings.machines || [];
        const m = machines.find(x => x.id == id);
        return m ? m.name : `Máquina ${id}`;
    }

    async function renderBookings() {
        document.querySelectorAll('.booking-block').forEach(el => el.remove());
        document.querySelectorAll('.agenda-item').forEach(el => el.remove());
        
        const allBookings = await StorageService.getBookings();
        
        if (currentView === 'daily') {
            const bookings = allBookings.filter(b => b.date === formatDate(selectedDate));
            
            bookings.forEach(booking => {
                const cellSelector = `.machine-cell[data-machine="${booking.machine}"][data-time="${booking.time}"]`;
                const cell = document.querySelector(cellSelector);
                
                if (cell) {
                    const block = document.createElement('div');
                    const colorIndex = (parseInt(booking.machine) % 3) || 3;
                    block.className = `booking-block machine-${colorIndex}`;
                    block.style.cssText = getBlockStyle(booking.duration);
                    block.style.cursor = 'default';
                    
                    block.innerHTML = `
                        <div class="booking-name">${booking.name}</div>
                        <div class="booking-duration">${booking.duration} min</div>
                    `;

                    cell.appendChild(block);
                }
            });
        } else {
            const startOfWeek = formatDate(currentWeekStart);
            const endOfWeekDate = new Date(currentWeekStart);
            endOfWeekDate.setDate(endOfWeekDate.getDate() + 6);
            const endOfWeek = formatDate(endOfWeekDate);
            
            const weeklyBookings = allBookings.filter(b => b.date >= startOfWeek && b.date <= endOfWeek);
            
            weeklyBookings.sort((a, b) => {
               const getMins = (t) => {
                   let [time, modifier] = t.split(' ');
                   let [hours, minutes] = time.split(':');
                   if (hours === '12') hours = '0';
                   if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                   return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
               };
               return getMins(a.time) - getMins(b.time);
            });
            
            weeklyBookings.forEach(booking => {
                const listContainer = document.getElementById(`agenda-list-${booking.date}`);
                if (listContainer) {
                    const emptyMsg = listContainer.querySelector('.agenda-empty-msg');
                    if (emptyMsg) emptyMsg.style.display = 'none';
                    
                    const item = document.createElement('div');
                    const colorIndex = (parseInt(booking.machine) % 3) || 3;
                    item.className = `agenda-item machine-${colorIndex}`;
                    
                    const mName = getMachineName(booking.machine);
                    
                    item.innerHTML = `
                        <div class="agenda-time">🕒 ${booking.time}</div>
                        <div class="agenda-info">
                            <strong>[${mName}]</strong> ${booking.name} 
                            <span class="agenda-duration">(${booking.duration} min)</span>
                        </div>
                    `;
                    
                    item.style.cursor = 'default';
                    listContainer.appendChild(item);
                }
            });
        }
    }

    // Inicialización
    SettingsService.initRealtimeUpdates(() => {
        updateUIFromSettings();
        updateDateDisplay();
        renderWeekNav();
        
        StorageService.initRealtimeUpdates(() => {
            renderBookings();
        });
    });
    
    initPWA();
});

// PWA Install Logic
let deferredPrompt;
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .catch(err => console.log('Error SW:', err));
    }

    const installBtn = document.getElementById('install-btn');
    if(installBtn) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installBtn.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
    }
}
