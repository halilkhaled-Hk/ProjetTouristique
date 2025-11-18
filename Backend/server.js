const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { generateTicketPdf, sendTicketEmail } = require('./utils/ticket');

const PORT = process.env.PORT || 5000;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'raptor',
  database: process.env.DB_NAME || 'touristique',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const pool = mysql.createPool(DB_CONFIG);

const TRIP_SCHEDULES = [
  '03:00',
  '04:00',
  '05:00',
  '06:30',
  '08:30',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:30',
  '17:00',
  '19:00'
];

const BASE_ROUTES = [
  { origin: 'Douala', destination: 'Yaoundé', price: 18000 },
  { origin: 'Yaoundé', destination: 'Douala', price: 18000 }
];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_TOKENS = new Set();

const sanitizeUser = (row) => ({
  id: row.id,
  gender: row.gender,
  firstName: row.first_name,
  lastName: row.last_name,
  nationalId: row.national_id,
  email: row.email,
  phoneNumber: row.phone_number,
  birthDate: row.birth_date ? row.birth_date.toISOString().split('T')[0] : null,
  isForeign: !!row.is_foreign,
  createdAt: row.created_at ? row.created_at.toISOString() : null
});

const authenticateAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token || !ADMIN_TOKENS.has(token)) {
    return res.status(401).json({ message: 'Authentification administrateur requise.' });
  }
  req.adminToken = token;
  next();
};

async function seedTrips() {
  const connection = await pool.getConnection();
  try {
    for (const route of BASE_ROUTES) {
      for (const time of TRIP_SCHEDULES) {
        const code = `${route.origin.slice(0, 2).toUpperCase()}-${route.destination
          .slice(0, 2)
          .toUpperCase()}-${time.replace(':', '')}`;
        await connection.query(
          `INSERT IGNORE INTO trips (trip_code, origin, destination, departure_time, price, seats_total, seats_available)
           VALUES (?, ?, ?, ?, ?, 5, 5)`,
          [code, route.origin, route.destination, time, route.price]
        );
      }
    }
    console.log('✔️ Trajets de démonstration disponibles');
  } catch (error) {
    console.error('Erreur lors du seed des trajets:', error.message);
  } finally {
    connection.release();
  }
}

app.get('/', (_req, res) => {
  res.json({ status: 'Touristique Express API opérationnelle' });
});

