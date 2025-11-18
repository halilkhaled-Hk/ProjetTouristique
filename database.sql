CREATE DATABASE IF NOT EXISTS touristique;
USE touristique;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gender VARCHAR(16),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  national_id VARCHAR(100),
  email VARCHAR(150) NOT NULL UNIQUE,
  phone_number VARCHAR(50),
  birth_date DATE,
  is_foreign TINYINT(1) DEFAULT 0,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table agences (créée avant trips pour les références)
CREATE TABLE IF NOT EXISTS agences (
  id_agence INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom_agence VARCHAR(256) NOT NULL,
  adresse_agence TEXT,
  tel_agence VARCHAR(64),
  email_agence VARCHAR(256),
  ville_agence VARCHAR(256) NOT NULL
) ENGINE=InnoDB;

-- Table employés (créée avant chauffeurs)
CREATE TABLE IF NOT EXISTS employes (
  id_employe INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(256) NOT NULL,
  prenom VARCHAR(256) NOT NULL,
  date_naissance DATE,
  date_embauche DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(256),
  telephone VARCHAR(64),
  photo_base64 LONGTEXT NULL,
  photo_url VARCHAR(512) NULL,
  poste VARCHAR(256) NOT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Table chauffeurs (créée avant trips)
CREATE TABLE IF NOT EXISTS chauffeurs (
  id_chauffeur INT UNSIGNED PRIMARY KEY,
  experience VARCHAR(256),
  FOREIGN KEY (id_chauffeur) REFERENCES employes(id_employe)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Table véhicules (créée avant trips)
CREATE TABLE IF NOT EXISTS vehicules (
  id_vehicule INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_vehicule ENUM('BUS','VAN','MINIBUS','AUTRE') NOT NULL,
  designation VARCHAR(256) NULL,
  marque VARCHAR(128) NULL,
  immatriculation VARCHAR(128) NOT NULL UNIQUE,
  nombre_places INT UNSIGNED NOT NULL,
  image_base64 LONGTEXT NULL,
  image_url VARCHAR(512) NULL,
  statut ENUM('ACTIF','EN_MAINTENANCE','INACTIF') NOT NULL DEFAULT 'ACTIF',
  id_agence INT UNSIGNED NULL,
  FOREIGN KEY (id_agence) REFERENCES agences(id_agence)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- Table trips (créée après vehicules et chauffeurs)
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_code VARCHAR(32) NOT NULL UNIQUE,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time TIME NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 18000.00,
  seats_total INT NOT NULL DEFAULT 5,
  seats_available INT NOT NULL DEFAULT 5,
  id_vehicule INT UNSIGNED NULL,
  id_chauffeur INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_vehicule) REFERENCES vehicules(id_vehicule)
    ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (id_chauffeur) REFERENCES chauffeurs(id_chauffeur)
    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  trip_id INT NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  price_paid DECIMAL(10, 2) NOT NULL,
  travel_date DATE NOT NULL,
  status ENUM('ACTIVE', 'CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservation_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

INSERT INTO trips (trip_code, origin, destination, departure_time, price, seats_total, seats_available)
VALUES
  ('DO-YA-0300', 'Douala', 'Yaoundé', '03:00', 18000, 5, 5),
  ('DO-YA-0400', 'Douala', 'Yaoundé', '04:00', 18000, 5, 5),
  ('DO-YA-0500', 'Douala', 'Yaoundé', '05:00', 18000, 5, 5),
  ('DO-YA-0630', 'Douala', 'Yaoundé', '06:30', 18000, 5, 5),
  ('DO-YA-0830', 'Douala', 'Yaoundé', '08:30', 18000, 5, 5),
  ('DO-YA-1000', 'Douala', 'Yaoundé', '10:00', 18000, 5, 5),
  ('DO-YA-1100', 'Douala', 'Yaoundé', '11:00', 18000, 5, 5),
  ('DO-YA-1200', 'Douala', 'Yaoundé', '12:00', 18000, 5, 5),
  ('DO-YA-1300', 'Douala', 'Yaoundé', '13:00', 18000, 5, 5),
  ('DO-YA-1400', 'Douala', 'Yaoundé', '14:00', 18000, 5, 5),
  ('DO-YA-1530', 'Douala', 'Yaoundé', '15:30', 18000, 5, 5),
  ('DO-YA-1700', 'Douala', 'Yaoundé', '17:00', 18000, 5, 5),
  ('DO-YA-1900', 'Douala', 'Yaoundé', '19:00', 18000, 5, 5),
  ('YA-DO-0300', 'Yaoundé', 'Douala', '03:00', 18000, 5, 5),
  ('YA-DO-0400', 'Yaoundé', 'Douala', '04:00', 18000, 5, 5),
  ('YA-DO-0500', 'Yaoundé', 'Douala', '05:00', 18000, 5, 5),
  ('YA-DO-0630', 'Yaoundé', 'Douala', '06:30', 18000, 5, 5),
  ('YA-DO-0830', 'Yaoundé', 'Douala', '08:30', 18000, 5, 5),
  ('YA-DO-1000', 'Yaoundé', 'Douala', '10:00', 18000, 5, 5),
  ('YA-DO-1100', 'Yaoundé', 'Douala', '11:00', 18000, 5, 5),
  ('YA-DO-1200', 'Yaoundé', 'Douala', '12:00', 18000, 5, 5),
  ('YA-DO-1300', 'Yaoundé', 'Douala', '13:00', 18000, 5, 5),
  ('YA-DO-1400', 'Yaoundé', 'Douala', '14:00', 18000, 5, 5),
  ('YA-DO-1530', 'Yaoundé', 'Douala', '15:30', 18000, 5, 5),
  ('YA-DO-1700', 'Yaoundé', 'Douala', '17:00', 18000, 5, 5),
  ('YA-DO-1900', 'Yaoundé', 'Douala', '19:00', 18000, 5, 5)
ON DUPLICATE KEY UPDATE price = VALUES(price);

-- Table mecaniciens (spécialisation)
CREATE TABLE IF NOT EXISTS mecaniciens (
  id_mecanicien INT UNSIGNED PRIMARY KEY,
  specialite VARCHAR(256),
  FOREIGN KEY (id_mecanicien) REFERENCES employes(id_employe)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Table partenaires externes
CREATE TABLE IF NOT EXISTS partenaires (
  id_partenaire INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom_partenaire VARCHAR(256) NOT NULL,
  adresse_partenaire TEXT,
  service_offert VARCHAR(256),
  telephone VARCHAR(64),
  email VARCHAR(256)
) ENGINE=InnoDB;

-- Table maintenance
CREATE TABLE IF NOT EXISTS maintenances (
  id_maintenance INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_vehicule INT UNSIGNED NOT NULL,
  type_maintenance VARCHAR(256) NOT NULL,
  description_travaux TEXT,
  zone_intervention VARCHAR(256),
  date_debut DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_fin DATETIME NULL,
  FOREIGN KEY (id_vehicule) REFERENCES vehicules(id_vehicule)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Table gestion_trips (attribution véhicule et chauffeur aux trajets)
CREATE TABLE IF NOT EXISTS gestion_trips (
  id_gestion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  id_vehicule INT UNSIGNED NOT NULL,
  id_chauffeur INT UNSIGNED NOT NULL,
  travel_date DATE NOT NULL,
  statut ENUM('PROGRAMME','EN_COURS','TERMINE','ANNULE') NOT NULL DEFAULT 'PROGRAMME',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (id_vehicule) REFERENCES vehicules(id_vehicule)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_chauffeur) REFERENCES chauffeurs(id_chauffeur)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY unique_trip_date (trip_id, travel_date)
) ENGINE=InnoDB;


