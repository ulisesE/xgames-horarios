import { db, collection, onSnapshot, doc, getDoc, setDoc, addDoc } from './firebase-config.js';

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
            }
            callback();
        });
    }
};

/**
 * Data Storage Service (Firebase - Cliente)
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
    },

    async saveBooking(booking) {
        const dataToSave = { ...booking };
        if (dataToSave.id) delete dataToSave.id;
        
        const docRef = await addDoc(collection(db, this.collectionName), dataToSave);
        booking.id = docRef.id;
        return booking;
    }
};

/**
 * Auth Service (Simple PIN Auth)
 */
const AuthService = {
    currentUser: null,

    init() {
        const stored = localStorage.getItem('piu_client_user');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    },

    async loginOrRegister(username, pin) {
        const userRef = doc(db, 'users', username.toLowerCase());
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            // Check PIN
            if (userSnap.data().pin === pin) {
                this.currentUser = { username: userSnap.data().username };
                localStorage.setItem('piu_client_user', JSON.stringify(this.currentUser));
                return true;
            } else {
                return false; // Wrong PIN
            }
        } else {
            // Register
            const newUser = { username, pin };
            await setDoc(userRef, newUser);
            this.currentUser = { username };
            localStorage.setItem('piu_client_user', JSON.stringify(this.currentUser));
            return true;
        }
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('piu_client_user');
    }
};

/**
 * Lógica de la Interfaz de Usuario (Cliente)
 */