app.post('/api/auth/signup', async (req, res) => {
  const {
    gender,
    firstName,
    lastName,
    nationalId,
    email,
    phoneNumber,
    birthDate,
    password,
    isForeign
  } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Merci de renseigner au minimum nom, prénom, email et mot de passe.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (gender, first_name, last_name, national_id, email, phone_number, birth_date, is_foreign, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gender || null,
        firstName,
        lastName,
        nationalId || null,
        email.toLowerCase(),
        phoneNumber || null,
        birthDate || null,
        isForeign ? 1 : 0,
        hashedPassword
      ]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json({ user: sanitizeUser(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
    }
    console.error('Erreur inscription:', error);
    return res.status(500).json({ message: 'Impossible de créer le compte.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    const userRow = rows[0];
    const validPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    return res.json({ user: sanitizeUser(userRow) });
  } catch (error) {
    console.error('Erreur connexion:', error);
    return res.status(500).json({ message: 'Connexion impossible pour le moment.' });
  }
});

app.get('/api/trips', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, 
              v.immatriculation, v.type_vehicule AS vehicule_type, v.nombre_places AS vehicule_places,
              e.nom AS chauffeur_nom, e.prenom AS chauffeur_prenom
       FROM trips t
       LEFT JOIN vehicules v ON t.id_vehicule = v.id_vehicule
       LEFT JOIN chauffeurs c ON t.id_chauffeur = c.id_chauffeur
       LEFT JOIN employes e ON c.id_chauffeur = e.id_employe
       ORDER BY t.departure_time ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération trajets:', error);
    res.status(500).json({ message: 'Impossible de charger les trajets.' });
  }
});

app.post('/api/reservations', async (req, res) => {
  const { userId, tripId, paymentMethod, travelDate } = req.body;
  if (!userId || !tripId || !paymentMethod || !travelDate) {
    return res.status(400).json({ message: 'Utilisateur, voyage, date et mode de paiement sont requis.' });
  }

  const normalizedDate = new Date(travelDate);
  if (Number.isNaN(normalizedDate.getTime())) {
    return res.status(400).json({ message: 'Date de voyage invalide.' });
  }
  const mysqlDate = normalizedDate.toISOString().split('T')[0];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [tripRows] = await connection.query('SELECT * FROM trips WHERE id = ? FOR UPDATE', [tripId]);
    if (!tripRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Voyage introuvable.' });
    }
    const trip = tripRows[0];
    if (trip.seats_available <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Ce voyage est complet.' });
    }

    const departureDateTime = new Date(`${mysqlDate}T${trip.departure_time}`);
    if (Number.isNaN(departureDateTime.getTime())) {
      await connection.rollback();
      return res.status(400).json({ message: 'Horaire de voyage incorrect.' });
    }
    if (departureDateTime <= new Date()) {
      await connection.rollback();
      return res.status(400).json({ message: 'Impossible de réserver pour un horaire déjà passé.' });
    }

    const [insertResult] = await connection.query(
      `INSERT INTO reservations (user_id, trip_id, payment_method, price_paid, status, travel_date)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [userId, tripId, paymentMethod, trip.price, mysqlDate]
    );
    await connection.query('UPDATE trips SET seats_available = seats_available - 1 WHERE id = ?', [tripId]);
    const [reservationRows] = await pool.query(
      `SELECT r.id,
              r.payment_method,
              r.price_paid,
              r.status,
              r.created_at,
              r.travel_date,
              t.origin,
              t.destination,
              t.departure_time,
              t.seats_available,
              t.seats_total,
              u.first_name,
              u.last_name,
              u.email,
              CONCAT(UPPER(LEFT(t.origin, 2)), '-', UPPER(LEFT(t.destination, 2)), '-', LPAD(r.id, 5, '0')) AS ticket_code
       FROM reservations r
       INNER JOIN trips t ON r.trip_id = t.id
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [insertResult.insertId]
    );

    const reservationDetails = reservationRows[0];

    try {
      const pdfBuffer = await generateTicketPdf({ reservation: reservationDetails });
      await sendTicketEmail({ reservation: reservationDetails, ticketBuffer: pdfBuffer });
    } catch (ticketError) {
      console.error('Impossible de générer ou d\'envoyer le billet:', ticketError.message);
    }

    res.status(201).json({ message: 'Réservation confirmée.', reservation: reservationDetails });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur réservation:', error);
    res.status(500).json({ message: 'Impossible de finaliser la réservation.' });
  } finally {
    connection.release();
  }
});

app.get('/api/reservations', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Identifiant utilisateur requis.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.payment_method, r.created_at, r.price_paid, r.travel_date,
              t.origin, t.destination, t.departure_time
       FROM reservations r
       INNER JOIN trips t ON r.trip_id = t.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({ message: 'Impossible de charger vos réservations.' });
  }
});

app.delete('/api/reservations/:reservationId', async (req, res) => {
  const { reservationId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Utilisateur requis pour annuler.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ? FOR UPDATE',
      [reservationId, userId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Réservation introuvable.' });
    }
    const reservation = rows[0];

    await connection.query('DELETE FROM reservations WHERE id = ?', [reservationId]);
    await connection.query(
      'UPDATE trips SET seats_available = LEAST(seats_total, seats_available + 1) WHERE id = ?',
      [reservation.trip_id]
    );
    await connection.commit();

    res.json({ message: 'Réservation supprimée.' });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur annulation:', error);
    res.status(500).json({ message: 'Impossible d\'annuler pour le moment.' });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Identifiants administrateur invalides.' });
  }
  const token = crypto.randomUUID();
  ADMIN_TOKENS.add(token);
  res.json({ token });
});

