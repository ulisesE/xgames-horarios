import { db, collection, onSnapshot } from './firebase-config.js';

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
    let currentView = 'daily'; // 'daily' or 'weekly'

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
        updateDateDisplay();
        generateWeeklyGrid();
        renderBookings();
    });

    function formatTime12(hour, min) {
        const h = hour === 12 ? 12 : (hour > 12 ? hour - 12 : hour);
        const ampm = hour < 12 || hour === 24 ? 'AM' : 'PM';
        return `${h}:${min} ${ampm}`;
    }

    function generateDailyGrid() {
        scheduleBody.innerHTML = '';
        const header = document.querySelector('.schedule-header');
        header.style.gridTemplateColumns = '80px 1fr 1fr 1fr';
        header.innerHTML = `
            <div class="time-col-header">Hora</div>
            <div class="machine-header" data-machine="1">Máquina 1</div>
            <div class="machine-header" data-machine="2">Máquina 2</div>
            <div class="machine-header" data-machine="3">Máquina 3</div>
        `;
        
        for (let hour = 12; hour < 24; hour++) {
            for (let min of ['00', '30']) {
                const timeStr = formatTime12(hour, min);
                
                const row = document.createElement('div');
                row.className = 'schedule-row';
                
                const timeCell = document.createElement('div');
                timeCell.className = 'time-cell';
                timeCell.textContent = timeStr;
                row.appendChild(timeCell);

                for (let m = 1; m <= 3; m++) {
                    const machineCell = document.createElement('div');
                    machineCell.className = 'machine-cell';
                    machineCell.dataset.machine = m;
                    machineCell.dataset.time = timeStr;
                    machineCell.dataset.date = formatDate(selectedDate);
                    
                    const cellContent = document.createElement('div');
                    cellContent.className = 'cell-content empty';
                    cellContent.style.cursor = 'default';
                    
                    machineCell.appendChild(cellContent);
                    row.appendChild(machineCell);
                }
                
                scheduleBody.appendChild(row);
            }
        }
    }

    function generateWeeklyGrid() {
        scheduleBody.innerHTML = '';
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        const header = document.querySelector('.schedule-header');
        header.style.gridTemplateColumns = '60px repeat(7, 1fr)';
        
        let headerHtml = `<div class="time-col-header" style="min-width: 60px;">Hora</div>`;
        for (let i = 0; i < 7; i++) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            headerHtml += `<div class="machine-header" style="flex:1;">${dayNames[i]}<br>${d.getDate()}</div>`;
        }
        header.innerHTML = headerHtml;

        for (let hour = 12; hour < 24; hour++) {
            const timeStr = formatTime12(hour, '00');
            
            const row = document.createElement('div');
            row.className = 'schedule-row weekly-row';
            
            const timeCell = document.createElement('div');
            timeCell.className = 'time-cell';
            timeCell.style.minWidth = '60px';
            timeCell.textContent = timeStr;
            row.appendChild(timeCell);

            for (let i = 0; i < 7; i++) {
                const d = new Date(currentWeekStart);
                d.setDate(d.getDate() + i);
                const dateStr = formatDate(d);

                const dayCell = document.createElement('div');
                dayCell.className = 'machine-cell day-cell';
                dayCell.style.flex = '1';
                dayCell.dataset.date = dateStr;
                dayCell.dataset.hour = hour;
                
                row.appendChild(dayCell);
            }
            
            scheduleBody.appendChild(row);
        }
    }

    function getBlockStyle(duration) {
        const slots = duration / 30;
        if (slots > 1) {
            return `height: calc(${slots * 100}% + ${slots - 1}px); z-index: 10;`;
        }
        return 'height: calc(100% - 4px);'; // 30 mins
    }

    async function renderBookings() {
        document.querySelectorAll('.booking-block').forEach(el => el.remove());
        document.querySelectorAll('.weekly-booking-chip').forEach(el => el.remove());
        
        const allBookings = await StorageService.getBookings();
        
        if (currentView === 'daily') {
            const bookings = allBookings.filter(b => b.date === formatDate(selectedDate));
            
            bookings.forEach(booking => {
                const cellSelector = `.machine-cell[data-machine="${booking.machine}"][data-time="${booking.time}"]`;
                const cell = document.querySelector(cellSelector);
                
                if (cell) {
                    const block = document.createElement('div');
                    block.className = `booking-block machine-${booking.machine}`;
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
            
            weeklyBookings.forEach(booking => {
                const isPM = booking.time.includes('PM');
                const timeParts = booking.time.split(' ');
                if(timeParts.length === 2) {
                    let [h, m] = timeParts[0].split(':');
                    let hourNum = parseInt(h);
                    if (isPM && hourNum !== 12) hourNum += 12;
                    if (!isPM && hourNum === 12) hourNum = 0;
                    
                    const cellSelector = `.day-cell[data-date="${booking.date}"][data-hour="${hourNum}"]`;
                    const cell = document.querySelector(cellSelector);
                    
                    if (cell) {
                        const chip = document.createElement('div');
                        chip.className = `weekly-booking-chip machine-${booking.machine}`;
                        chip.innerHTML = `M${booking.machine}: ${booking.name}`;
                        chip.title = `${booking.time} - ${booking.duration}m`;
                        chip.style.cursor = 'default';
                        
                        cell.appendChild(chip);
                    }
                }
            });
        }
    }

    updateDateDisplay();
    renderWeekNav();
    generateDailyGrid();
    
    StorageService.initRealtimeUpdates(() => {
        renderBookings();
    });
});