document.addEventListener('DOMContentLoaded', () => {
    AuthService.init();

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

    // Auth UI
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const loginModal = document.getElementById('login-modal');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const loginForm = document.getElementById('login-form');
    const loginUsername = document.getElementById('login-username');
    const loginPin = document.getElementById('login-pin');

    // Booking Request UI
    const clientBookingModal = document.getElementById('client-booking-modal');
    const closeClientBookingBtn = document.getElementById('close-client-booking-btn');
    const cancelClientBookingBtn = document.getElementById('cancel-client-booking-btn');
    const clientBookingForm = document.getElementById('client-booking-form');
    const clientMachine = document.getElementById('client-booking-machine');
    const clientTime = document.getElementById('client-booking-time');
    const clientDate = document.getElementById('client-booking-date');
    const clientDisplayMachine = document.getElementById('client-display-machine');
    const clientDisplayTime = document.getElementById('client-display-time');

    // User Account Modal
    const myAccountModal = document.getElementById('my-account-modal');
    const closeAccountBtn = document.getElementById('close-account-btn');
    const tabBookingsBtn = document.getElementById('tab-bookings-btn');
    const tabProfileBtn = document.getElementById('tab-profile-btn');
    const tabBookingsContent = document.getElementById('tab-bookings-content');
    const tabProfileContent = document.getElementById('tab-profile-content');
    const userBookingsList = document.getElementById('user-bookings-list');
    const profileForm = document.getElementById('profile-form');
    const profileWhatsapp = document.getElementById('profile-whatsapp');
    const profileNick = document.getElementById('profile-nick');
    const profileLevel = document.getElementById('profile-level');
    const profileSongs = document.getElementById('profile-songs');
    const profileColor = document.getElementById('profile-color');

    // Player Card Modal
    const playerCardModal = document.getElementById('player-card-modal');
    const closePlayerCardBtn = document.getElementById('close-player-card-btn');
    const cardNick = document.getElementById('card-nick');
    const cardLevel = document.getElementById('card-level');
    const cardUsername = document.getElementById('card-username');
    const cardSongs = document.getElementById('card-songs');

    // Estado de Fechas
    let selectedDate = new Date();
    let currentWeekStart = getStartOfWeek(new Date());

    // Update Auth UI
    function updateAuthUI() {
        if (AuthService.currentUser) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userDisplay.classList.remove('hidden');
            userDisplay.textContent = `Hola, ${AuthService.currentUser.username}`;
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userDisplay.classList.add('hidden');
            userDisplay.textContent = '';
        }
    }
    updateAuthUI();

    loginBtn.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        setTimeout(() => loginUsername.focus(), 100);
    });

    closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    
    logoutBtn.addEventListener('click', () => {
        AuthService.logout();
        updateAuthUI();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const pin = loginPin.value.trim();
        
        if (username.length < 3) {
            alert('El usuario debe tener al menos 3 letras.');
            return;
        }

        const success = await AuthService.loginOrRegister(username, pin);
        if (success) {
            updateAuthUI();
            loginModal.classList.add('hidden');
            loginForm.reset();
        } else {
            alert('PIN incorrecto para este usuario. Si eres nuevo, elige otro nombre.');
        }
    });

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
        
        if (SettingsService.settings.motd && !sessionStorage.getItem('motd_seen')) {
            motdText.textContent = SettingsService.settings.motd;
            motdModal.classList.remove('hidden');
        }

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

    function getMachineName(id) {
        const machines = SettingsService.settings.machines || [];
        const m = machines.find(x => x.id == id);
        return m ? m.name : `Máquina ${id}`;
    }

    // Modal Request Booking
    function openBookingRequest(machineId, time, date) {
        if (!AuthService.currentUser) {
            loginModal.classList.remove('hidden');
            return;
        }

        clientMachine.value = machineId;
        clientTime.value = time;
        clientDate.value = date;

        const mName = getMachineName(machineId);
        clientDisplayMachine.innerHTML = `<div class="info-text neon-text-cyan">${mName}</div>`;
        clientDisplayTime.textContent = time + ' | ' + date;

        clientBookingModal.classList.remove('hidden');
    }

    closeClientBookingBtn.addEventListener('click', () => clientBookingModal.classList.add('hidden'));
    cancelClientBookingBtn.addEventListener('click', () => clientBookingModal.classList.add('hidden'));

    clientBookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = clientBookingForm.querySelector('button[type="submit"]');
        const origText = btn.textContent;
        btn.textContent = 'Enviando...';
        btn.disabled = true;

        const duration = document.getElementById('client-booking-duration').value;

        // Obtener teléfono/whatsapp y color del perfil del usuario logueado antes de enviar la reserva
        let clientPhone = '';
        let clientColor = '';
        try {
            const userRef = doc(db, 'users', AuthService.currentUser.username.toLowerCase());
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                clientPhone = userSnap.data().whatsapp || '';
                clientColor = userSnap.data().color || '';
            }
        } catch (error) {
            console.error("Error al obtener los datos del perfil del cliente:", error);
        }

        const booking = {
            machine: clientMachine.value,
            time: clientTime.value,
            date: clientDate.value,
            name: AuthService.currentUser.username, // Usa el nombre logueado
            phone: clientPhone, // Guardar el número del perfil del cliente
            color: clientColor, // Guardar el color del perfil del cliente
            duration: parseInt(duration),
            status: 'pending', // ESTADO PENDIENTE
            userId: AuthService.currentUser.username
        };

        try {
            await StorageService.saveBooking(booking);
            alert('¡Tu solicitud ha sido enviada! Espera a que el administrador la apruebe.');
            clientBookingModal.classList.add('hidden');
            clientBookingForm.reset();
        } catch (error) {
            console.error("Error saving booking", error);
            alert("Error al guardar la solicitud.");
        } finally {
            btn.textContent = origText;
            btn.disabled = false;
        }
    });

    function generateDailyGrid() {
        scheduleBody.innerHTML = '';
        const header = document.getElementById('schedule-header');
        
        const machines = SettingsService.settings.machines || [];
        const cols = machines.length;
        
        header.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, minmax(0, 1fr))`;
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
                    
                    // Al hacer click en celda vacía, abrimos solicitud (o login)
                    cellContent.addEventListener('click', () => {
                        openBookingRequest(m.id, timeStr, formatDate(selectedDate));
                    });
                    
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
                        <div class="neon-text-cyan" style="font-size: 1.3rem; max-width: 500px; line-height: 1.6; text-shadow: 0 0 10px var(--neon-cyan);">${closedReason}</div>
                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 15px;">Todas las máquinas se encuentran deshabilitadas por hoy.</div>
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
                    
                    if (booking.status === 'approved') {
                        block.style.cursor = 'pointer';
                        block.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openPlayerCard(booking.userId || booking.name);
                        });
                    } else {
                        block.style.cursor = 'default';
                    }
                    
                    const lockIcon = booking.status === 'blocked' ? '🔒 ' : '';
                    block.innerHTML = `
                        <div class="booking-name">${lockIcon}${booking.name}</div>
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
                        
                        if (booking.status === 'approved') {
                            item.style.cursor = 'pointer';
                            item.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openPlayerCard(booking.userId || booking.name);
                            });
                        } else {
                            item.style.cursor = 'default';
                        }
                        
                        item.innerHTML = `
                            <div class="agenda-time">🕒 ${booking.time}</div>
                            <div class="agenda-info">
                                <strong>[${mName}]</strong> ${booking.name} 
                                <span class="agenda-duration">(${booking.duration} min)</span>
                            </div>
                        `;
                    }
                    
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

    // Inicialización
    SettingsService.initRealtimeUpdates(() => {
        updateUIFromSettings();
        updateDateDisplay();
        renderWeekNav();
        
        StorageService.initRealtimeUpdates(() => {
            renderBookings();
        });
    });
    
    // ==========================================
    // LÓGICA DE MI CUENTA Y FICHA DE JUGADOR
    // ==========================================

    // Alternancia de pestañas
    tabBookingsBtn.addEventListener('click', () => {
        tabBookingsBtn.classList.add('active');
        tabProfileBtn.classList.remove('active');
        tabBookingsContent.classList.remove('hidden');
        tabProfileContent.classList.add('hidden');
    });

    tabProfileBtn.addEventListener('click', () => {
        tabProfileBtn.classList.add('active');
        tabBookingsBtn.classList.remove('active');
        tabProfileContent.classList.remove('hidden');
        tabBookingsContent.classList.add('hidden');
    });

    // Cargar reservas del usuario logueado con opción de cancelar pendientes
    async function loadUserBookings() {
        userBookingsList.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">Cargando tus reservas...</div>';
        
        try {
            const allBookings = await StorageService.getBookings();
            const userBookings = allBookings.filter(b => 
                (b.userId && b.userId.toLowerCase() === AuthService.currentUser.username.toLowerCase()) ||
                (b.name && b.name.toLowerCase() === AuthService.currentUser.username.toLowerCase())
            );
            
            userBookings.sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
            
            userBookingsList.innerHTML = '';
            if (userBookings.length === 0) {
                userBookingsList.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">No tienes reservas o solicitudes.</div>';
                return;
            }
            
            for (let b of userBookings) {
                const item = document.createElement('div');
                item.className = 'user-booking-item';
                
                const mName = getMachineName(b.machine);
                let statusClass = 'pending';
                let statusText = '⏱️ Pendiente';
                
                if (b.status === 'approved') {
                    statusClass = 'approved';
                    statusText = '💰 Aprobada';
                }
                
                let cancelBtnHtml = '';
                if (b.status === 'pending') {
                    cancelBtnHtml = `<button type="button" class="btn btn-danger btn-sm cancel-booking-btn" data-id="${b.id}">Cancelar</button>`;
                }
                
                item.innerHTML = `
                    <div class="user-booking-details">
                        <div class="user-booking-title">[${mName}] - ${b.time}</div>
                        <div class="user-booking-meta">Fecha: ${b.date} | Duración: ${b.duration} min</div>
                        <div style="margin-top: 5px;">
                            <span class="user-booking-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    ${cancelBtnHtml}
                `;
                
                if (b.status === 'pending') {
                    item.querySelector('.cancel-booking-btn').addEventListener('click', async (e) => {
                        const id = e.target.dataset.id;
                        if (confirm('¿Estás seguro de que deseas cancelar esta solicitud?')) {
                            e.target.textContent = 'Cancelando...';
                            e.target.disabled = true;
                            
                            try {
                                const { deleteDoc, doc } = await import('./firebase-config.js');
                                await deleteDoc(doc(db, 'bookings', id));
                                loadUserBookings();
                            } catch (err) {
                                console.error(err);
                                alert('Error al cancelar la reserva.');
                                loadUserBookings();
                            }
                        }
                    });
                }
                
                userBookingsList.appendChild(item);
            }
        } catch (error) {
            console.error("Error loading user bookings", error);
            userBookingsList.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--neon-red);">Error al cargar tus reservas.</div>';
        }
    }

    // Cargar perfil del jugador en el formulario
    async function loadUserProfile() {
        if (!AuthService.currentUser) return;
        
        try {
            const userRef = doc(db, 'users', AuthService.currentUser.username.toLowerCase());
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                profileWhatsapp.value = data.whatsapp || '';
                profileNick.value = data.nick || '';
                profileLevel.value = data.level || '';
                profileSongs.value = data.songs || '';
                profileColor.value = data.color || '';
            }
        } catch (error) {
            console.error("Error loading profile", error);
        }
    }

    // Guardar perfil del jugador
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const origText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;
        
        const nick = profileNick.value.trim();
        const level = profileLevel.value.trim();
        const whatsapp = profileWhatsapp.value.trim();
        const songs = profileSongs.value.trim();
        const color = profileColor.value;
        
        try {
            const userRef = doc(db, 'users', AuthService.currentUser.username.toLowerCase());
            const userSnap = await getDoc(userRef);
            const currentPin = userSnap.exists() ? userSnap.data().pin : '1234';
            
            const updatedProfile = {
                username: AuthService.currentUser.username,
                pin: currentPin,
                nick: nick,
                level: level,
                whatsapp: whatsapp,
                songs: songs,
                color: color
            };
            
            await setDoc(userRef, updatedProfile);
            alert('¡Tu perfil arcade se ha guardado exitosamente!');
        } catch (error) {
            console.error("Error saving profile", error);
            alert('Hubo un error al guardar el perfil.');
        } finally {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
        }
    });

    // Abrir cuenta al dar clic en span userDisplay
    userDisplay.addEventListener('click', () => {
        if (!AuthService.currentUser) return;
        myAccountModal.classList.remove('hidden');
        tabBookingsBtn.click();
        loadUserBookings();
        loadUserProfile();
    });

    // Abrir Ficha de Jugador Social (Pública)
    async function openPlayerCard(userId) {
        if (!AuthService.currentUser) {
            loginModal.classList.remove('hidden');
            return;
        }
        
        cardNick.textContent = 'Cargando...';
        cardLevel.textContent = '';
        cardUsername.textContent = userId;
        cardSongs.textContent = '';
        
        playerCardModal.classList.remove('hidden');
        
        try {
            const userRef = doc(db, 'users', userId.toLowerCase());
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                cardNick.textContent = data.nick || data.username || userId;
                cardLevel.textContent = data.level ? `Nivel: ${data.level}` : 'Nivel no especificado';
                cardUsername.textContent = data.username || userId;
                cardSongs.textContent = data.songs || 'Ninguna registrada';
            } else {
                cardNick.textContent = userId;
                cardLevel.textContent = 'Sin perfil configurado';
                cardSongs.textContent = 'Ninguna registrada';
            }
        } catch (error) {
            console.error("Error loading social card", error);
            cardNick.textContent = 'Error al cargar';
        }
    }

    // Cerrar Modales
    closeAccountBtn.addEventListener('click', () => myAccountModal.classList.add('hidden'));
    closePlayerCardBtn.addEventListener('click', () => playerCardModal.classList.add('hidden'));

    myAccountModal.addEventListener('click', (e) => {
        if (e.target === myAccountModal) myAccountModal.classList.add('hidden');
    });

    playerCardModal.addEventListener('click', (e) => {
        if (e.target === playerCardModal) playerCardModal.classList.add('hidden');
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