app.post('/api/admin/logout', authenticateAdmin, (req, res) => {
  ADMIN_TOKENS.delete(req.adminToken);
  res.json({ message: 'Déconnexion effectuée.' });
});

app.get('/api/admin/reservations', authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id,
              r.status,
              r.payment_method,
              r.price_paid,
              r.travel_date,
              r.created_at,
              t.origin,
              t.destination,
              t.departure_time,
              u.first_name,
              u.last_name,
              u.email,
              u.phone_number
       FROM reservations r
       INNER JOIN trips t ON r.trip_id = t.id
       INNER JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération réservations admin:', error);
    res.status(500).json({ message: 'Impossible de charger les réservations.' });
  }
});

// ========== GESTION AGENCES ==========
app.get('/api/admin/agences', authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM agences ORDER BY nom_agence');
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération agences:', error);
    res.status(500).json({ message: 'Impossible de charger les agences.' });
  }
});

app.post('/api/admin/agences', authenticateAdmin, async (req, res) => {
  const { nom_agence, adresse_agence, tel_agence, email_agence, ville_agence } = req.body;
  if (!nom_agence || !ville_agence) {
    return res.status(400).json({ message: 'Nom et ville de l\'agence requis.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO agences (nom_agence, adresse_agence, tel_agence, email_agence, ville_agence) VALUES (?, ?, ?, ?, ?)',
      [nom_agence, adresse_agence || null, tel_agence || null, email_agence || null, ville_agence]
    );
    const [rows] = await pool.query('SELECT * FROM agences WHERE id_agence = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur création agence:', error);
    res.status(500).json({ message: 'Impossible de créer l\'agence.' });
  }
});

// ========== GESTION VÉHICULES ==========
app.get('/api/admin/vehicules', authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, a.nom_agence, a.ville_agence
       FROM vehicules v
       LEFT JOIN agences a ON v.id_agence = a.id_agence
       ORDER BY v.immatriculation`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération véhicules:', error);
    res.status(500).json({ message: 'Impossible de charger les véhicules.' });
  }
});

app.post('/api/admin/vehicules', authenticateAdmin, async (req, res) => {
  const { type_vehicule, designation, marque, immatriculation, nombre_places, image_url, statut, id_agence } = req.body;
  if (!type_vehicule || !immatriculation || !nombre_places) {
    return res.status(400).json({ message: 'Type, immatriculation et nombre de places requis.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO vehicules (type_vehicule, designation, marque, immatriculation, nombre_places, image_url, statut, id_agence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [type_vehicule, designation || null, marque || null, immatriculation, nombre_places, image_url || null, statut || 'ACTIF', id_agence || null]
    );
    const [rows] = await pool.query(
      `SELECT v.*, a.nom_agence FROM vehicules v LEFT JOIN agences a ON v.id_agence = a.id_agence WHERE v.id_vehicule = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cette immatriculation existe déjà.' });
    }
    console.error('Erreur création véhicule:', error);
    res.status(500).json({ message: 'Impossible de créer le véhicule.' });
  }
});

// ========== GESTION EMPLOYÉS ==========
app.get('/api/admin/employes', authenticateAdmin, async (req, res) => {
  const { poste } = req.query;
  try {
    let query = 'SELECT * FROM employes WHERE 1=1';
    const params = [];
    if (poste) {
      query += ' AND poste = ?';
      params.push(poste);
    }
    query += ' ORDER BY nom, prenom';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération employés:', error);
    res.status(500).json({ message: 'Impossible de charger les employés.' });
  }
});

