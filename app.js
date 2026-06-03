import { db, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc, getDoc } from './firebase-config.js';

/**
 * Utility to calculate times covered by a booking's duration
 */
function getTimesForDuration(startTime, duration) {
    let [time, modifier] = startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) {
        hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
        hours += 12;
    }
    
    const times = [];
    let currentMinutes = hours * 60 + minutes;
    
    const numSlots = duration / 30;
    for (let i = 1; i < numSlots; i++) {
        const nextMins = currentMinutes + i * 30;
        const nextHour = Math.floor(nextMins / 60);
        const nextMin = nextMins % 60 === 0 ? '00' : '30';
        
        let displayHour = nextHour;
        let ampm = 'AM';
        if (nextHour >= 12) {
            ampm = 'PM';
            if (nextHour > 12) displayHour = nextHour - 12;
        } else if (nextHour === 0) {
            displayHour = 12;
        }
        times.push(`${displayHour}:${nextMin} ${ampm}`);
    }
    return times;
}


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
            } else {
                // Initialize if not exists
                this.saveSettings(this.settings);
            }
            callback();
        });
    },

    async saveSettings(newSettings) {
        await setDoc(doc(db, 'settings', 'global'), newSettings);
    }
};

/**
 * Notification Service
 */
function notifyAdmin(booking) {
    const title = 'Nueva solicitud de reserva';
    const body = `${booking.name} ha solicitado ${booking.duration} min a las ${booking.time}`;
    
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch(e) {}

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBmMGYxYiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmaWxsPSIjZmYwMGZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjM1ZW0iPlBJVTwvdGV4dD48L3N2Zz4='
        });
    }
}

/**
 * Data Storage Service (Firebase)
 */
const StorageService = {
    collectionName: 'bookings',
    bookingsCache: [],
    isInitialLoad: true,
    
    initRealtimeUpdates(callback) {
        const q = collection(db, this.collectionName);
        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (!this.isInitialLoad && change.type === 'added') {
                    const data = change.doc.data();
                    if (data.status === 'pending') {
                        notifyAdmin(data);
                    }
                }
            });
            this.isInitialLoad = false;

            this.bookingsCache = [];
            snapshot.forEach((doc) => {
                this.bookingsCache.push({ id: doc.id, ...doc.data() });
            });
            callback();
        });
    },

    async getBookings() {
        return this.bookingsCache;
    },

    async saveBooking(booking) {
        if (booking.id) {
            const bookingRef = doc(db, this.collectionName, booking.id);
            const dataToUpdate = { ...booking };
            delete dataToUpdate.id;
            await updateDoc(bookingRef, dataToUpdate);
            return booking;
        } else {
            const dataToSave = { ...booking };
            delete dataToSave.id;
            const docRef = await addDoc(collection(db, this.collectionName), dataToSave);
            booking.id = docRef.id;
            return booking;
        }
    },

    async deleteBooking(id) {
        await deleteDoc(doc(db, this.collectionName, id));
    }
};

/**
 * Lógica de la Interfaz de Usuario
 */
