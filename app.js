/**
 * Data Storage Service (Abstracción para futura migración a nube)
 */
const StorageService = {
    key: 'pumpItUp_bookings',
    
    async getBookings() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : [];
    },

    async saveBooking(booking) {
        const bookings = await this.getBookings();
        if (booking.id) {
            // Update
            const index = bookings.findIndex(b => b.id === booking.id);
            if (index > -1) bookings[index] = booking;
        } else {
            // Create
            booking.id = Date.now().toString();
            bookings.push(booking);
        }
        localStorage.setItem(this.key, JSON.stringify(bookings));
        return booking;
    },

    async deleteBooking(id) {
        let bookings = await this.getBookings();
        bookings = bookings.filter(b => b.id !== id);
        localStorage.setItem(this.key, JSON.stringify(bookings));
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
        // Evitar el offset de timezone
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
        currentDateEl.textContent = selectedDate.toLocaleDateString('es-ES', options);
    }

    function renderWeekNav() {
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
        renderWeekNav();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekNav();
    });

    // Zoom Toggle
    zoomBtn.addEventListener('click', () => {
        scheduleContainerMain.classList.toggle('compact-view');
        const isCompact = scheduleContainerMain.classList.contains('compact-view');
        zoomBtn.textContent = isCompact ? '➕' : '🔍';
        zoomBtn.title = isCompact ? 'Expandir Vista' : 'Comprimir Vista';
    });

    // Generar Grid (24 horas)
    function generateGrid() {
        scheduleBody.innerHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            for (let min of ['00', '30']) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                
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
                    
                    const cellContent = document.createElement('div');
                    cellContent.className = 'cell-content empty';
                    cellContent.addEventListener('click', () => openModal(m, timeStr));
                    
                    machineCell.appendChild(cellContent);
                    row.appendChild(machineCell);
                }
                
                scheduleBody.appendChild(row);
            }
        }
    }

    // Calcular altura para el bloque
    function getBlockStyle(duration) {
        const slots = duration / 30;
        if (slots > 1) {
            return `height: calc(${slots * 100}% + ${slots - 1}px); z-index: 10;`;
        }
        return 'height: calc(100% - 4px);'; // 30 mins (default)
    }

    // Renderizar reservas
    async function renderBookings() {
        // Limpiar todas las reservas actuales del DOM
        document.querySelectorAll('.booking-block').forEach(el => el.remove());
        
        const allBookings = await StorageService.getBookings();
        const bookings = allBookings.filter(b => b.date === formatDate(selectedDate));
        
        bookings.forEach(booking => {
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

                // Click para editar
                block.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevenir que se abra el modal de creación
                    openModal(booking.machine, booking.time, booking);
                });

                cell.appendChild(block);
            }
        });
    }

    // Modal Handlers
    function openModal(machine, time, existingBooking = null) {
        inputMachine.value = machine;
        inputTime.value = time;
        inputDate.value = existingBooking ? existingBooking.date : formatDate(selectedDate);
        
        displayMachine.textContent = `Máquina ${machine}`;
        displayMachine.className = `info-text neon-text-${machine == 1 ? 'magenta' : machine == 2 ? 'cyan' : 'yellow'}`;
        displayTime.textContent = time;

        if (existingBooking) {
            inputId.value = existingBooking.id;
            inputName.value = existingBooking.name;
            document.getElementById('booking-duration').value = existingBooking.duration;
            deleteBtn.classList.remove('hidden');
        } else {
            inputId.value = '';
            inputName.value = '';
            document.getElementById('booking-duration').value = '30';
            deleteBtn.classList.add('hidden');
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

    // Form Submit (Guardar)
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
        renderBookings();
    });

    // Botón Eliminar
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
            await StorageService.deleteBooking(inputId.value);
            closeModal();
            renderBookings();
        }
    });

    // Inicializar
    updateDateDisplay();
    renderWeekNav();
    generateGrid();
    renderBookings();
    initPWA();
});

// PWA Install Logic
let deferredPrompt;
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registrado:', reg.scope))
            .catch(err => console.log('Error SW:', err));
    }

    const installBtn = document.getElementById('install-btn');
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