app.post('/api/admin/employes', authenticateAdmin, async (req, res) => {
  const { nom, prenom, date_naissance, email, telephone, photo_url, poste, actif, experience, specialite } = req.body;
  if (!nom || !prenom || !poste) {
    return res.status(400).json({ message: 'Nom, prénom et poste requis.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO employes (nom, prenom, date_naissance, email, telephone, photo_url, poste, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, date_naissance || null, email || null, telephone || null, photo_url || null, poste, actif !== undefined ? actif : 1]
    );
    const empId = result.insertId;
    if (poste === 'Chauffeur') {
      await connection.query('INSERT INTO chauffeurs (id_chauffeur, experience) VALUES (?, ?)', [empId, experience || null]);
    } else if (poste === 'Mecanicien') {
      await connection.query('INSERT INTO mecaniciens (id_mecanicien, specialite) VALUES (?, ?)', [empId, specialite || null]);
    }
    await connection.commit();
    const [rows] = await pool.query('SELECT * FROM employes WHERE id_employe = ?', [empId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Erreur création employé:', error);
    res.status(500).json({ message: 'Impossible de créer l\'employé.' });
  } finally {
    connection.release();
  }
});

// ========== GESTION CHAUFFEURS ==========
app.get('/api/admin/chauffeurs', authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, c.experience
       FROM employes e
       INNER JOIN chauffeurs c ON e.id_employe = c.id_chauffeur
       WHERE e.actif = 1
       ORDER BY e.nom, e.prenom`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération chauffeurs:', error);
    res.status(500).json({ message: 'Impossible de charger les chauffeurs.' });
  }
});


// ========== GESTION MAINTENANCES ==========
app.get('/api/admin/maintenances', authenticateAdmin, async (req, res) => {
  const { id_vehicule } = req.query;
  try {
    let query = `SELECT m.*, v.immatriculation, v.type_vehicule
                 FROM maintenances m
                 INNER JOIN vehicules v ON m.id_vehicule = v.id_vehicule
                 WHERE 1=1`;
    const params = [];
    if (id_vehicule) {
      query += ' AND m.id_vehicule = ?';
      params.push(id_vehicule);
    }
    query += ' ORDER BY m.date_debut DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération maintenances:', error);
    res.status(500).json({ message: 'Impossible de charger les maintenances.' });
  }
});

app.post('/api/admin/maintenances', authenticateAdmin, async (req, res) => {
  const { id_vehicule, type_maintenance, description_travaux, zone_intervention, date_fin } = req.body;
  if (!id_vehicule || !type_maintenance) {
    return res.status(400).json({ message: 'Véhicule et type de maintenance requis.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO maintenances (id_vehicule, type_maintenance, description_travaux, zone_intervention, date_fin) VALUES (?, ?, ?, ?, ?)',
      [id_vehicule, type_maintenance, description_travaux || null, zone_intervention || null, date_fin || null]
    );
    await pool.query('UPDATE vehicules SET statut = ? WHERE id_vehicule = ?', ['EN_MAINTENANCE', id_vehicule]);
    const [rows] = await pool.query(
      `SELECT m.*, v.immatriculation FROM maintenances m INNER JOIN vehicules v ON m.id_vehicule = v.id_vehicule WHERE m.id_maintenance = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur création maintenance:', error);
    res.status(500).json({ message: 'Impossible de créer la maintenance.' });
  }
});

// ========== GESTION PARTENAIRES ==========
app.get('/api/admin/partenaires', authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM partenaires ORDER BY nom_partenaire');
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération partenaires:', error);
    res.status(500).json({ message: 'Impossible de charger les partenaires.' });
  }
});

