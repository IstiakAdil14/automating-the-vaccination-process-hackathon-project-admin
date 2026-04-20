# 🛠️ Vaccination Admin — Government Authority Dashboard

Part of the [Vaccination Management System](https://github.com/IstiakAdil14/automating-the-vaccination-process-hackathon-project-admin).

Runs on **port 3001** locally. Handles analytics, center management, staff accounts, supply chain, and fraud detection.

---

## 🚀 Getting Started

```bash
cp .env.example .env.local   # fill in your values
npm install
npm run dev                  # http://localhost:3001
```

---

## ✨ Features

- Advanced analytics dashboard with charts
- Vaccination heatmaps (geo-based)
- Center CRUD + geo-location management
- Staff account creation & center assignment
- Supply chain & inventory monitoring
- Fraud detection & audit logs
- Nationwide broadcast notifications
- WebAuthn (passkey) support

---

## 🔑 Environment Variables

```env
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3001
MONGODB_URI=
GMAIL_USER=
GMAIL_APP_PASSWORD=
OPENAI_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
CRON_SECRET=
```

See `.env.example` for full reference.

---

## 🧪 Testing

```bash
npm run test        # Jest unit tests
npm run test:e2e    # Playwright E2E
```

---

## 🚀 Deployment

Deploy to Vercel as a standalone project. Set all env vars in the Vercel dashboard.

---

## 📄 License

MIT
