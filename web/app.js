// CRC8 calculation (only for data bytes)
function calculateCRC8(data) {
    let crc = 0;
    for (let byte of data) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x80) ? (crc << 1) ^ 0x07 : crc << 1;
            crc &= 0xFF;
        }
    }
    return crc;
}

// Device protocol
const MAGIC_HEADER_WRITE = 0x67;
const MAGIC_HEADER_READ = 0x69;
const MAGIC_END = 0xFF;

class USBCDCController {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.state = {
            pixels: [
                { r: 0, g: 0, b: 0, brightness: 100 },
                { r: 0, g: 0, b: 0, brightness: 100 },
                { r: 0, g: 0, b: 0, brightness: 100 }
            ],
            buttons: [false, false, false]
        };
    }

    async connect() {
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });

            this.writer = this.port.writable.getWriter();
            this.reader = this.port.readable.getReader();

            this.updateUI('connected');
            this.startReadingData();
            this.log('Connected to device');
        } catch (error) {
            this.log(`Connection error: ${error}`);
            throw error;
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
        }
        if (this.writer) {
            await this.writer.close();
        }
        if (this.port) {
            await this.port.close();
        }
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.updateUI('disconnected');
        this.log('Disconnected from device');
    }

    async startReadingData() {
        if (!this.reader) return;

        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;

                this.processReadData(value);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.log(`Read error: ${error}`);
            }
        }
    }

    processReadData(data) {
        if (data.length < 4) return;

        const magicHeader = data[0];
        const buttonByte = data[1];
        const magicEnd = data[2];
        const crc = data[3];

        if (magicHeader !== MAGIC_HEADER_READ || magicEnd !== MAGIC_END) {
            this.log('Invalid frame format');
            return;
        }

        const crcData = [buttonByte];
        const calculatedCRC = calculateCRC8(crcData);
        if (calculatedCRC !== crc) {
            this.log(`CRC mismatch: expected ${calculatedCRC}, got ${crc}`);
            return;
        }

        this.state.buttons[0] = (buttonByte & 0x01) === 0x01;
        this.state.buttons[1] = (buttonByte & 0x02) === 0x02;
        this.state.buttons[2] = (buttonByte & 0x04) === 0x04;

        this.updateButtonUI();
        this.logRX(data);
    }

    async writePixels() {
        if (!this.writer) {
            this.log('Device not connected');
            return;
        }

        const dataBytes = [];
        for (let i = 0; i < 3; i++) {
            const pixel = this.state.pixels[i];
            const brightness = pixel.brightness / 100;
            
            dataBytes.push(Math.round(pixel.r * brightness));
            dataBytes.push(Math.round(pixel.g * brightness));
            dataBytes.push(Math.round(pixel.b * brightness));
        }

        const crc = calculateCRC8(dataBytes);
        const payload = [MAGIC_HEADER_WRITE, ...dataBytes, MAGIC_END, crc];

        try {
            await this.writer.write(new Uint8Array(payload));
            this.logTX(new Uint8Array(payload));
        } catch (error) {
            this.log(`Write error: ${error}`);
        }
    }

    setPixelColor(pixelIndex, r, g, b) {
        if (pixelIndex >= 0 && pixelIndex < 3) {
            this.state.pixels[pixelIndex].r = r;
            this.state.pixels[pixelIndex].g = g;
            this.state.pixels[pixelIndex].b = b;
            this.updatePixelUI(pixelIndex);
            this.writePixels();
        }
    }

    setPixelBrightness(pixelIndex, brightness) {
        if (pixelIndex >= 0 && pixelIndex < 3) {
            this.state.pixels[pixelIndex].brightness = brightness;
            this.updatePixelUI(pixelIndex);
            this.writePixels();
        }
    }

    updatePixelUI(pixelIndex) {
        const pixel = this.state.pixels[pixelIndex];
        const prefix = `p${pixelIndex + 1}`;

        const rVal = document.getElementById(`${prefix}-r-val`);
        const gVal = document.getElementById(`${prefix}-g-val`);
        const bVal = document.getElementById(`${prefix}-b-val`);
        const brightnessVal = document.getElementById(`${prefix}-brightness-val`);
        const preview = document.getElementById(`preview${pixelIndex + 1}`);
        const colorPicker = document.getElementById(`${prefix}-color`);

        if (rVal) rVal.textContent = pixel.r;
        if (gVal) gVal.textContent = pixel.g;
        if (bVal) bVal.textContent = pixel.b;
        if (brightnessVal) brightnessVal.textContent = `${pixel.brightness}%`;

        if (preview) {
            const brightness = pixel.brightness / 100;
            const r = Math.round(pixel.r * brightness);
            const g = Math.round(pixel.g * brightness);
            const b = Math.round(pixel.b * brightness);
            preview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }

        if (colorPicker) {
            const hex = '#' + 
                pixel.r.toString(16).padStart(2, '0') +
                pixel.g.toString(16).padStart(2, '0') +
                pixel.b.toString(16).padStart(2, '0');
            colorPicker.value = hex;
        }
    }

    updateUI(status) {
        const statusEl = document.getElementById('status');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');

        if (statusEl) {
            statusEl.textContent = status === 'connected' ? '● Connected' : '● Disconnected';
            statusEl.className = status === 'connected' ? 'status-connected' : 'status-disconnected';
        }

        if (connectBtn && disconnectBtn) {
            connectBtn.disabled = status === 'connected';
            disconnectBtn.disabled = status === 'disconnected';
        }
    }

    updateButtonUI() {
        for (let i = 0; i < 3; i++) {
            const btnEl = document.getElementById(`btn${i + 1}-status`);
            const isPressed = this.state.buttons[i];
            if (btnEl) {
                btnEl.className = `status-indicator ${isPressed ? 'pressed' : 'released'}`;
                btnEl.textContent = isPressed ? 'Pressed' : 'Released';
            }
        }
    }

    log(message) {
        const debugMsg = document.getElementById('debug-msg');
        if (debugMsg) {
            debugMsg.textContent = message;
        }
        console.log(message);
    }

    logTX(data) {
        const hex = Array.from(data).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const txEl = document.getElementById('debug-tx');
        if (txEl) txEl.textContent = hex;
    }

    logRX(data) {
        const hex = Array.from(data).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const rxEl = document.getElementById('debug-rx');
        if (rxEl) rxEl.textContent = hex;
    }
}