app.post('/api/admin/partenaires', authenticateAdmin, async (req, res) => {
  const { nom_partenaire, adresse_partenaire, service_offert, telephone, email } = req.body;
  if (!nom_partenaire) {
    return res.status(400).json({ message: 'Nom du partenaire requis.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO partenaires (nom_partenaire, adresse_partenaire, service_offert, telephone, email) VALUES (?, ?, ?, ?, ?)',
      [nom_partenaire, adresse_partenaire || null, service_offert || null, telephone || null, email || null]
    );
    const [rows] = await pool.query('SELECT * FROM partenaires WHERE id_partenaire = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur création partenaire:', error);
    res.status(500).json({ message: 'Impossible de créer le partenaire.' });
  }
});

// ========== GESTION TRIPS (Attribution véhicule et chauffeur) ==========
app.get('/api/admin/gestion-trips', authenticateAdmin, async (req, res) => {
  const { travel_date, origin, destination } = req.query;
  try {
    let query = `SELECT gt.*, 
                        t.trip_code, t.origin, t.destination, t.departure_time, t.price,
                        v.immatriculation, v.type_vehicule, v.nombre_places,
                        e.nom AS chauffeur_nom, e.prenom AS chauffeur_prenom
                 FROM gestion_trips gt
                 INNER JOIN trips t ON gt.trip_id = t.id
                 INNER JOIN vehicules v ON gt.id_vehicule = v.id_vehicule
                 INNER JOIN chauffeurs c ON gt.id_chauffeur = c.id_chauffeur
                 INNER JOIN employes e ON c.id_chauffeur = e.id_employe
                 WHERE 1=1`;
    const params = [];
    if (travel_date) {
      query += ' AND gt.travel_date = ?';
      params.push(travel_date);
    }
    if (origin) {
      query += ' AND t.origin = ?';
      params.push(origin);
    }
    if (destination) {
      query += ' AND t.destination = ?';
      params.push(destination);
    }
    query += ' ORDER BY gt.travel_date DESC, t.departure_time ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération gestion trips:', error);
    res.status(500).json({ message: 'Impossible de charger les attributions.' });
  }
});

app.post('/api/admin/gestion-trips', authenticateAdmin, async (req, res) => {
  const { trip_id, id_vehicule, id_chauffeur, travel_date, statut } = req.body;
  if (!trip_id || !id_vehicule || !id_chauffeur || !travel_date) {
    return res.status(400).json({ message: 'Trip, véhicule, chauffeur et date sont requis.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO gestion_trips (trip_id, id_vehicule, id_chauffeur, travel_date, statut)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id_vehicule = VALUES(id_vehicule),
         id_chauffeur = VALUES(id_chauffeur),
         statut = VALUES(statut),
         updated_at = CURRENT_TIMESTAMP`,
      [trip_id, id_vehicule, id_chauffeur, travel_date, statut || 'PROGRAMME']
    );
    const [existing] = await connection.query(
      'SELECT id_gestion FROM gestion_trips WHERE trip_id = ? AND travel_date = ?',
      [trip_id, travel_date]
    );
    const gestionId = existing[0]?.id_gestion;
    const [rows] = await connection.query(
      `SELECT gt.*, 
              t.trip_code, t.origin, t.destination, t.departure_time, t.price,
              v.immatriculation, v.type_vehicule, v.nombre_places,
              e.nom AS chauffeur_nom, e.prenom AS chauffeur_prenom
       FROM gestion_trips gt
       INNER JOIN trips t ON gt.trip_id = t.id
       INNER JOIN vehicules v ON gt.id_vehicule = v.id_vehicule
       INNER JOIN chauffeurs c ON gt.id_chauffeur = c.id_chauffeur
       INNER JOIN employes e ON c.id_chauffeur = e.id_employe
       WHERE gt.id_gestion = ?`,
      [gestionId]
    );
    await connection.commit();
    res.status(201).json(rows[0] || { message: 'Attribution créée ou mise à jour.' });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur création attribution:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Une attribution existe déjà pour ce trajet à cette date.' });
    } else {
      res.status(500).json({ message: 'Impossible de créer l\'attribution.' });
    }
  } finally {
    connection.release();
  }
});

app.delete('/api/admin/gestion-trips/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM gestion_trips WHERE id_gestion = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Attribution introuvable.' });
    }
    res.json({ message: 'Attribution supprimée.' });
  } catch (error) {
    console.error('Erreur suppression attribution:', error);
    res.status(500).json({ message: 'Impossible de supprimer l\'attribution.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.path} introuvable.` });
});

seedTrips().catch((err) => console.error('Impossible de préparer les trajets:', err.message));

app.listen(PORT, () => {
  console.log(`🚍 Touristique Express API - port ${PORT}`);
});
