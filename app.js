import { db, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from './firebase-config.js';

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
    
    // Header Logo element
    const headerLogo = document.querySelector('.logo');

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
        
        header.style.gridTemplateColumns = `80px repeat(${cols > 0 ? cols : 1}, 1fr)`;
        
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
                        // No mostrar rechazadas o mostrarlas atenuadas
                        // return; 
                    }

                    block.style.cssText = getBlockStyle(booking.duration);
                    
                    const paidIcon = booking.paid ? '<span title="Pagado">💰</span> ' : '';
                    
                    block.innerHTML = `
                        <div class="booking-name">${paidIcon}${booking.name}</div>
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
                    const colorIndex = (parseInt(booking.machine) % 3) || 3;
                    item.className = `agenda-item machine-${colorIndex}`;
                    
                    if (booking.status === 'pending') {
                        item.classList.add('pending-agenda');
                    } else if (booking.status === 'rejected') {
                        item.classList.add('rejected-agenda');
                    }
                    
                    const mName = getMachineName(booking.machine);
                    const paidIcon = booking.paid ? '<span title="Pagado">💰</span> ' : '';
                    
                    item.innerHTML = `
                        <div class="agenda-time">🕒 ${booking.time}</div>
                        <div class="agenda-info">
                            <strong>[${mName}]</strong> ${paidIcon}${booking.name} 
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
            duration: parseInt(duration),
            status: 'approved',
            paid: inputPaid.checked
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
            duration: parseInt(duration),
            status: 'approved',
            paid: inputPaid.checked
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

    // ==========================================
    // SETTINGS MODAL LOGIC
    // ==========================================
    settingsBtn.addEventListener('click', () => {
        document.getElementById('settings-motd').value = SettingsService.settings.motd || '';
        document.getElementById('settings-logo-url').value = SettingsService.settings.logo || '';
        
        renderMachinesListForSettings();
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

    addMachineBtn.addEventListener('click', () => {
        const newId = Date.now().toString();
        const container = document.createElement('div');
        container.className = 'machine-setting-item';
        container.dataset.id = newId;
        container.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <input type="text" class="machine-name-input" placeholder="Nombre Máquina" value="Nueva Máquina">
                <button type="button" class="btn btn-danger btn-sm delete-machine-btn">🗑️</button>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <img class="machine-img-preview" src="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px; display: none;">
                <input type="url" class="machine-url-input" placeholder="URL de la imagen" style="flex:1; padding:0.5rem; background:rgba(0,0,0,0.5); border:1px solid var(--border-color); color:white; border-radius:4px; font-size:0.8rem;">
            </div>
            <hr style="margin: 10px 0; border-color: #333;">
        `;
        
        container.querySelector('.delete-machine-btn').addEventListener('click', () => container.remove());
        
        container.querySelector('.machine-url-input').addEventListener('input', function() {
            const img = container.querySelector('.machine-img-preview');
            img.src = this.value;
            img.style.display = this.value ? 'block' : 'none';
        });

        machinesListContainer.appendChild(container);
    });

    function renderMachinesListForSettings() {
        machinesListContainer.innerHTML = '';
        SettingsService.settings.machines.forEach(m => {
            const container = document.createElement('div');
            container.className = 'machine-setting-item';
            container.dataset.id = m.id;
            
            container.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                    <input type="text" class="machine-name-input" placeholder="Nombre Máquina" value="${m.name}">
                    <button type="button" class="btn btn-danger btn-sm delete-machine-btn">🗑️</button>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <img class="machine-img-preview" src="${m.image || ''}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px; ${m.image ? 'display:block;' : 'display:none;'}">
                    <input type="url" class="machine-url-input" placeholder="URL de la imagen" value="${m.image || ''}" style="flex:1; padding:0.5rem; background:rgba(0,0,0,0.5); border:1px solid var(--border-color); color:white; border-radius:4px; font-size:0.8rem;">
                </div>
                <hr style="margin: 10px 0; border-color: #333;">
            `;
            
            container.querySelector('.delete-machine-btn').addEventListener('click', () => container.remove());
            
            container.querySelector('.machine-url-input').addEventListener('input', function() {
                const img = container.querySelector('.machine-img-preview');
                img.src = this.value;
                img.style.display = this.value ? 'block' : 'none';
            });

            machinesListContainer.appendChild(container);
        });
    }

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
                machines: newMachines
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
