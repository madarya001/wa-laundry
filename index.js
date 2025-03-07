const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

let qrCodeData = null;
let isConnected = false;

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

// Generate QR Code jika belum login
client.on('qr', async qr => {
    qrCodeData = await qrcode.toDataURL(qr);
    isConnected = false;
});

// Jika sudah terhubung
client.on('ready', () => {
    console.log('WhatsApp Bot siap digunakan!');
    qrCodeData = null;
    isConnected = true;
});

// API untuk mendapatkan QR Code
app.get('/get-qr', (req, res) => {
    res.json({ status: !qrCodeData, qr: qrCodeData });
});

// API untuk memeriksa status koneksi
app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

// API untuk logout dan restart client
app.get('/logout', async (req, res) => {
    try {
        await client.logout();
        isConnected = false;
        qrCodeData = null;

        console.log("Restarting WhatsApp client...");
        client.destroy();
        setTimeout(() => {
            client.initialize();
        }, 3000);

        res.json({ status: true, message: "Berhasil logout, QR akan muncul lagi dalam beberapa detik." });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal logout", error: error.message });
    }
});

// API untuk mengirim pesan WhatsApp (text & media)
app.post('/send-message', async (req, res) => {
    const { number, message, mediaUrl } = req.body;

    if (!number) {
        return res.status(400).json({ status: false, message: 'Nomor WA harus diisi!' });
    }

    try {
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

        if (mediaUrl) {
            // Kirim media (gambar/doc) + optional teks
            const media = await MessageMedia.fromUrl(mediaUrl);
            await client.sendMessage(formattedNumber, media, { caption: message || "" });
        } else {
            // Kirim hanya teks
            await client.sendMessage(formattedNumber, message);
        }

        res.json({ status: true, message: 'Pesan berhasil dikirim!' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengirim pesan', error: error.message });
    }
});

// Jalankan server Express
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Jalankan WhatsApp client
client.initialize();
