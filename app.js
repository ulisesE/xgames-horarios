import { db, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from './firebase-config.js';

/**
 * Data Storage Service (Firebase)
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
    const scheduleContainerMain = document.getElementById('schedule-container-main');
    const dailyNavigator = document.getElementById('daily-navigator');
    
    // View controls
    const viewDailyBtn = document.getElementById('view-daily-btn');
    const viewWeeklyBtn = document.getElementById('view-weekly-btn');
    let currentView = 'daily'; // 'daily' or 'weekly'
    
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
    const deleteBtn = document.getElementById('delete-btn');

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
        const day = d.getDay() || 7; // Lunes es 1, Domingo es 7
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
            // Seleccionar el mismo día de la semana anterior
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
            // Seleccionar el mismo día de la semana siguiente
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

    // Generar Grid Diario (12 a 23:30)
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

                // 3 Máquinas
                for (let m = 1; m <= 3; m++) {
                    const machineCell = document.createElement('div');
                    machineCell.className = 'machine-cell';
                    machineCell.dataset.machine = m;
                    machineCell.dataset.time = timeStr;
                    machineCell.dataset.date = formatDate(selectedDate);
                    
                    const cellContent = document.createElement('div');
                    cellContent.className = 'cell-content empty';
                    cellContent.addEventListener('click', () => openModal(m, timeStr, formatDate(selectedDate)));
                    
                    machineCell.appendChild(cellContent);
                    row.appendChild(machineCell);
                }
                
                scheduleBody.appendChild(row);
            }
        }
    }

    // Generar Grid Semanal (Agenda)
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
        // Limpiar reservas
        document.querySelectorAll('.booking-block').forEach(el => el.remove());
        document.querySelectorAll('.weekly-booking-chip').forEach(el => el.remove());
        
        const allBookings = await StorageService.getBookings();
        
        if (currentView === 'daily') {
            const bookings = allBookings.filter(b => b.date === formatDate(selectedDate));
            
            bookings.forEach(booking => {
                // Ensure legacy times work or match 12-hour format properly.
                // Assuming data will be saved with 12-hour format moving forward.
                const cellSelector = `.machine-cell[data-machine="${booking.machine}"][data-time="${booking.time}"]`;
                const cell = document.querySelector(cellSelector);
                
                if (cell) {
                    const block = document.createElement('div');
                    block.className = `booking-block machine-${booking.machine}`;
                    block.style.cssText = getBlockStyle(booking.duration);
                    
                    block.innerHTML = `
                        <div class="booking-name">${booking.name}</div>
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
            // Weekly View (Agenda)
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
                    if (emptyMsg) emptyMsg.remove();
                    
                    const item = document.createElement('div');
                    item.className = `agenda-item machine-${booking.machine}`;
                    item.innerHTML = `
                        <div class="agenda-time">🕒 ${booking.time}</div>
                        <div class="agenda-info">
                            <strong>[M${booking.machine}]</strong> ${booking.name} 
                            <span class="agenda-duration">(${booking.duration} min)</span>
                        </div>
                    `;
                    
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(booking.machine, booking.time, booking.date, booking);
                    });
                    
                    listContainer.appendChild(item);
                }
            });
        }
    }

    // Modal Handlers
    function openModal(machine, time, date, existingBooking = null) {
        inputMachine.value = machine;
        inputTime.value = time;
        inputDate.value = date;
        
        displayMachine.textContent = `Máquina ${machine}`;
        displayMachine.className = `info-text neon-text-${machine == 1 ? 'magenta' : machine == 2 ? 'cyan' : 'yellow'}`;
        displayTime.textContent = time + ' | ' + date;

        if (existingBooking) {
            inputId.value = existingBooking.id;
            inputName.value = existingBooking.name;
            inputMachine.value = existingBooking.machine; // Just in case it's different from the column clicked
            document.getElementById('booking-duration').value = existingBooking.duration;
            deleteBtn.classList.remove('hidden');
            
            // Allow changing machine when editing
            displayMachine.innerHTML = `
                <select id="edit-machine-select" class="custom-select" style="margin-top:5px; padding: 5px;">
                    <option value="1" ${existingBooking.machine == 1 ? 'selected' : ''}>Máquina 1</option>
                    <option value="2" ${existingBooking.machine == 2 ? 'selected' : ''}>Máquina 2</option>
                    <option value="3" ${existingBooking.machine == 3 ? 'selected' : ''}>Máquina 3</option>
                </select>
            `;
            document.getElementById('edit-machine-select').addEventListener('change', (e) => {
                inputMachine.value = e.target.value;
            });

        } else {
            inputId.value = '';
            inputName.value = '';
            document.getElementById('booking-duration').value = '30';
            deleteBtn.classList.add('hidden');
            
            // Allow changing machine when creating from weekly view
            if (currentView === 'weekly') {
                displayMachine.innerHTML = `
                    <select id="create-machine-select" class="custom-select" style="margin-top:5px; padding: 5px;">
                        <option value="1" ${machine == 1 ? 'selected' : ''}>Máquina 1</option>
                        <option value="2" ${machine == 2 ? 'selected' : ''}>Máquina 2</option>
                        <option value="3" ${machine == 3 ? 'selected' : ''}>Máquina 3</option>
                    </select>
                `;
                document.getElementById('create-machine-select').addEventListener('change', (e) => {
                    inputMachine.value = e.target.value;
                });
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

    // Form Submit
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = document.getElementById('booking-duration').value;
        
        const booking = {
            id: inputId.value || undefined,
            machine: inputMachine.value,
            time: inputTime.value,
            date: inputDate.value,
            name: inputName.value,
            duration: parseInt(duration)
        };

        await StorageService.saveBooking(booking);
        closeModal();
    });

    // Botón Eliminar
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
            await StorageService.deleteBooking(inputId.value);
            closeModal();
        }
    });

    // Inicializar app
    updateDateDisplay();
    renderWeekNav();
    generateDailyGrid();
    
    // Conectar a Firebase y renderizar
    StorageService.initRealtimeUpdates(() => {
        renderBookings();
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
