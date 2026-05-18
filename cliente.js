import { db, collection, onSnapshot, doc, getDoc, setDoc, addDoc } from './firebase-config.js';

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
        const booking = {
            machine: clientMachine.value,
            time: clientTime.value,
            date: clientDate.value,
            name: AuthService.currentUser.username, // Usa el nombre logueado
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
        
        header.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, 1fr)`;
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
                    
                    if (booking.status === 'pending') {
                        block.classList.add('booking-pending');
                    } else if (booking.status === 'rejected') {
                        block.classList.add('booking-rejected');
                        // Opcional: no renderizar las rechazadas
                        // return; 
                    }

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
                    
                    if (booking.status === 'pending') {
                        item.classList.add('pending-agenda');
                    } else if (booking.status === 'rejected') {
                        item.classList.add('rejected-agenda');
                    }

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
