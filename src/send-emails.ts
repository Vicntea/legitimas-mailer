
import "dotenv/config";

import nodemailer from "nodemailer";
import { parse } from "csv-parse/sync";
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { generateQr } from "./generate-qr.js";
import { createEmailTemplate } from "./email-template.js";

interface Participant {
  nombre: string;
  apellido: string;
  email: string;
  edad: string;
  genero: string;
  uuid: string;
  presente: string;
}

const ROOT = process.cwd();

const CSV_PATH = resolve(ROOT, "data/test.csv");
const POSTER_PATH = resolve(ROOT, "public/legitimas-afiche.png");
const SENT_PATH = resolve(ROOT, "data/enviados.json");

const TEST_MODE = process.env.TEST_MODE !== "false";
const TEST_EMAIL = process.env.TEST_EMAIL;

async function main(): Promise<void> {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    EMAIL_REPLY_TO,
  } = process.env;

  // Validar configuración
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    throw new Error("Faltan variables SMTP en el archivo .env");
  }

  if (TEST_MODE && !TEST_EMAIL) {
    throw new Error("Debes configurar TEST_EMAIL para las pruebas.");
  }

  // Comprobar archivos
  if (!existsSync(CSV_PATH)) {
    throw new Error(`No se encontró el CSV: ${CSV_PATH}`);
  }

  if (!existsSync(POSTER_PATH)) {
    throw new Error(`No se encontró el afiche: ${POSTER_PATH}`);
  }

  // Leer participantes
  const csvContent = readFileSync(CSV_PATH, "utf-8");

  const participants: Participant[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (participants.length === 0) {
    throw new Error("El CSV no contiene participantes.");
  }

  // Leer UUID enviados anteriormente
  const sent: string[] = existsSync(SENT_PATH)
    ? JSON.parse(readFileSync(SENT_PATH, "utf-8"))
    : [];

  // Crear transporte SMTP
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.verify();

  console.log("Conexión SMTP verificada.");
  console.log(`Participantes encontrados: ${participants.length}`);
  console.log(`Modo de prueba: ${TEST_MODE ? "ACTIVADO" : "DESACTIVADO"}`);

  let accepted = 0;
  let skipped = 0;
  let failed = 0;

  for (const participant of participants) {
    const {
      nombre,
      apellido,
      email,
      uuid,
    } = participant;

    // Validaciones
    if (!nombre || !apellido || !email || !uuid) {
      console.log("Participante incompleto. Se omite.");
      skipped++;
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log(`Email inválido: ${email}`);
      skipped++;
      continue;
    }

    if (sent.includes(uuid)) {
      console.log(`Ya enviado anteriormente: ${email}`);
      skipped++;
      continue;
    }

    try {
      console.log(`Preparando invitación para ${nombre} ${apellido}...`);

      // Generar QR individual
      const qr = await generateQr(uuid);

      // Determinar destinatario
      const destination = TEST_MODE ? TEST_EMAIL! : email;

      // Enviar correo
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
        to: destination,
        subject: "Tu invitación personal a LEGÍTIMAS",
        html: createEmailTemplate({
          nombre,
          apellido,
          uuid,
        }),
        attachments: [
          {
            filename: "legitimas-afiche.png",
            path: POSTER_PATH,
            cid: "poster",
          },
          {
            filename: `entrada-${uuid}.png`,
            content: qr,
            contentType: "image/png",
            cid: "ticket-qr",
          },
        ],
      });

      console.log(`SMTP aceptó el mensaje: ${info.messageId}`);

      // Registrar como enviado solamente en producción
      if (!TEST_MODE) {
        sent.push(uuid);

        writeFileSync(
          SENT_PATH,
          JSON.stringify(sent, null, 2),
          "utf-8",
        );
      }

      accepted++;

      if (TEST_MODE) {
        console.log(`Prueba enviada a ${destination}.`);
        break;
      }

      // Pausa de 1 segundo entre correos
      await new Promise((resolve) => setTimeout(resolve, 1000));

    } catch (error) {
      failed++;
      console.error(`Error enviando invitación a ${email}:`, error);
    }
  }

  console.log("\n========== RESUMEN ==========");
  console.log(`Aceptados por SMTP: ${accepted}`);
  console.log(`Omitidos: ${skipped}`);
  console.log(`Fallidos: ${failed}`);
  console.log("=============================");
}

main().catch((error: unknown) => {
  console.error("Error general:", error);
  process.exitCode = 1;
});
