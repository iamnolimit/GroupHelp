# Deploy GroupHelp ke Vercel 🚀

Panduan lengkap untuk deploy bot Telegram GroupHelp ke Vercel.

## 📋 Prasyarat

1. Akun Vercel (daftar di [vercel.com](https://vercel.com))
2. Telegram Bot Token (dari [@BotFather](https://t.me/botfather))
3. Vercel CLI (opsional, untuk deploy dari terminal)

## 🔧 Cara Deploy

### Metode 1: Deploy via Vercel Dashboard (Recommended)

1. **Push project ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Prepare for Vercel deployment"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import project di Vercel**
   - Buka [vercel.com/new](https://vercel.com/new)
   - Klik "Import Git Repository"
   - Pilih repository GroupHelp Anda
   - Klik "Import"

3. **Konfigurasi Environment Variables**
   
   Di halaman konfigurasi project Vercel, tambahkan:
   
   - `BOT_TOKEN`: Token bot Telegram Anda
   - `WEBHOOK_URL`: `https://your-app.vercel.app/api/webhook` (ganti dengan domain Vercel Anda)
   
   > **Note:** URL webhook akan tersedia setelah deploy pertama

4. **Deploy**
   - Klik "Deploy"
   - Tunggu hingga deployment selesai

5. **Setup Webhook**
   
   Setelah deploy selesai, jalankan script setup webhook:
   ```bash
   node setup-webhook.js https://your-app.vercel.app/api/webhook
   ```
   
   Atau setup manual via browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhook
   ```

### Metode 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login ke Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Ikuti prompt untuk konfigurasi project

4. **Set Environment Variables**
   ```bash
   vercel env add BOT_TOKEN
   vercel env add WEBHOOK_URL
   ```

5. **Deploy Production**
   ```bash
   vercel --prod
   ```

6. **Setup Webhook**
   ```bash
   node setup-webhook.js https://your-app.vercel.app/api/webhook
   ```

## ⚙️ Konfigurasi Environment Variables

Tambahkan environment variables berikut di Vercel Dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Token bot dari BotFather | `8472423958:AAGuu-pAAqIAvBhMV8MKZVSszMhT76vqKuI` |
| `WEBHOOK_URL` | URL webhook lengkap | `https://your-app.vercel.app/api/webhook` |

**Cara menambahkan:**
1. Buka project di Vercel Dashboard
2. Settings → Environment Variables
3. Tambahkan variable
4. Redeploy project

## 🔍 Verifikasi Deployment

1. **Cek status webhook:**
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```

2. **Test bot:**
   - Kirim pesan ke bot Anda di Telegram
   - Bot harus merespons

## 📊 Monitoring

- **Vercel Logs:** Dashboard → Project → Deployments → View Function Logs
- **Telegram Bot Info:** `https://api.telegram.org/bot<TOKEN>/getMe`

## ⚠️ Penting!

1. **Database:**
   - File-based database (`database/`) tidak persisten di Vercel
   - Pertimbangkan menggunakan database eksternal (MongoDB, PostgreSQL, dll.)

2. **Vercel Limits:**
   - Serverless function timeout: 10 detik (Hobby), 60 detik (Pro)
   - Function size limit: 50MB

3. **Security:**
   - **JANGAN** push file `config.json` dengan bot token ke Git
   - Gunakan environment variables untuk semua credential
   - Tambahkan `config.json` ke `.gitignore` jika berisi token

## 🛠️ Troubleshooting

### Bot tidak merespons
1. Cek webhook info: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Cek Vercel function logs
3. Pastikan `WEBHOOK_URL` benar

### Error "Database not found"
- Vercel tidak mendukung persistent file storage
- Gunakan external database atau cloud storage

### Timeout errors
- Optimalkan code untuk response cepat
- Pertimbangkan upgrade ke Vercel Pro untuk timeout lebih lama

## 📚 Dokumentasi

- [Vercel Documentation](https://vercel.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [GroupHelp Documentation](docs/)

## 🔄 Update Bot

Setiap push ke branch `main` akan otomatis trigger deployment baru jika menggunakan GitHub integration.

Manual redeploy via CLI:
```bash
vercel --prod
```

## 💡 Tips

1. Gunakan Vercel's preview deployments untuk testing
2. Set up different environments (development, staging, production)
3. Monitor function execution time untuk optimize performance
4. Consider using Edge Functions untuk response lebih cepat

---

**Need help?** Check [Vercel Support](https://vercel.com/support) atau buat issue di repository.