// UI Controller
class UIController {
    constructor(device) {
        this.device = device;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.handleConnect());
        }
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        }

        // Setup pixel 1, 2, 3
        for (let i = 0; i < 3; i++) {
            this.setupPixelControls(i);
        }
    }

    setupPixelControls(pixelIndex) {
        const prefix = `p${pixelIndex + 1}`;

        const rSlider = document.getElementById(`${prefix}-r-slider`);
        const gSlider = document.getElementById(`${prefix}-g-slider`);
        const bSlider = document.getElementById(`${prefix}-b-slider`);
        const colorPicker = document.getElementById(`${prefix}-color`);
        const brightnessSlider = document.getElementById(`${prefix}-brightness`);

        const updateColor = () => {
            const r = parseInt(rSlider?.value || 0);
            const g = parseInt(gSlider?.value || 0);
            const b = parseInt(bSlider?.value || 0);

            this.device.setPixelColor(pixelIndex, r, g, b);
        };

        const updateFromPicker = () => {
            if (!colorPicker) return;
            const color = colorPicker.value;
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);

            if (rSlider) rSlider.value = r;
            if (gSlider) gSlider.value = g;
            if (bSlider) bSlider.value = b;

            this.device.setPixelColor(pixelIndex, r, g, b);
        };

        const updateBrightness = () => {
            const brightness = parseInt(brightnessSlider?.value || 100);
            this.device.setPixelBrightness(pixelIndex, brightness);
        };

        if (rSlider) rSlider.addEventListener('input', updateColor);
        if (gSlider) gSlider.addEventListener('input', updateColor);
        if (bSlider) bSlider.addEventListener('input', updateColor);
        if (colorPicker) colorPicker.addEventListener('input', updateFromPicker);
        if (brightnessSlider) brightnessSlider.addEventListener('input', updateBrightness);

        // Initial UI update
        this.device.updatePixelUI(pixelIndex);
    }

    async handleConnect() {
        try {
            await this.device.connect();
        } catch (error) {
            console.error('Failed to connect:', error);
        }
    }

    async handleDisconnect() {
        try {
            await this.device.disconnect();
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const device = new USBCDCController();
    const ui = new UIController(device);
});