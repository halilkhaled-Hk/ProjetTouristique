const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const MAIL_HOST = process.env.MAIL_HOST || '';
const MAIL_PORT = Number(process.env.MAIL_PORT || 587);
const MAIL_USER = process.env.MAIL_USER || '';
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Prestige Touristique <no-reply@touristique-express.com>';

const transporter =
  MAIL_HOST && MAIL_USER && MAIL_PASSWORD
    ? nodemailer.createTransport({
        host: MAIL_HOST,
        port: MAIL_PORT,
        secure: MAIL_PORT === 465,
        auth: {
          user: MAIL_USER,
          pass: MAIL_PASSWORD
        }
      })
    : null;

const logoPath = path.join(__dirname, '..', '..', 'image', '777-266x266.png');

const formatDate = (value) => new Date(value).toLocaleDateString('fr-FR');
const formatTime = (value) => value?.toString().slice(0, 5);

const generateTicketPdf = ({ reservation }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A6', margin: 24 });
      const chunks = [];
      doc.on('data', (data) => chunks.push(data));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width / 2 - 30, 10, { width: 60 });
      }

      doc.moveDown(3);
      doc.fontSize(12).font('Helvetica-Bold').text('Touristique Express Prestige 777', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Une autre vision du transport', { align: 'center' });
      doc.moveDown();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`#${reservation.ticket_code}`, { align: 'left' })
        .moveUp()
        .text(formatDate(reservation.travel_date), { align: 'right' });

      doc.moveDown(0.5);
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`${reservation.origin} → ${reservation.destination}`, { align: 'center' });

      doc.fontSize(12).text(`Départ : ${formatTime(reservation.departure_time)} • ${formatDate(reservation.travel_date)}`, {
        align: 'center'
      });
      doc.text(`Passager : ${reservation.first_name} ${reservation.last_name}`, { align: 'center' });
      doc.moveDown();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Détails billet', { underline: true })
        .moveDown(0.5);

      doc.font('Helvetica');
      const detailLines = [
        ['Référence', reservation.ticket_code],
        ['Mode de paiement', reservation.payment_method],
        ['Montant', `${Number(reservation.price_paid).toLocaleString('fr-FR')} FCFA`],
        ['Places restantes', `${reservation.seats_available} / ${reservation.seats_total}`],
        ['Date de réservation', formatDate(reservation.created_at)]
      ];

      detailLines.forEach(([label, value]) => {
        doc.text(`${label} : ${value}`);
      });

      doc.moveDown();
      doc.fontSize(9).text('Conditions générales disponibles sur www.touristique-express.com', {
        align: 'center'
      });

      doc.rect(doc.page.width / 2 - 25, doc.page.height - 90, 50, 50).stroke('#000').fontSize(8).text('QR CODE', {
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

const sendTicketEmail = async ({ reservation, ticketBuffer }) => {
  if (!transporter) {
    console.warn('Aucun serveur SMTP configuré, billet non envoyé par email.');
    return;
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to: reservation.email,
    subject: `Votre billet ${reservation.origin} → ${reservation.destination}`,
    text: `Bonjour ${reservation.first_name},

Votre réservation ${reservation.ticket_code} est confirmée pour le ${formatDate(reservation.travel_date)} à ${formatTime(
      reservation.departure_time
    )}.

Veuillez trouver votre billet en pièce jointe.

Merci pour votre confiance.
Touristique Express`,
    attachments: [
      {
        filename: `Billet-${reservation.ticket_code}.pdf`,
        content: ticketBuffer
      }
    ]
  });
};

module.exports = { generateTicketPdf, sendTicketEmail };

