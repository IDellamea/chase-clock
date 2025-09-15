// Configuración de zona horaria para Argentina (GMT-3)
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

class DVRTimeCalculator {
    constructor() {
        this.currentServerTime = null;
        this.serverTimeOffset = 0;
        this.initializeElements();
        this.setupEventListeners();
        this.syncWithServer();
        this.startClock();
        this.updateCalculations();
    }

    initializeElements() {
        this.dvrDateTimeInput = document.getElementById('dvr-datetime');
        this.eventDateTimeInput = document.getElementById('event-datetime');
        this.currentTimeDisplay = document.getElementById('current-time');
        this.desfasajeDisplay = document.getElementById('desfasaje');
        this.statusDisplay = document.getElementById('status');
        this.timeDiffDisplay = document.getElementById('time-diff');
        this.dvrSearchTimeDisplay = document.getElementById('dvr-search-time');
    }

    setupEventListeners() {
        this.dvrDateTimeInput.addEventListener('input', () => this.updateCalculations());
        this.eventDateTimeInput.addEventListener('input', () => this.updateCalculations());
        
        // Resincronizar con el servidor cada 5 minutos
        setInterval(() => this.syncWithServer(), 5 * 60 * 1000);
    }

    async syncWithServer() {
        try {
            const response = await fetch('/api/current-time');
            if (response.ok) {
                const serverTime = await response.json();
                this.currentServerTime = new Date(serverTime.timestamp);
                this.serverTimeOffset = Date.now() - serverTime.timestamp;
                
                // Mostrar notificación de sincronización exitosa (solo la primera vez)
                if (!this.hasShownSyncNotification) {
                    showNotification('✅ Sincronizado con el servidor', 'success');
                    this.hasShownSyncNotification = true;
                }
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.warn('Error al sincronizar con el servidor:', error);
            showNotification('⚠️ Usando hora local del navegador', 'info');
            // Fallback a hora local
            this.currentServerTime = null;
            this.serverTimeOffset = 0;
        }
    }

    startClock() {
        this.updateCurrentTime();
        // Actualizar cada minuto (60000 ms) en lugar de cada segundo
        setInterval(() => this.updateCurrentTime(), 60000);
    }

    updateCurrentTime() {
        const now = new Date();
        const argentinaTime = new Intl.DateTimeFormat('es-AR', {
            timeZone: ARGENTINA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(now);

        const formattedTime = `${argentinaTime.find(part => part.type === 'day').value}/${argentinaTime.find(part => part.type === 'month').value}/${argentinaTime.find(part => part.type === 'year').value} ${argentinaTime.find(part => part.type === 'hour').value}:${argentinaTime.find(part => part.type === 'minute').value}`;
        
        this.currentTimeDisplay.textContent = formattedTime;
        this.updateCalculations();
    }

    getCurrentArgentinaTime() {
        let now;
        
        if (this.currentServerTime) {
            // Usar tiempo del servidor ajustado
            now = new Date(Date.now() - this.serverTimeOffset);
        } else {
            // Fallback a tiempo local del navegador
            now = new Date();
        }
        
        // Convertir a hora de Argentina (GMT-3)
        const argentinaTime = new Date(now.toLocaleString("en-US", {timeZone: ARGENTINA_TIMEZONE}));
        return argentinaTime;
    }

    calculateTimeDifference(date1, date2) {
        const diffMs = Math.abs(date2.getTime() - date1.getTime());
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);

        const hours = diffHours;
        const minutes = diffMinutes % 60;
        const seconds = diffSeconds % 60;

        return {
            totalMs: diffMs,
            hours,
            minutes,
            seconds,
            isAhead: date1.getTime() > date2.getTime()
        };
    }

    formatTimeDifference(diff) {
        if (diff.hours >= 24) {
            const days = Math.floor(diff.hours / 24);
            const remainingHours = diff.hours % 24;
            
            let result = days === 1 ? '1 día' : `${days} días`;
            
            if (remainingHours > 0) {
                result += ` ${remainingHours}h`;
            }
            
            if (diff.minutes > 0) {
                result += ` ${diff.minutes}m`;
            }
            
            return result;
        } else {
            return `${diff.hours}h ${diff.minutes}m`;
        }
    }

    updateCalculations() {
        this.updateDesfasaje();
        this.updateDVRSearchTime();
    }

    updateDesfasaje() {
        const dvrDateTimeValue = this.dvrDateTimeInput.value;
        
        if (!dvrDateTimeValue) {
            this.statusDisplay.textContent = '-';
            this.statusDisplay.className = 'status';
            this.timeDiffDisplay.textContent = '0h 0m';
            return;
        }

        const dvrTime = new Date(dvrDateTimeValue);
        const currentTime = this.getCurrentArgentinaTime();
        const diff = this.calculateTimeDifference(dvrTime, currentTime);

        // Actualizar el texto de diferencia
        this.timeDiffDisplay.textContent = this.formatTimeDifference(diff);

        // Determinar el estado y aplicar estilos
        if (diff.totalMs < 60000) { // Menos de 1 minuto
            this.statusDisplay.textContent = 'Sincronizado';
            this.statusDisplay.className = 'status sincronizado';
        } else if (diff.isAhead) {
            this.statusDisplay.textContent = 'Adelantado';
            this.statusDisplay.className = 'status adelantado';
        } else {
            this.statusDisplay.textContent = 'Atrasado';
            this.statusDisplay.className = 'status atrasado';
        }

        // Agregar animación
        this.desfasajeDisplay.classList.add('success');
        setTimeout(() => {
            this.desfasajeDisplay.classList.remove('success');
        }, 500);
    }

    updateDVRSearchTime() {
        const eventDateTimeValue = this.eventDateTimeInput.value;
        const dvrDateTimeValue = this.dvrDateTimeInput.value;

        if (!eventDateTimeValue) {
            this.dvrSearchTimeDisplay.textContent = 'Selecciona la fecha y hora del hecho';
            return;
        }

        if (!dvrDateTimeValue) {
            this.dvrSearchTimeDisplay.textContent = 'Primero configura la hora del DVR';
            return;
        }

        const eventTime = new Date(eventDateTimeValue);
        const dvrTime = new Date(dvrDateTimeValue);
        const currentTime = this.getCurrentArgentinaTime();

        // Calcular el desfasaje del DVR
        const dvrOffset = dvrTime.getTime() - currentTime.getTime();

        // Aplicar el desfasaje a la hora del evento para obtener la hora que se debe buscar en el DVR
        const searchTimeInDVR = new Date(eventTime.getTime() + dvrOffset);

        // Formatear la fecha para mostrar
        const formattedSearchTime = this.formatDateForDisplay(searchTimeInDVR);
        
        this.dvrSearchTimeDisplay.innerHTML = `
            <div style="font-size: 1.1em; margin-bottom: 0.5rem;">
                📅 ${formattedSearchTime.date}
            </div>
            <div style="font-size: 1.3em; font-weight: 700;">
                🕒 ${formattedSearchTime.time}
            </div>
        `;

        // Agregar animación
        this.dvrSearchTimeDisplay.classList.add('success');
        setTimeout(() => {
            this.dvrSearchTimeDisplay.classList.remove('success');
        }, 500);
    }

    formatDateForDisplay(date) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        const formatted = new Intl.DateTimeFormat('es-AR', options).formatToParts(date);
        
        const dateStr = `${formatted.find(part => part.type === 'day').value}/${formatted.find(part => part.type === 'month').value}/${formatted.find(part => part.type === 'year').value}`;
        const timeStr = `${formatted.find(part => part.type === 'hour').value}:${formatted.find(part => part.type === 'minute').value}`;

        return {
            date: dateStr,
            time: timeStr
        };
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Función para copiar al portapapeles
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('¡Hora copiada al portapapeles!', 'success');
        }).catch(() => {
            showNotification('Error al copiar', 'error');
        });
    } else {
        // Fallback para navegadores más antiguos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('¡Hora copiada al portapapeles!', 'success');
        } catch (err) {
            showNotification('Error al copiar', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Agregar funcionalidad de clic para copiar la hora de búsqueda del DVR
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new DVRTimeCalculator();
    
    // Hacer clic en el resultado para copiarlo
    document.getElementById('dvr-search-time').addEventListener('click', function() {
        const text = this.textContent.trim();
        if (text && !text.includes('Selecciona') && !text.includes('Primero')) {
            copyToClipboard(text);
        }
    });

    // Agregar tooltips informativos
    const tooltips = [
        {
            element: document.getElementById('dvr-datetime'),
            message: 'Ingresa la fecha y hora que muestra actualmente tu DVR'
        },
        {
            element: document.getElementById('event-datetime'),
            message: 'Ingresa la fecha y hora real cuando ocurrió el evento que buscas'
        },
        {
            element: document.getElementById('dvr-search-time'),
            message: 'Haz clic para copiar esta hora al portapapeles'
        }
    ];

    tooltips.forEach(tooltip => {
        tooltip.element.title = tooltip.message;
    });

    // Mensaje de bienvenida
    setTimeout(() => {
        showNotification('¡Bienvenido a la Calculadora de Hora DVR!', 'success');
    }, 1000);
});