document.addEventListener('DOMContentLoaded', () => {
    const scheduleBody = document.getElementById('schedule-body');
    const currentDateEl = document.getElementById('current-date');
    const weekDaysContainer = document.getElementById('week-days');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const zoomBtn = document.getElementById('zoom-btn');
    const notifyBtn = document.getElementById('notify-btn');
    const scheduleContainerMain = document.getElementById('schedule-container-main');
    const dailyNavigator = document.getElementById('daily-navigator');
    
    // View controls
    const viewDailyBtn = document.getElementById('view-daily-btn');
    const viewWeeklyBtn = document.getElementById('view-weekly-btn');
    let currentView = 'daily';
    
    // Modal elements
    const modalOverlay = document.getElementById('booking-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const bookingForm = document.getElementById('booking-form');
    const displayMachine = document.getElementById('display-machine');
    const displayTime = document.getElementById('display-time');
    const inputMachine = document.getElementById('booking-machine');
    const inputTime = document.getElementById('booking-time');
    const inputDate = document.getElementById('booking-date');
    const inputId = document.getElementById('booking-id');
    const inputName = document.getElementById('customer-name');
    const inputPaid = document.getElementById('booking-paid');
    const inputPhone = document.getElementById('customer-phone');
    const inputBlocked = document.getElementById('booking-blocked');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');
    const saveBookingBtn = document.getElementById('save-booking-btn');

    // Settings Modal elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-modal');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const settingsForm = document.getElementById('settings-form');
    const addMachineBtn = document.getElementById('add-machine-btn');
    const machinesListContainer = document.getElementById('machines-list-container');
    
    // DOM elements for Closed Days
    const closedDaysListContainer = document.getElementById('closed-days-list-container');
    const inputClosedDate = document.getElementById('settings-closed-date');
    const inputClosedReason = document.getElementById('settings-closed-reason');
    const addClosedDayBtn = document.getElementById('add-closed-day-btn');
    let tempClosedDays = {};
    
    // DOM elements and state for Deleted Machines (Recycle Bin)
    const deletedMachinesListContainer = document.getElementById('deleted-machines-list-container');
    let tempDeletedMachines = [];
    
    // Help Modal elements
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const tabManualBtn = document.getElementById('tab-manual-btn');
    const tabChangelogBtn = document.getElementById('tab-changelog-btn');
    const tabManualContent = document.getElementById('tab-manual-content');
    const tabChangelogContent = document.getElementById('tab-changelog-content');

    // Header Logo element
    const headerLogo = document.querySelector('.logo');

    // Estado de Fechas
    let selectedDate = new Date();
    let currentWeekStart = getStartOfWeek(new Date());
    let currentEditingBookingColor = '';

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

    function updateNotifyBtnState() {
        if (!('Notification' in window)) {
            notifyBtn.style.display = 'none';
            return;
        }
        notifyBtn.style.display = 'inline-block';
        if (Notification.permission === 'granted') {
            notifyBtn.classList.remove('btn-outline');
            notifyBtn.classList.add('btn-primary');
            notifyBtn.title = "Notificaciones Activas";
        } else if (Notification.permission === 'denied') {
            notifyBtn.style.display = 'none';
        } else {
            notifyBtn.classList.remove('btn-primary');
            notifyBtn.classList.add('btn-outline');
            notifyBtn.title = "Activar Notificaciones";
        }
    }

    notifyBtn.addEventListener('click', () => {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                alert("Las notificaciones ya están activadas.");
            } else {
                Notification.requestPermission().then(permission => {
                    updateNotifyBtnState();
                    if (permission === 'granted') {
                        new Notification('¡Notificaciones activadas!', {
                            body: 'Recibirás un aviso cuando haya nuevas solicitudes de reserva.'
                        });
                    }
                });
            }
        }
    });
    updateNotifyBtnState();

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

    function updateUIFromSettings() {
        if (SettingsService.settings.logo) {
            headerLogo.innerHTML = `<img src="${SettingsService.settings.logo}" alt="Logo" style="max-height: 40px;">`;
        } else {
            headerLogo.innerHTML = `
                <span class="neon-text-magenta">X</span>
                <span class="neon-text-cyan">GAMES</span>
                <span class="neon-text-yellow">BARCADE</span>
            `;
        }
        
        if (currentView === 'daily') {
            generateDailyGrid();
        }
        renderBookings();
    }

    function generateDailyGrid() {
        scheduleBody.innerHTML = '';
        const header = document.getElementById('schedule-header');
        
        const machines = SettingsService.settings.machines || [];
        const cols = machines.length;
        
        header.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, minmax(0, 1fr))`;
        
        header.innerHTML = `<div class="time-col-header">Hora</div>`;
        machines.forEach((m, index) => {
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
                row.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, minmax(0, 1fr))`;
                
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
                    cellContent.addEventListener('click', () => openModal(m.id, timeStr, formatDate(selectedDate)));
                    
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
        const m = SettingsService.settings.machines.find(x => x.id == id);
        return m ? m.name : `Máquina ${id}`;
    }

    async function renderBookings() {
        document.querySelectorAll('.booking-block').forEach(el => el.remove());
        document.querySelectorAll('.agenda-item').forEach(el => el.remove());
        document.querySelectorAll('.machine-cell').forEach(el => el.classList.remove('overlapped-cell'));

        const dateStr = formatDate(selectedDate);
        const closedDays = SettingsService.settings.closedDays || {};
        const closedReason = closedDays[dateStr];

        // Remover cartel anterior si existe
        const existingOverlay = document.getElementById('closed-day-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        const container = document.querySelector('.schedule-container');
        if (container) {
            container.classList.remove('closed-schedule');
        }

        if (closedReason && currentView === 'daily') {
            if (container) {
                container.classList.add('closed-schedule');
                const wrapper = container.querySelector('.grid-wrapper');
                if (wrapper) {
                    const overlay = document.createElement('div');
                    overlay.id = 'closed-day-overlay';
                    overlay.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(10, 10, 15, 0.85);
                        backdrop-filter: blur(8px);
                        z-index: 50;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                        box-sizing: border-box;
                        text-align: center;
                        border: 2px dashed var(--neon-red);
                        border-radius: 8px;
                    `;
                    overlay.innerHTML = `
                        <div class="neon-text-magenta" style="font-size: 2.5rem; margin-bottom: 20px; text-shadow: 0 0 15px var(--neon-red);">🔒 LOCAL CERRADO</div>
                        <div class="neon-text-cyan" style="font-size: 1.4rem; max-width: 500px; line-height: 1.6; text-shadow: 0 0 10px var(--neon-cyan);">${closedReason}</div>
                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 15px;">No se pueden agendar o editar reservas para este día.</div>
                    `;
                    wrapper.appendChild(overlay);
                }
            }
        }
        
        const allBookings = await StorageService.getBookings();
        
        if (currentView === 'daily') {
            const bookings = allBookings.filter(b => b.date === formatDate(selectedDate));
            
            // Primera pasada: Calcular e inhabilitar celdas traslapadas por reservas largas aprobadas o bloqueadas
            bookings.forEach(booking => {
                if ((booking.status === 'approved' || booking.status === 'blocked') && booking.duration > 30) {
                    const coveredTimes = getTimesForDuration(booking.time, booking.duration);
                    coveredTimes.forEach(t => {
                        const ovCell = document.querySelector(`.machine-cell[data-machine="${booking.machine}"][data-time="${t}"]`);
                        if (ovCell) {
                            ovCell.classList.add('overlapped-cell');
                        }
                    });
                }
            });
            
            bookings.forEach(booking => {
                const cellSelector = `.machine-cell[data-machine="${booking.machine}"][data-time="${booking.time}"]`;
                const cell = document.querySelector(cellSelector);
                
                if (cell) {
                    const block = document.createElement('div');
                    const colorIndex = (parseInt(booking.machine) % 3) || 3;
                    block.className = `booking-block machine-${colorIndex}`;
                    
                    if (booking.status === 'pending') {
                        block.classList.add('booking-pending');
                    } else if (booking.status === 'rejected') {
                        block.classList.add('booking-rejected');
                    } else if (booking.status === 'blocked') {
                        block.className = 'booking-block booking-blocked';
                    } else if (booking.status === 'approved') {
                        if (booking.color) {
                            block.classList.add(`neon-${booking.color}`);
                        } else {
                            const colorsList = ['magenta', 'cyan', 'yellow', 'green', 'orange', 'purple'];
                            const nameToHash = booking.name || 'Invitado';
                            const hash = nameToHash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const assignedColor = colorsList[hash % colorsList.length];
                            block.classList.add(`neon-${assignedColor}`);
                        }
                    }

                    block.style.cssText = getBlockStyle(booking.duration);
                    
                    const paidIcon = booking.paid ? '<span title="Pagado">💰</span> ' : '';
                    const lockIcon = booking.status === 'blocked' ? '🔒 ' : '';
                    
                    block.innerHTML = `
                        <div class="booking-name">${lockIcon}${paidIcon}${booking.name}</div>
                        <div class="booking-duration">${booking.duration} min</div>
                    `;

                    block.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(booking.machine, booking.time, booking.date, booking);
                    });

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
                    const mName = getMachineName(booking.machine);

                    if (booking.status === 'blocked') {
                        item.className = 'agenda-item blocked-agenda';
                        item.innerHTML = `
                            <div class="agenda-time">🕒 ${booking.time}</div>
                            <div class="agenda-info">
                                <strong>[${mName}]</strong> 🔒 ${booking.name || 'MANTENIMIENTO / BLOQUEADO'} 
                                <span class="agenda-duration">(${booking.duration} min)</span>
                            </div>
                        `;
                    } else {
                        const colorIndex = (parseInt(booking.machine) % 3) || 3;
                        item.className = `agenda-item machine-${colorIndex}`;
                        
                        if (booking.status === 'pending') {
                            item.classList.add('pending-agenda');
                        } else if (booking.status === 'rejected') {
                            item.classList.add('rejected-agenda');
                        } else if (booking.status === 'approved') {
                            if (booking.color) {
                                item.classList.add(`neon-${booking.color}`);
                            } else {
                                const colorsList = ['magenta', 'cyan', 'yellow', 'green', 'orange', 'purple'];
                                const nameToHash = booking.name || 'Invitado';
                                const hash = nameToHash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const assignedColor = colorsList[hash % colorsList.length];
                                item.classList.add(`neon-${assignedColor}`);
                            }
                        }
                        
                        const paidIcon = booking.paid ? '<span title="Pagado">💰</span> ' : '';
                        
                        item.innerHTML = `
                            <div class="agenda-time">🕒 ${booking.time}</div>
                            <div class="agenda-info">
                                <strong>[${mName}]</strong> ${paidIcon}${booking.name} 
                                <span class="agenda-duration">(${booking.duration} min)</span>
                            </div>
                        `;
                    }
                    
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(booking.machine, booking.time, booking.date, booking);
                    });
                    
                    listContainer.appendChild(item);
                }
            });

            // Mostrar cartel de cerrado en las tarjetas de la agenda semanal si aplica
            for (let i = 0; i < 7; i++) {
                const d = new Date(currentWeekStart);
                d.setDate(d.getDate() + i);
                const dateStr = formatDate(d);
                const closedDays = SettingsService.settings.closedDays || {};
                const closedReason = closedDays[dateStr];
                
                if (closedReason) {
                    const listContainer = document.getElementById(`agenda-list-${dateStr}`);
                    if (listContainer) {
                        listContainer.innerHTML = `<div class="agenda-empty-msg" style="color: var(--neon-red); font-weight: bold; display: block; padding: 10px 0;">🔒 CERRADO: ${closedReason}</div>`;
                    }
                }
            }
        }
    }

    // Modal Handlers
    function openModal(machineId, time, date, existingBooking = null) {
        inputMachine.value = machineId;
        inputTime.value = time;
        inputDate.value = date;
        
        const mName = getMachineName(machineId);
        displayMachine.textContent = mName;
        displayTime.textContent = time + ' | ' + date;
        
        const machinesOptions = SettingsService.settings.machines.map(m => 
            `<option value="${m.id}" ${m.id == machineId ? 'selected' : ''}>${m.name}</option>`
        ).join('');

        if (existingBooking) {
            inputId.value = existingBooking.id;
            inputName.value = existingBooking.name;
            inputMachine.value = existingBooking.machine;
            document.getElementById('booking-duration').value = existingBooking.duration;
            inputPaid.checked = !!existingBooking.paid;
            inputPhone.value = existingBooking.phone || '';
            inputBlocked.checked = existingBooking.status === 'blocked';
            currentEditingBookingColor = existingBooking.color || '';
            
            // Forzar actualización del DOM para el estado del switch
            inputBlocked.dispatchEvent(new Event('change'));

            // Si la reserva no tiene teléfono pero hay un nombre de cliente, buscarlo en su perfil
            if (!existingBooking.phone && existingBooking.name) {
                const userRef = doc(db, 'users', existingBooking.name.toLowerCase());
                getDoc(userRef).then((userSnap) => {
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (userData.whatsapp) {
                            inputPhone.value = userData.whatsapp;
                            // Actualizar la reserva en Firestore de fondo para persistir el número
                            updateDoc(doc(db, 'bookings', existingBooking.id), { phone: userData.whatsapp })
                                .catch(err => console.error("Error al actualizar teléfono en reserva:", err));
                        }
                    }
                }).catch(err => {
                    console.error("Error al obtener perfil del usuario para teléfono:", err);
                });
            }

            if (existingBooking.status !== 'blocked') {
                whatsappBtn.classList.remove('hidden');
            } else {
                whatsappBtn.classList.add('hidden');
            }
            
            deleteBtn.classList.remove('hidden');
            
            displayMachine.innerHTML = `
                <select id="edit-machine-select" class="custom-select" style="margin-top:5px; padding: 5px;">
                    ${machinesOptions}
                </select>
            `;
            document.getElementById('edit-machine-select').addEventListener('change', (e) => {
                inputMachine.value = e.target.value;
            });

            if (existingBooking.status === 'pending') {
                approveBtn.classList.remove('hidden');
                rejectBtn.classList.remove('hidden');
                saveBookingBtn.classList.add('hidden');
            } else {
                approveBtn.classList.add('hidden');
                rejectBtn.classList.add('hidden');
                saveBookingBtn.classList.remove('hidden');
            }

        } else {
            inputId.value = '';
            inputName.value = '';
            inputPhone.value = '';
            inputBlocked.checked = false;
            inputBlocked.dispatchEvent(new Event('change'));
            whatsappBtn.classList.add('hidden');
            currentEditingBookingColor = '';
            
            document.getElementById('booking-duration').value = '30';
            inputPaid.checked = false;
            
            deleteBtn.classList.add('hidden');
            approveBtn.classList.add('hidden');
            rejectBtn.classList.add('hidden');
            saveBookingBtn.classList.remove('hidden');
            
            if (currentView === 'weekly') {
                displayMachine.innerHTML = `
                    <select id="create-machine-select" class="custom-select" style="margin-top:5px; padding: 5px;">
                        ${machinesOptions}
                    </select>
                `;
                document.getElementById('create-machine-select').addEventListener('change', (e) => {
                    inputMachine.value = e.target.value;
                });
            } else {
                 displayMachine.innerHTML = `<div class="info-text neon-text-cyan">${mName}</div>`;
            }
        }

        modalOverlay.classList.remove('hidden');
        setTimeout(() => inputName.focus(), 100);
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Form Submit (Admin always creates approved bookings)
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = document.getElementById('booking-duration').value;
        
        const booking = {
            id: inputId.value || undefined,
            machine: inputMachine.value,
            time: inputTime.value,
            date: inputDate.value,
            name: inputName.value,
            phone: inputPhone.value.trim(),
            duration: parseInt(duration),
            status: inputBlocked.checked ? 'blocked' : 'approved',
            paid: inputPaid.checked,
            color: currentEditingBookingColor
        };

        await StorageService.saveBooking(booking);
        closeModal();
    });

    // Botones de Aprobación/Rechazo
    approveBtn.addEventListener('click', async () => {
        const id = inputId.value;
        if (!id) return;
        
        const duration = document.getElementById('booking-duration').value;
        
        const booking = {
            id: id,
            machine: inputMachine.value,
            time: inputTime.value,
            date: inputDate.value,
            name: inputName.value,
            phone: inputPhone.value.trim(),
            duration: parseInt(duration),
            status: 'approved',
            paid: inputPaid.checked,
            color: currentEditingBookingColor
        };

        await StorageService.saveBooking(booking);
        
        // Rechazar (eliminar) automáticamente otras reservas pendientes para misma máquina/fecha/hora
        const allBookings = await StorageService.getBookings();
        const conflicts = allBookings.filter(b => 
            b.id !== id && 
            b.machine === booking.machine && 
            b.date === booking.date && 
            b.time === booking.time && 
            b.status === 'pending'
        );
        
        for (let conflict of conflicts) {
            await StorageService.deleteBooking(conflict.id);
        }

        closeModal();
    });

    rejectBtn.addEventListener('click', async () => {
        const id = inputId.value;
        if (!id) return;
        
        // Eliminamos la reserva rechazada para no ensuciar la base de datos
        await StorageService.deleteBooking(id);
        closeModal();
    });

    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
            await StorageService.deleteBooking(inputId.value);
            closeModal();
        }
    });

    // Lógica dinámica para switch de bloqueo
    inputBlocked.addEventListener('change', () => {
        const isBlocked = inputBlocked.checked;
        if (isBlocked) {
            if (!inputName.value || inputName.value === '') {
                inputName.value = 'Mantenimiento 🛠️';
            }
            inputName.disabled = false;
            inputName.required = true;
            document.getElementById('customer-phone-group').style.display = 'none';
            document.getElementById('booking-duration-group').style.display = 'block';
            document.getElementById('booking-paid-group').style.display = 'none';
            inputPhone.value = '';
            inputPaid.checked = false;
        } else {
            if (inputName.value === 'Mantenimiento 🛠️') {
                inputName.value = '';
            }
            inputName.disabled = false;
            inputName.required = true;
            document.getElementById('customer-phone-group').style.display = 'block';
            document.getElementById('booking-duration-group').style.display = 'block';
            document.getElementById('booking-paid-group').style.display = 'flex';
        }
    });

    // Botón de WhatsApp
    whatsappBtn.addEventListener('click', () => {
        const phone = inputPhone.value.trim();
        const name = inputName.value.trim();
        const time = inputTime.value;
        const date = inputDate.value;
        const machineName = getMachineName(inputMachine.value);
        
        if (!phone) {
            alert('Por favor, ingresa un número de teléfono para enviar la notificación.');
            return;
        }
        
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `¡Hola ${name}! Tu reserva en XGames Barcade para la máquina ${machineName} a las ${time} del día ${date} ha sido APROBADA con éxito. ¡Prepárate para bailar! 🕹️💃`;
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    });

    // ==========================================
    // SETTINGS MODAL LOGIC
    // ==========================================
    settingsBtn.addEventListener('click', () => {
        document.getElementById('settings-motd').value = SettingsService.settings.motd || '';
        document.getElementById('settings-logo-url').value = SettingsService.settings.logo || '';
        
        tempClosedDays = { ...(SettingsService.settings.closedDays || {}) };
        tempDeletedMachines = [...(SettingsService.settings.deletedMachines || [])];
        
        // Auto-detect orphan machine IDs from bookings (deleted before recycle bin was implemented)
        const activeIds = new Set((SettingsService.settings.machines || []).map(m => m.id.toString()));
        const deletedIds = new Set(tempDeletedMachines.map(m => m.id.toString()));
        
        const orphanIds = new Set();
        StorageService.bookingsCache.forEach(b => {
            if (b.machine) {
                const mid = b.machine.toString();
                if (!activeIds.has(mid) && !deletedIds.has(mid)) {
                    orphanIds.add(mid);
                }
            }
        });
        
        orphanIds.forEach(id => {
            tempDeletedMachines.push({
                id: id,
                name: `Máquina Recuperada (${id})`,
                image: ''
            });
        });

        renderClosedDaysList();
        renderMachinesListForSettings();
        renderDeletedMachinesList();
        settingsModal.classList.remove('hidden');
    });

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    closeSettingsBtn.addEventListener('click', closeSettings);
    cancelSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    // Helper to render an active machine in the Settings list
    function addActiveMachineToDOM(id, name, image) {
        const container = document.createElement('div');
        container.className = 'machine-setting-item';
        container.dataset.id = id;
        container.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <input type="text" class="machine-name-input" placeholder="Nombre Máquina" value="${name}">
                <button type="button" class="btn btn-danger btn-sm delete-machine-btn">🗑️</button>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <img class="machine-img-preview" src="${image || ''}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px; ${image ? 'display:block;' : 'display:none;'}">
                <input type="url" class="machine-url-input" placeholder="URL de la imagen" value="${image || ''}" style="flex:1; padding:0.5rem; background:rgba(0,0,0,0.5); border:1px solid var(--border-color); color:white; border-radius:4px; font-size:0.8rem;">
            </div>
            <hr style="margin: 10px 0; border-color: #333;">
        `;
        
        container.querySelector('.delete-machine-btn').addEventListener('click', () => {
            const currentName = container.querySelector('.machine-name-input').value.trim() || 'Nueva Máquina';
            const currentImg = container.querySelector('.machine-url-input').value.trim() || '';
            tempDeletedMachines.push({ id, name: currentName, image: currentImg });
            container.remove();
            renderDeletedMachinesList();
        });
        
        container.querySelector('.machine-url-input').addEventListener('input', function() {
            const img = container.querySelector('.machine-img-preview');
            img.src = this.value;
            img.style.display = this.value ? 'block' : 'none';
        });

        machinesListContainer.appendChild(container);
    }

    addMachineBtn.addEventListener('click', () => {
        const newId = Date.now().toString();
        addActiveMachineToDOM(newId, 'Nueva Máquina', '');
    });

    function renderMachinesListForSettings() {
        machinesListContainer.innerHTML = '';
        SettingsService.settings.machines.forEach(m => {
            addActiveMachineToDOM(m.id, m.name, m.image);
        });
    }

    function renderDeletedMachinesList() {
        deletedMachinesListContainer.innerHTML = '';
        if (tempDeletedMachines.length === 0) {
            deletedMachinesListContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding: 10px 0;">No hay máquinas en la papelera.</div>`;
            return;
        }

        tempDeletedMachines.forEach((m, idx) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 4px; border: 1px solid #222; font-size: 0.85rem; margin-bottom: 5px;';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${m.image ? `<img src="${m.image}" style="width: 25px; height: 25px; object-fit: cover; border-radius: 4px;">` : '🕹️'}
                    <span style="color: #ccc;">${m.name} <small style="color:var(--text-muted);">(${m.id})</small></span>
                </div>
                <button type="button" class="btn btn-primary btn-sm restore-machine-btn" data-index="${idx}" style="padding: 2px 8px; font-size: 0.75rem; background: #00cc00; box-shadow: none;">♻️ Recuperar</button>
            `;
            
            item.querySelector('.restore-machine-btn').addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const restoredMachine = tempDeletedMachines[index];
                tempDeletedMachines.splice(index, 1);
                addActiveMachineToDOM(restoredMachine.id, restoredMachine.name, restoredMachine.image);
                renderDeletedMachinesList();
            });
            
            deletedMachinesListContainer.appendChild(item);
        });
    }

    function renderClosedDaysList() {
        closedDaysListContainer.innerHTML = '';
        const dates = Object.keys(tempClosedDays).sort();
        if (dates.length === 0) {
            closedDaysListContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding: 10px 0;">No hay días cerrados configurados.</div>`;
            return;
        }

        dates.forEach(date => {
            const reason = tempClosedDays[date];
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 4px; border: 1px solid #222; font-size: 0.85rem; margin-bottom: 5px;';
            item.innerHTML = `
                <div>
                    <strong style="color: var(--neon-magenta);">${date}</strong> - <span style="color: #ccc;">${reason}</span>
                </div>
                <button type="button" class="btn btn-danger btn-sm delete-closed-day-btn" data-date="${date}" style="padding: 2px 6px; font-size: 0.75rem;">🗑️</button>
            `;
            item.querySelector('.delete-closed-day-btn').addEventListener('click', (e) => {
                const d = e.currentTarget.dataset.date;
                delete tempClosedDays[d];
                renderClosedDaysList();
            });
            closedDaysListContainer.appendChild(item);
        });
    }

    addClosedDayBtn.addEventListener('click', () => {
        const dateVal = inputClosedDate.value;
        const reasonVal = inputClosedReason.value.trim() || 'Cerrado';
        if (!dateVal) {
            alert('Por favor, selecciona una fecha válida.');
            return;
        }
        tempClosedDays[dateVal] = reasonVal;
        inputClosedDate.value = '';
        inputClosedReason.value = '';
        renderClosedDaysList();
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('save-settings-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        try {
            const newLogoUrl = document.getElementById('settings-logo-url').value.trim();
            const newMotd = document.getElementById('settings-motd').value;
            
            const newMachines = [];
            const machineItems = document.querySelectorAll('.machine-setting-item');
            
            for (let item of machineItems) {
                const id = item.dataset.id;
                const name = item.querySelector('.machine-name-input').value || `Máquina`;
                const imageUrl = item.querySelector('.machine-url-input').value.trim() || '';
                
                newMachines.push({ id, name, image: imageUrl });
            }

            const newSettings = {
                logo: newLogoUrl,
                motd: newMotd,
                machines: newMachines,
                closedDays: tempClosedDays,
                deletedMachines: tempDeletedMachines
            };

            await SettingsService.saveSettings(newSettings);
            closeSettings();

        } catch (error) {
            console.error("Error guardando ajustes:", error);
            alert("Hubo un error al guardar los ajustes.");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // ==========================================
    // HELP MODAL LOGIC (MANUAL & CHANGELOG)
    // ==========================================
    helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
        tabManualBtn.click(); // Reset to manual tab
    });

    function closeHelp() {
        helpModal.classList.add('hidden');
    }

    closeHelpBtn.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) closeHelp();
    });

    // Tab switching inside Help Modal
    tabManualBtn.addEventListener('click', () => {
        tabManualBtn.classList.add('active');
        tabChangelogBtn.classList.remove('active');
        tabManualContent.classList.remove('hidden');
        tabChangelogContent.classList.add('hidden');
    });

    tabChangelogBtn.addEventListener('click', () => {
        tabChangelogBtn.classList.add('active');
        tabManualBtn.classList.remove('active');
        tabChangelogContent.classList.remove('hidden');
        tabManualContent.classList.add('hidden');
    });

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    
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

        // Escucha cambios del Service Worker para forzar actualización de caché y recargar
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });
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
