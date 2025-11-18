# Guide d'utilisation des nouvelles entités

Ce document explique comment utiliser les nouvelles tables et endpoints API ajoutés au projet Touristique Express.

## Tables créées

1. **agences** - Gestion des agences de l'entreprise
2. **partenaires** - Partenaires externes
3. **employes** - Employés génériques (avec spécialisations)
4. **chauffeurs** - Spécialisation des employés (chauffeurs)
5. **mecaniciens** - Spécialisation des employés (mécaniciens)
6. **vehicules** - Gestion de la flotte de véhicules
7. **maintenances** - Suivi des maintenances des véhicules
8. **voyages** - Gestion des voyages réels (liés aux véhicules et chauffeurs)

## Endpoints API disponibles

Tous les endpoints suivants nécessitent une authentification admin (header `x-admin-token`).

### Agences

- `GET /api/admin/agences` - Liste toutes les agences
- `POST /api/admin/agences` - Crée une nouvelle agence
  ```json
  {
    "nom_agence": "Agence Douala Centre",
    "adresse_agence": "Rue principale, Douala",
    "tel_agence": "+237 6XX XX XX XX",
    "email_agence": "douala@touristique.cm",
    "ville_agence": "Douala"
  }
  ```

### Véhicules

- `GET /api/admin/vehicules` - Liste tous les véhicules (avec info agence)
- `POST /api/admin/vehicules` - Crée un nouveau véhicule
  ```json
  {
    "type_vehicule": "BUS",
    "designation": "Bus Business Class",
    "marque": "Mercedes",
    "immatriculation": "LT-777-AA",
    "nombre_places": 50,
    "image_url": "https://example.com/bus.jpg",
    "statut": "ACTIF",
    "id_agence": 1
  }
  ```
  Types possibles: `BUS`, `VAN`, `MINIBUS`, `AUTRE`
  Statuts possibles: `ACTIF`, `EN_MAINTENANCE`, `INACTIF`

### Employés

- `GET /api/admin/employes?poste=Chauffeur` - Liste les employés (optionnel: filtrer par poste)
- `POST /api/admin/employes` - Crée un nouvel employé
  ```json
  {
    "nom": "MBOG",
    "prenom": "Jean",
    "date_naissance": "1985-05-15",
    "email": "jean.mbog@touristique.cm",
    "telephone": "+237 6XX XX XX XX",
    "photo_url": "https://example.com/photo.jpg",
    "poste": "Chauffeur",
    "actif": 1,
    "experience": "10 ans d'expérience"
  }
  ```
  Pour un chauffeur, inclure `experience`. Pour un mécanicien, inclure `specialite`.

### Chauffeurs

- `GET /api/admin/chauffeurs` - Liste tous les chauffeurs actifs avec leur expérience

### Voyages

- `GET /api/admin/voyages?statut=PROGRAMME` - Liste les voyages (optionnel: filtrer par statut)
- `POST /api/admin/voyages` - Crée un nouveau voyage
  ```json
  {
    "date_depart": "2025-12-01 08:30:00",
    "ville_depart": "Douala",
    "ville_arrivee": "Yaoundé",
    "id_vehicule": 1,
    "id_chauffeur": 1,
    "statut": "PROGRAMME"
  }
  ```
  Statuts possibles: `PROGRAMME`, `EN_COURS`, `TERMINE`, `ANNULE`

### Maintenances

- `GET /api/admin/maintenances?id_vehicule=1` - Liste les maintenances (optionnel: filtrer par véhicule)
- `POST /api/admin/maintenances` - Crée une nouvelle maintenance (met automatiquement le véhicule en maintenance)
  ```json
  {
    "id_vehicule": 1,
    "type_maintenance": "Révision générale",
    "description_travaux": "Vidange, changement filtres, vérification freins",
    "zone_intervention": "Douala",
    "date_fin": "2025-11-25 17:00:00"
  }
  ```

### Partenaires

- `GET /api/admin/partenaires` - Liste tous les partenaires
- `POST /api/admin/partenaires` - Crée un nouveau partenaire
  ```json
  {
    "nom_partenaire": "Garage Auto Express",
    "adresse_partenaire": "Zone industrielle, Douala",
    "service_offert": "Maintenance véhicules",
    "telephone": "+237 6XX XX XX XX",
    "email": "contact@garage.cm"
  }
  ```

## Relations entre tables

- **Véhicules** → **Agences** : Un véhicule peut être assigné à une agence
- **Employés** → **Chauffeurs/Mécaniciens** : Héritage via tables spécialisées
- **Voyages** → **Véhicules** : Chaque voyage utilise un véhicule
- **Voyages** → **Chauffeurs** : Chaque voyage a un chauffeur assigné
- **Maintenances** → **Véhicules** : Chaque maintenance concerne un véhicule

## Exemple d'utilisation complète

1. Créer une agence
2. Créer des véhicules et les assigner à l'agence
3. Créer des employés (chauffeurs)
4. Créer des voyages en liant véhicules et chauffeurs
5. Gérer les maintenances des véhicules

## Notes importantes

- Les immatriculations de véhicules doivent être uniques
- Lors de la création d'une maintenance, le statut du véhicule passe automatiquement à `EN_MAINTENANCE`
- Les employés avec poste "Chauffeur" créent automatiquement une entrée dans la table `chauffeurs`
- Les employés avec poste "Mecanicien" créent automatiquement une entrée dans la table `mecaniciens`

