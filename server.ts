import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Lazy initialization of AI client to avoid crashes if API key is missing on startup
  let aiClient: any = null;
  const getAI = () => {
    if (!aiClient) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
      }
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  // API routes go here FIRST
  app.post('/api/extract', async (req: Request, res: Response) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Ekstrak data transaksi keuangan (bisa berupa pemasukan, pengeluaran, atau transfer antar dompet) dari kalimat berikut dalam bahasa Indonesia: "${text}"`,
        config: {
          systemInstruction: "Anda adalah asisten pencatatan keuangan pribadi pintar dalam bahasa Indonesia. Ekstrak informasi dari teks pengguna dengan tepat ke dalam skema JSON yang diminta.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: {
                type: Type.NUMBER,
                description: "Jumlah uang dalam angka (misal: 25000 untuk 25 ribu).",
              },
              description: {
                type: Type.STRING,
                description: "Keterangan singkat transaksi (misal: Katsu, atau Tarik Tunai).",
              },
              category: {
                type: Type.STRING,
                description: "Kategori transaksi. Untuk expense/income pilih: Makanan, Transportasi, dsb. Untuk transfer antar dompet, gunakan 'Transfer'.",
              },
              type: {
                type: Type.STRING,
                enum: ["expense", "income", "transfer"],
                description: "Jenis transaksi. 'expense' untuk pengeluaran, 'income' untuk pemasukan, 'transfer' untuk perpindahan dana antar dompet milik pengguna.",
              },
              wallet: {
                type: Type.STRING,
                description: "Dompet yang digunakan (untuk expense/income). Jika tidak disebutkan, gunakan 'Tunai'.",
              },
              source_wallet: {
                type: Type.STRING,
                description: "Dompet ASAL untuk tipe 'transfer' (uang diambil dari mana). Gunakan nama dompet seperti 'Tunai', 'Transfer Bank', 'GOPAY', dll.",
              },
              destination_wallet: {
                type: Type.STRING,
                description: "Dompet TUJUAN untuk tipe 'transfer' (uang dipindah ke mana). Gunakan nama dompet umum.",
              },
            },
            required: ["amount", "description", "category", "type"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No response text from AI');
      }
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error('Extraction error:', error);
      res.status(500).json({ error: error.message || 'Failed to extract data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
