import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import logo from './assets/prestige-logo.png';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAYMENT_METHODS = ['Mobile Money', 'Carte bancaire', 'Espèces'];
const ROUTES = [
  { id: 'dy', label: 'Douala → Yaoundé', origin: 'Douala', destination: 'Yaoundé' },
  { id: 'yd', label: 'Yaoundé → Douala', origin: 'Yaoundé', destination: 'Douala' }
];

const formatTime = (time) => {
  if (!time) return '';
  const [hour, minute] = time.split(':');
  return `${hour}h${minute}`;
};

const formatPrice = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(Number(value || 0));

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '');

const isDeparturePast = (trip, travelDate) => {
  if (!travelDate) return false;
  const departureDate = new Date(travelDate);
  if (Number.isNaN(departureDate.getTime())) return false;
  const today = new Date();

  const tripTime = trip.departure_time?.slice(0, 5) || '00:00';
  const [hours, minutes] = tripTime.split(':').map(Number);
  departureDate.setHours(hours, minutes, 0, 0);

  return departureDate <= today;
};

const emptySignup = {
  gender: 'Femme',
  firstName: '',
  lastName: '',
  nationalId: '',
  email: '',
  phoneNumber: '',
  birthDate: '',
  password: '',
  confirmPassword: '',
  isForeign: false
};

function AuthSection({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [signupData, setSignupData] = useState(emptySignup);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setFeedback(null);
    setLoading(false);
  }, [mode]);

  const updateSignup = (field, value) => setSignupData((prev) => ({ ...prev, [field]: value }));
  const updateLogin = (field, value) => setLoginData((prev) => ({ ...prev, [field]: value }));

  const handleSignup = async (event) => {
    event.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      setFeedback({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: signupData.gender,
          firstName: signupData.firstName.trim(),
          lastName: signupData.lastName.trim(),
          nationalId: signupData.nationalId.trim(),
          email: signupData.email.trim().toLowerCase(),
          phoneNumber: signupData.phoneNumber.trim(),
          birthDate: signupData.birthDate,
          password: signupData.password,
          isForeign: signupData.isForeign
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Inscription impossible');
      }
      const data = await response.json();
      onSuccess(data.user);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email.trim().toLowerCase(),
          password: loginData.password
        })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Connexion impossible');
      }
      const data = await response.json();
      onSuccess(data.user);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {mode === 'login' ? (
        <div className="login-card">
          <img src={logo} alt="Prestige 777" className="login-logo" />
          <p className="login-greeting">Hello,</p>
          <h1>Welcome to Prestige Touristique</h1>
          <p className="login-subtitle">Veuillez vous connecter pour continuer.</p>

          {feedback && <div className={`feedback ${feedback.type}`}>{feedback.text}</div>}

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(event) => updateLogin('email', event.target.value)}
                placeholder="client@prestige.cm"
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(event) => updateLogin('password', event.target.value)}
                placeholder="********"
              />
            </label>
            <div className="login-actions">
              <label className="remember">
                <input type="checkbox" defaultChecked readOnly />
                Remember Me
              </label>
              <button
                type="button"
                className="link-button"
                onClick={() => setFeedback({ type: 'info', text: 'Contactez Touristique Express pour réinitialiser votre mot de passe.' })}
              >
                Forgot your password?
              </button>
            </div>
            <button type="submit" className="primary wide" disabled={loading}>
              {loading ? 'Connexion...' : 'LOG IN'}
            </button>
          </form>

          <button type="button" className="secondary wide" onClick={() => setMode('signup')}>
            SIGN UP
          </button>
          <button
            type="button"
            className="tertiary wide"
            onClick={() => setFeedback({ type: 'info', text: 'Merci de vous connecter pour réserver un billet.' })}
          >
            CONTINUE WITHOUT SIGNING UP
          </button>
        </div>
      ) : (
        <div className="signup-surface">
          <button className="link-button back-link" onClick={() => setMode('login')}>
            ← Retour à la connexion
          </button>
          <form className="form" onSubmit={handleSignup}>
            <div className="signup-heading">
              <img src={logo} alt="Prestige 777" />
      <div>
                <p className="login-greeting">Hello,</p>
                <h2>Créez votre espace Prestige</h2>
      </div>
            </div>
            {feedback && <div className={`feedback ${feedback.type}`}>{feedback.text}</div>}
            <div className="gender-toggle">
              <button
                type="button"
                className={signupData.gender === 'Femme' ? 'active' : ''}
                onClick={() => updateSignup('gender', 'Femme')}
              >
                Femme
        </button>
              <button
                type="button"
                className={signupData.gender === 'Homme' ? 'active' : ''}
                onClick={() => updateSignup('gender', 'Homme')}
              >
                Homme
              </button>
            </div>
            <div className="inline-fields">
              <label>
                Prénom(s)
                <input
                  type="text"
                  required
                  value={signupData.firstName}
                  onChange={(event) => updateSignup('firstName', event.target.value)}
                  placeholder="ex: Danielle"
                />
              </label>
              <label>
                Nom
                <input
                  type="text"
                  required
                  value={signupData.lastName}
                  onChange={(event) => updateSignup('lastName', event.target.value)}
                  placeholder="ex: MBOG"
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={signupData.isForeign}
                onChange={(event) => updateSignup('isForeign', event.target.checked)}
              />
              Je ne suis pas ressortissant camerounais
            </label>
            <label>
              Numéro de pièce (CNI / Passeport)
              <input
                type="text"
                value={signupData.nationalId}
                onChange={(event) => updateSignup('nationalId', event.target.value)}
                placeholder="ex: 123456789"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={signupData.email}
                onChange={(event) => updateSignup('email', event.target.value)}
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                value={signupData.phoneNumber}
                onChange={(event) => updateSignup('phoneNumber', event.target.value)}
                placeholder="+237 6 XX XX XX"
              />
            </label>
            <label>
              Date de naissance
              <input
                type="date"
                value={signupData.birthDate}
                onChange={(event) => updateSignup('birthDate', event.target.value)}
              />
            </label>
            <div className="inline-fields">
              <label>
                Mot de passe
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(event) => updateSignup('password', event.target.value)}
                />
              </label>
              <label>
                Confirmation
                <input
                  type="password"
                  required
                  value={signupData.confirmPassword}
                  onChange={(event) => updateSignup('confirmPassword', event.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Création...' : "Créer mon espace"}
            </button>
            <p className="disclaimer">En continuant, vous acceptez la Politique de confidentialité Touristique Express.</p>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminLogin({ onSuccess, onBack }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Connexion impossible');
      }
      const data = await response.json();
      onSuccess(data.token);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="login-card admin-card">
        <button className="link-button back-link" onClick={onBack}>
          ← Retour espace client
        </button>
        <img src={logo} alt="Prestige 777" className="login-logo" />
        <p className="login-greeting">Administration</p>
        <h1>Prestige Control Center</h1>
        <p className="login-subtitle">Veuillez vous identifier pour accéder aux réservations.</p>
        {feedback && <div className={`feedback ${feedback.type}`}>{feedback.text}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
          </label>
          <button type="submit" className="primary wide" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TravelSearch({ onConfirm, onLogout, user }) {
  const [selectedRoute, setSelectedRoute] = useState(ROUTES[0]);
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(1);

  return (
    <div className="search-shell">
      <header className="wizard-header">
        <img src={logo} alt="Prestige 777" />
        <div>
          <p>Bienvenue {user.firstName}</p>
          <small>Étape 1/3 — Sélection de votre trajet</small>
        </div>
        <button className="ghost" onClick={onLogout}>
          Déconnexion
        </button>
      </header>

      <div className="wizard-progress">
        <div className="wizard-step active">1<br />Select journey</div>
        <div className="wizard-step">2<br />Select seat</div>
        <div className="wizard-step">3<br />Payment</div>
      </div>

      <div className="search-card">
        <div className="search-field">
          <label>From/To</label>
          <div className="route-toggle">
            {ROUTES.map((route) => (
              <button
                key={route.id}
                className={selectedRoute.id === route.id ? 'active' : ''}
                onClick={() => setSelectedRoute(route)}
                type="button"
              >
                {route.label}
              </button>
            ))}
          </div>
        </div>

        <div className="search-row">
          <label>
            When
            <input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} />
          </label>
          <label>
            Passengers
            <select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((nb) => (
                <option key={nb} value={nb}>
                  {nb} Passager{nb > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="primary wide"
          onClick={() =>
            onConfirm({
              origin: selectedRoute.origin,
              destination: selectedRoute.destination,
              date: travelDate,
              passengers
            })
          }
        >
          Search
        </button>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout, searchParams, onResetSearch }) {
  const [trips, setTrips] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [bookingTrip, setBookingTrip] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [status, setStatus] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      const response = await fetch(`${API_BASE}/api/trips`);
      if (!response.ok) {
        throw new Error('Impossible de charger les voyages.');
      }
      const data = await response.json();
      setTrips(data);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/reservations?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Impossible de charger vos réservations.');
      }
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }, [user.id]);

  useEffect(() => {
    fetchTrips();
    fetchReservations();
  }, [fetchTrips, fetchReservations]);

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const confirmBooking = async () => {
    if (!bookingTrip) return;
    if (isDeparturePast(bookingTrip, searchParams?.date)) {
      setStatus({ type: 'error', text: 'Cet horaire est déjà passé. Merci de choisir un autre départ.' });
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tripId: bookingTrip.id,
          paymentMethod,
          travelDate: searchParams?.date || new Date().toISOString().split('T')[0]
        })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Réservation refusée');
      }
      setStatus({ type: 'success', text: 'Réservation confirmée 🎉' });
      setBookingTrip(null);
      fetchTrips();
      fetchReservations();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/reservations/${reservationId}?userId=${user.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Annulation impossible');
      }
      setReservations((prev) => prev.filter((item) => item.id !== reservationId));
      setStatus({ type: 'info', text: 'Réservation annulée.' });
      fetchTrips();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  };

  const filteredTrips = useMemo(() => {
    if (!searchParams) return trips;
    return trips.filter(
      (trip) => trip.origin === searchParams.origin && trip.destination === searchParams.destination
    );
  }, [trips, searchParams]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="identity">
          <img src={logo} alt="Prestige 777" />
          <div>
            <p>Bienvenue, {user.firstName} {user.lastName}</p>
            {searchParams && (
              <small>
                {searchParams.origin} → {searchParams.destination} | {formatDate(searchParams.date)}
              </small>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={onResetSearch}>
            Modifier l&apos;itinéraire
          </button>
          <button className="ghost" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {status && <div className={`feedback ${status.type}`}>{status.text}</div>}

      <section className="trips-section">
        <div className="section-heading">
          <div>
            <h2>Voyages disponibles</h2>
            <p>
              {searchParams
                ? `${searchParams.origin} → ${searchParams.destination} — ${formatDate(searchParams.date)}`
                : 'Horaires inspirés de la grille Business Class.'}
        </p>
      </div>
          <button className="ghost" onClick={fetchTrips}>
            Rafraîchir
          </button>
        </div>

        <div className="trip-grid">
          {filteredTrips.length === 0 && !loadingTrips && <p>Aucun voyage pour l&apos;instant.</p>}
          {loadingTrips && <p>Chargement des voyages...</p>}
          {filteredTrips.map((trip) => {
            const isPast = isDeparturePast(trip, searchParams?.date);
            return (
              <article
                key={trip.id}
                className={`trip-card ${trip.seats_available === 0 || isPast ? 'disabled' : ''}`}
              >
                <div className="trip-card__time">{formatTime(trip.departure_time)}</div>
                <p className="trip-card__price">{formatPrice(trip.price)}</p>
                <p className="trip-card__seats">
                  {trip.seats_available} / {trip.seats_total} places
                </p>
                {isPast && <small className="trip-card__status">Départ dépassé</small>}
                <button
                  onClick={() => {
                    setBookingTrip(trip);
                    setPaymentMethod(PAYMENT_METHODS[0]);
                  }}
                  disabled={trip.seats_available === 0 || isPast}
                >
                  Réserver
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="reservations-section">
        <div className="section-heading">
          <h2>Mes réservations</h2>
        </div>
        {reservations.length === 0 ? (
          <p>Vous n&apos;avez pas encore de réservation active.</p>
        ) : (
          <div className="reservation-list">
            {reservations.map((res) => (
              <article key={res.id} className={`reservation-card status-${res.status.toLowerCase()}`}>
                <div>
                  <p className="reservation-route">
                    {res.origin} → {res.destination}
                  </p>
                  <p className="reservation-time">
                    {formatDate(res.travel_date)} • {formatTime(res.departure_time)}
                  </p>
                  <small>Payé : {formatPrice(res.price_paid)}</small>
                </div>
                <div className="reservation-meta">
                  <span className="badge">{res.status}</span>
                  <span>{res.payment_method}</span>
                  {res.status === 'ACTIVE' && (
                    <button className="ghost" onClick={() => cancelReservation(res.id)}>
                      Annuler
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {bookingTrip && (
        <div className="booking-modal">
          <div className="booking-card">
            <div className="booking-header">
              <h3>Confirmer votre billet</h3>
              <button className="ghost" onClick={() => setBookingTrip(null)}>
                Fermer
              </button>
            </div>
            <p className="booking-route">
              {bookingTrip.origin} → {bookingTrip.destination}
            </p>
            <p className="booking-time">{formatTime(bookingTrip.departure_time)}</p>
            <p className="booking-price">Total : {formatPrice(bookingTrip.price)}</p>

            <label>
              Mode de paiement
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={confirmBooking}>
              Confirmer et payer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [gestionTrips, setGestionTrips] = useState([]);
  const [trips, setTrips] = useState([]);
  const [agences, setAgences] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'x-admin-token': token,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (response.status === 401) {
      onLogout();
      throw new Error('Session expirée');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Erreur API');
    }
    return response.json();
  }, [token, onLogout]);

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setFeedback(null);
    try {
      switch (tab) {
        case 'reservations':
          setReservations(await apiCall('/api/admin/reservations'));
          break;
        case 'gestion-voyages': {
          const params = new URLSearchParams();
          if (filterDate) params.append('travel_date', filterDate);
          if (filterOrigin) params.append('origin', filterOrigin);
          if (filterDestination) params.append('destination', filterDestination);
          const queryString = params.toString();
          setGestionTrips(await apiCall(`/api/admin/gestion-trips${queryString ? '?' + queryString : ''}`));
          // Toujours charger les trips pour avoir les horaires disponibles depuis la table trips
          try {
            const tripsResponse = await fetch(`${API_BASE}/api/trips`);
            if (tripsResponse.ok) {
              const tripsData = await tripsResponse.json();
              setTrips(tripsData);
              console.log('Trips chargés:', tripsData.length, 'trajets disponibles');
            } else {
              console.error('Erreur chargement trips:', tripsResponse.status);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des trips:', error);
          }
          if (vehicules.length === 0) {
            apiCall('/api/admin/vehicules').then(setVehicules).catch(() => {});
          }
          if (chauffeurs.length === 0) {
            apiCall('/api/admin/chauffeurs').then(setChauffeurs).catch(() => {});
          }
          break;
        }
        case 'agences':
          setAgences(await apiCall('/api/admin/agences'));
          break;
        case 'vehicules':
          setVehicules(await apiCall('/api/admin/vehicules'));
          break;
        case 'employes':
          setEmployes(await apiCall('/api/admin/employes'));
          break;
        case 'chauffeurs':
          setChauffeurs(await apiCall('/api/admin/chauffeurs'));
          break;
        case 'maintenances':
          setMaintenances(await apiCall('/api/admin/maintenances'));
          break;
        case 'partenaires':
          setPartenaires(await apiCall('/api/admin/partenaires'));
          break;
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [apiCall, filterDate, filterOrigin, filterDestination, trips.length, vehicules.length, chauffeurs.length]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData, filterDate, filterOrigin, filterDestination]);

  // Charger les données nécessaires pour les formulaires
  useEffect(() => {
    if (showForm && activeTab === 'gestion-voyages') {
      // Charger les trips depuis la table trips pour avoir les horaires
      if (trips.length === 0) {
        fetch(`${API_BASE}/api/trips`)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then((data) => {
            console.log('Trips chargés pour le formulaire:', data.length);
            setTrips(data);
          })
          .catch((err) => {
            console.error('Erreur chargement trips:', err);
            setFeedback({ type: 'error', text: 'Impossible de charger les horaires depuis la base de données.' });
          });
      }
      if (vehicules.length === 0) {
        apiCall('/api/admin/vehicules').then(setVehicules).catch(() => {});
      }
      if (chauffeurs.length === 0) {
        apiCall('/api/admin/chauffeurs').then(setChauffeurs).catch(() => {});
      }
    }
    if (showForm && activeTab === 'vehicules' && agences.length === 0) {
      apiCall('/api/admin/agences').then(setAgences).catch(() => {});
    }
    if (showForm && activeTab === 'maintenances' && vehicules.length === 0) {
      apiCall('/api/admin/vehicules').then(setVehicules).catch(() => {});
    }
  }, [showForm, activeTab, apiCall, agences.length, vehicules.length, chauffeurs.length, trips.length]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = async (endpoint, data) => {
    try {
      await apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) });
      setFeedback({ type: 'success', text: 'Création réussie !' });
      setShowForm(false);
      setFormData({});
      fetchData(activeTab);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Déconnexion admin non transmise:', error.message);
    } finally {
      onLogout();
    }
  };

  const totalRevenue = useMemo(
    () => reservations.reduce((sum, item) => sum + Number(item.price_paid || 0), 0),
    [reservations]
  );

  const tabs = [
    { id: 'reservations', label: 'Réservations' },
    { id: 'gestion-voyages', label: 'Gestion voyages' },
    { id: 'agences', label: 'Agences' },
    { id: 'vehicules', label: 'Véhicules' },
    { id: 'employes', label: 'Employés' },
    { id: 'chauffeurs', label: 'Chauffeurs' },
    { id: 'maintenances', label: 'Maintenances' },
    { id: 'partenaires', label: 'Partenaires' }
  ];

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="login-greeting">Touristique Express</p>
          <h1>Espace administrateur</h1>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={() => fetchData(activeTab)}>
            Rafraîchir
          </button>
          <button className="ghost" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {feedback && <div className={`feedback ${feedback.type}`}>{feedback.text}</div>}

      {activeTab === 'reservations' && (
        <section className="admin-stats">
          <div className="stat-card">
            <p>Total réservations</p>
            <strong>{reservations.length}</strong>
          </div>
          <div className="stat-card">
            <p>Revenus estimés</p>
            <strong>{formatPrice(totalRevenue)}</strong>
          </div>
        </section>
      )}

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="admin-content">
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            {activeTab === 'reservations' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Historique des réservations</h2>
                </div>
                {reservations.length === 0 ? (
                  <p>Aucune réservation pour le moment.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Passager</th>
                          <th>Itinéraire</th>
                          <th>Départ</th>
                          <th>Contact</th>
                          <th>Paiement</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.first_name} {item.last_name}
                              <br />
                              <small>{item.email}</small>
                            </td>
                            <td>
                              {item.origin} → {item.destination}
                            </td>
                            <td>
                              {formatDate(item.travel_date)} • {formatTime(item.departure_time)}
                            </td>
                            <td>{item.phone_number || 'n/a'}</td>
                            <td>
                              {item.payment_method}
                              <br />
                              <strong>{formatPrice(item.price_paid)}</strong>
                            </td>
                            <td>
                              <span className={`badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gestion-voyages' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Gestion des voyages - Attribution bus et chauffeur</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Attribuer un bus et chauffeur
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Attribuer un bus et un chauffeur à un départ</h3>
                    <p style={{ color: '#5b618a', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                      Sélectionnez un trajet parmi les départs disponibles (Douala ↔ Yaoundé) et attribuez-lui un bus et un chauffeur pour une date spécifique.
                    </p>
                    {trips.length === 0 && (
                      <div style={{ padding: '1rem', background: '#fff4e3', borderRadius: '8px', marginBottom: '1rem', color: '#d97706' }}>
                        Chargement des horaires depuis la base de données...
                      </div>
                    )}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          // Trouver le trip_id correspondant à l'itinéraire et l'horaire sélectionnés
                          const selectedTrip = trips.find(
                            (t) =>
                              t.origin === formData.origin &&
                              t.destination === formData.destination &&
                              t.departure_time === formData.departure_time
                          );
                          if (!selectedTrip) {
                            setFeedback({ type: 'error', text: 'Trajet introuvable pour cet itinéraire et cet horaire.' });
                            return;
                          }
                          await apiCall('/api/admin/gestion-trips', {
                            method: 'POST',
                            body: JSON.stringify({
                              ...formData,
                              trip_id: selectedTrip.id
                            })
                          });
                          setFeedback({ type: 'success', text: 'Attribution créée !' });
                          setShowForm(false);
                          setFormData({});
                          fetchData(activeTab);
                        } catch (error) {
                          setFeedback({ type: 'error', text: error.message });
                        }
                      }}
                    >
                      <label>
                        Date de voyage *
                        <input
                          type="date"
                          required
                          value={formData.travel_date || ''}
                          onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                        />
                      </label>
                      <label>
                        Itinéraire *
                        <select
                          required
                          value={formData.origin && formData.destination ? `${formData.origin}-${formData.destination}` : ''}
                          onChange={(e) => {
                            const [origin, destination] = e.target.value.split('-');
                            setFormData({
                              ...formData,
                              origin,
                              destination,
                              departure_time: '' // Réinitialiser l'horaire quand on change l'itinéraire
                            });
                          }}
                        >
                          <option value="">Sélectionner un itinéraire</option>
                          <option value="Douala-Yaoundé">Douala → Yaoundé</option>
                          <option value="Yaoundé-Douala">Yaoundé → Douala</option>
                        </select>
                        {formData.origin && formData.destination && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#5b618a' }}>
                            {formData.origin} → {formData.destination}
                          </small>
                        )}
                      </label>
                      <label>
                        Horaire de départ *
                        <select
                          required
                          value={formData.departure_time || ''}
                          onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                          disabled={!formData.origin || !formData.destination || trips.length === 0}
                        >
                          <option value="">Sélectionner un horaire</option>
                          {formData.origin && formData.destination && trips.length > 0 &&
                            (() => {
                              const filteredTrips = trips.filter(
                                (t) =>
                                  t.origin === formData.origin &&
                                  t.destination === formData.destination
                              );
                              console.log('Trips disponibles:', trips.length);
                              console.log('Filtrage pour:', formData.origin, '→', formData.destination);
                              console.log('Trips filtrés:', filteredTrips.length);
                              if (filteredTrips.length === 0) {
                                return (
                                  <option value="" disabled>
                                    Aucun horaire disponible pour {formData.origin} → {formData.destination} (Vérifiez la table trips)
                                  </option>
                                );
                              }
                              return filteredTrips
                                .sort((a, b) => {
                                  // Tri chronologique correct des horaires
                                  const timeA = a.departure_time.split(':').map(Number);
                                  const timeB = b.departure_time.split(':').map(Number);
                                  if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                                  return timeA[1] - timeB[1];
                                })
                                .map((t) => (
                                  <option key={t.id} value={t.departure_time}>
                                    {formatTime(t.departure_time)} ({t.trip_code})
                                  </option>
                                ));
                            })()}
                        </select>
                        {trips.length === 0 && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#a90f36' }}>
                            Chargement des horaires...
                          </small>
                        )}
                        {formData.departure_time && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#5b618a' }}>
                            Départ à {formatTime(formData.departure_time)}
                            {trips.find((t) => t.departure_time === formData.departure_time && t.origin === formData.origin && t.destination === formData.destination) && (
                              <span> - Code: {trips.find((t) => t.departure_time === formData.departure_time && t.origin === formData.origin && t.destination === formData.destination).trip_code}</span>
                            )}
                          </small>
                        )}
                        {(!formData.origin || !formData.destination) && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#a90f36' }}>
                            Veuillez d&apos;abord sélectionner un itinéraire
                          </small>
                        )}
                        {formData.origin && formData.destination && trips.length > 0 && trips.filter((t) => t.origin === formData.origin && t.destination === formData.destination).length === 0 && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#a90f36' }}>
                            Aucun horaire disponible pour cet itinéraire
                          </small>
                        )}
                      </label>
                      <label>
                        Bus (Véhicule) *
                        <select
                          required
                          value={formData.id_vehicule || ''}
                          onChange={(e) => setFormData({ ...formData, id_vehicule: Number(e.target.value) })}
                        >
                          <option value="">Sélectionner un bus</option>
                          {vehicules
                            .filter((v) => v.statut === 'ACTIF')
                            .map((v) => (
                              <option key={v.id_vehicule} value={v.id_vehicule}>
                                {v.immatriculation} - {v.type_vehicule} ({v.nombre_places} places)
                              </option>
                            ))}
                        </select>
                        {vehicules.filter((v) => v.statut === 'ACTIF').length === 0 && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#a90f36' }}>
                            Aucun bus actif disponible. Créez d&apos;abord un véhicule dans l&apos;onglet &quot;Véhicules&quot;.
                          </small>
                        )}
                      </label>
                      <label>
                        Chauffeur *
                        <select
                          required
                          value={formData.id_chauffeur || ''}
                          onChange={(e) => setFormData({ ...formData, id_chauffeur: Number(e.target.value) })}
                        >
                          <option value="">Sélectionner un chauffeur</option>
                          {chauffeurs.map((c) => (
                            <option key={c.id_employe} value={c.id_employe}>
                              {c.nom} {c.prenom} {c.experience ? `(${c.experience})` : ''}
                            </option>
                          ))}
                        </select>
                        {chauffeurs.length === 0 && (
                          <small style={{ display: 'block', marginTop: '0.25rem', color: '#a90f36' }}>
                            Aucun chauffeur disponible. Créez d&apos;abord un chauffeur dans l&apos;onglet &quot;Chauffeurs&quot;.
                          </small>
                        )}
                      </label>
                      <label>
                        Statut
                        <select
                          value={formData.statut || 'PROGRAMME'}
                          onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                        >
                          <option value="PROGRAMME">PROGRAMME</option>
                          <option value="EN_COURS">EN_COURS</option>
                          <option value="TERMINE">TERMINE</option>
                          <option value="ANNULE">ANNULE</option>
                        </select>
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {gestionTrips.length === 0 ? (
                  <p>Aucune attribution enregistrée.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Trajet</th>
                          <th>Horaire</th>
                          <th>Véhicule</th>
                          <th>Chauffeur</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gestionTrips.map((item) => (
                          <tr key={item.id_gestion}>
                            <td>{formatDate(item.travel_date)}</td>
                            <td>
                              {item.origin} → {item.destination}
                              <br />
                              <small>{item.trip_code}</small>
                            </td>
                            <td>{formatTime(item.departure_time)}</td>
                            <td>
                              {item.immatriculation}
                              <br />
                              <small>{item.type_vehicule} ({item.nombre_places} places)</small>
                            </td>
                            <td>
                              {item.chauffeur_nom} {item.chauffeur_prenom}
                            </td>
                            <td>
                              <span className={`badge status-${item.statut.toLowerCase()}`}>{item.statut}</span>
                            </td>
                            <td>
                              <button
                                className="ghost"
                                style={{ color: '#a90f36', fontSize: '0.85rem' }}
                                onClick={async () => {
                                  if (confirm('Supprimer cette attribution ?')) {
                                    try {
                                      await apiCall(`/api/admin/gestion-trips/${item.id_gestion}`, { method: 'DELETE' });
                                      setFeedback({ type: 'success', text: 'Attribution supprimée.' });
                                      fetchData(activeTab);
                                    } catch (error) {
                                      setFeedback({ type: 'error', text: error.message });
                                    }
                                  }
                                }}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'agences' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Agences</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouvelle agence
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer une agence</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/agences', formData);
                      }}
                    >
                      <label>
                        Nom de l&apos;agence *
                        <input
                          required
                          value={formData.nom_agence || ''}
                          onChange={(e) => setFormData({ ...formData, nom_agence: e.target.value })}
                        />
                      </label>
                      <label>
                        Ville *
                        <input
                          required
                          value={formData.ville_agence || ''}
                          onChange={(e) => setFormData({ ...formData, ville_agence: e.target.value })}
                        />
                      </label>
                      <label>
                        Adresse
                        <textarea
                          value={formData.adresse_agence || ''}
                          onChange={(e) => setFormData({ ...formData, adresse_agence: e.target.value })}
                        />
                      </label>
                      <label>
                        Téléphone
                        <input
                          value={formData.tel_agence || ''}
                          onChange={(e) => setFormData({ ...formData, tel_agence: e.target.value })}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={formData.email_agence || ''}
                          onChange={(e) => setFormData({ ...formData, email_agence: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {agences.length === 0 ? (
                  <p>Aucune agence enregistrée.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Ville</th>
                          <th>Adresse</th>
                          <th>Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agences.map((item) => (
                          <tr key={item.id_agence}>
                            <td>{item.nom_agence}</td>
                            <td>{item.ville_agence}</td>
                            <td>{item.adresse_agence || '—'}</td>
                            <td>
                              {item.tel_agence && <div>{item.tel_agence}</div>}
                              {item.email_agence && <div>{item.email_agence}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vehicules' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Véhicules</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouveau véhicule
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer un véhicule</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/vehicules', formData);
                      }}
                    >
                      <label>
                        Type *
                        <select
                          required
                          value={formData.type_vehicule || ''}
                          onChange={(e) => setFormData({ ...formData, type_vehicule: e.target.value })}
                        >
                          <option value="">Sélectionner</option>
                          <option value="BUS">BUS</option>
                          <option value="VAN">VAN</option>
                          <option value="MINIBUS">MINIBUS</option>
                          <option value="AUTRE">AUTRE</option>
                        </select>
                      </label>
                      <label>
                        Immatriculation *
                        <input
                          required
                          value={formData.immatriculation || ''}
                          onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                        />
                      </label>
                      <label>
                        Nombre de places *
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.nombre_places || ''}
                          onChange={(e) => setFormData({ ...formData, nombre_places: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        Marque
                        <input
                          value={formData.marque || ''}
                          onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                        />
                      </label>
                      <label>
                        Désignation
                        <input
                          value={formData.designation || ''}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        />
                      </label>
                      <label>
                        Statut
                        <select
                          value={formData.statut || 'ACTIF'}
                          onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                        >
                          <option value="ACTIF">ACTIF</option>
                          <option value="EN_MAINTENANCE">EN_MAINTENANCE</option>
                          <option value="INACTIF">INACTIF</option>
                        </select>
                      </label>
                      <label>
                        Agence
                        <select
                          value={formData.id_agence || ''}
                          onChange={(e) => setFormData({ ...formData, id_agence: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">Aucune</option>
                          {agences.map((a) => (
                            <option key={a.id_agence} value={a.id_agence}>
                              {a.nom_agence} - {a.ville_agence}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {vehicules.length === 0 ? (
                  <p>Aucun véhicule enregistré.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Immatriculation</th>
                          <th>Type</th>
                          <th>Places</th>
                          <th>Marque</th>
                          <th>Agence</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicules.map((item) => (
                          <tr key={item.id_vehicule}>
                            <td><strong>{item.immatriculation}</strong></td>
                            <td>{item.type_vehicule}</td>
                            <td>{item.nombre_places}</td>
                            <td>{item.marque || '—'}</td>
                            <td>{item.nom_agence ? `${item.nom_agence} (${item.ville_agence})` : '—'}</td>
                            <td>
                              <span className={`badge status-${item.statut.toLowerCase().replace('_', '-')}`}>
                                {item.statut}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'employes' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Employés</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouvel employé
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer un employé</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/employes', formData);
                      }}
                    >
                      <label>
                        Nom *
                        <input
                          required
                          value={formData.nom || ''}
                          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        />
                      </label>
                      <label>
                        Prénom *
                        <input
                          required
                          value={formData.prenom || ''}
                          onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        />
                      </label>
                      <label>
                        Poste *
                        <select
                          required
                          value={formData.poste || ''}
                          onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                        >
                          <option value="">Sélectionner</option>
                          <option value="Chauffeur">Chauffeur</option>
                          <option value="Mecanicien">Mécanicien</option>
                          <option value="AgentReservation">Agent de réservation</option>
                          <option value="Comptable">Comptable</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </label>
                      {formData.poste === 'Chauffeur' && (
                        <label>
                          Expérience
                          <input
                            value={formData.experience || ''}
                            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                            placeholder="ex: 10 ans d'expérience"
                          />
                        </label>
                      )}
                      {formData.poste === 'Mecanicien' && (
                        <label>
                          Spécialité
                          <input
                            value={formData.specialite || ''}
                            onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                            placeholder="ex: Moteurs, Freinage"
                          />
                        </label>
                      )}
                      <label>
                        Email
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </label>
                      <label>
                        Téléphone
                        <input
                          value={formData.telephone || ''}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        />
                      </label>
                      <label>
                        Date de naissance
                        <input
                          type="date"
                          value={formData.date_naissance || ''}
                          onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {employes.length === 0 ? (
                  <p>Aucun employé enregistré.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Poste</th>
                          <th>Contact</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employes.map((item) => (
                          <tr key={item.id_employe}>
                            <td>{item.nom}</td>
                            <td>{item.prenom}</td>
                            <td>{item.poste}</td>
                            <td>
                              {item.email && <div>{item.email}</div>}
                              {item.telephone && <div>{item.telephone}</div>}
                            </td>
                            <td>
                              <span className={`badge ${item.actif ? 'status-active' : ''}`}>
                                {item.actif ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chauffeurs' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Chauffeurs disponibles</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouveau chauffeur
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer un chauffeur</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/employes', {
                          ...formData,
                          poste: 'Chauffeur'
                        });
                      }}
                    >
                      <label>
                        Nom *
                        <input
                          required
                          value={formData.nom || ''}
                          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        />
                      </label>
                      <label>
                        Prénom *
                        <input
                          required
                          value={formData.prenom || ''}
                          onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        />
                      </label>
                      <label>
                        Expérience
                        <input
                          value={formData.experience || ''}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          placeholder="ex: 10 ans d'expérience"
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </label>
                      <label>
                        Téléphone
                        <input
                          value={formData.telephone || ''}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        />
                      </label>
                      <label>
                        Date de naissance
                        <input
                          type="date"
                          value={formData.date_naissance || ''}
                          onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {chauffeurs.length === 0 ? (
                  <p>Aucun chauffeur actif.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Expérience</th>
                          <th>Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chauffeurs.map((item) => (
                          <tr key={item.id_employe}>
                            <td>{item.nom}</td>
                            <td>{item.prenom}</td>
                            <td>{item.experience || '—'}</td>
                            <td>
                              {item.email && <div>{item.email}</div>}
                              {item.telephone && <div>{item.telephone}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'maintenances' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Maintenances</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouvelle maintenance
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer une maintenance</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/maintenances', formData);
                      }}
                    >
                      <label>
                        Véhicule *
                        <select
                          required
                          value={formData.id_vehicule || ''}
                          onChange={(e) => setFormData({ ...formData, id_vehicule: Number(e.target.value) })}
                        >
                          <option value="">Sélectionner</option>
                          {vehicules.map((v) => (
                            <option key={v.id_vehicule} value={v.id_vehicule}>
                              {v.immatriculation} - {v.type_vehicule}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Type de maintenance *
                        <input
                          required
                          value={formData.type_maintenance || ''}
                          onChange={(e) => setFormData({ ...formData, type_maintenance: e.target.value })}
                          placeholder="ex: Révision générale"
                        />
                      </label>
                      <label>
                        Description des travaux
                        <textarea
                          value={formData.description_travaux || ''}
                          onChange={(e) => setFormData({ ...formData, description_travaux: e.target.value })}
                        />
                      </label>
                      <label>
                        Zone d&apos;intervention
                        <input
                          value={formData.zone_intervention || ''}
                          onChange={(e) => setFormData({ ...formData, zone_intervention: e.target.value })}
                        />
                      </label>
                      <label>
                        Date de fin (optionnel)
                        <input
                          type="datetime-local"
                          value={formData.date_fin || ''}
                          onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {maintenances.length === 0 ? (
                  <p>Aucune maintenance enregistrée.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Véhicule</th>
                          <th>Type</th>
                          <th>Date début</th>
                          <th>Date fin</th>
                          <th>Zone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenances.map((item) => (
                          <tr key={item.id_maintenance}>
                            <td>{item.immatriculation}</td>
                            <td>{item.type_maintenance}</td>
                            <td>{new Date(item.date_debut).toLocaleString('fr-FR')}</td>
                            <td>{item.date_fin ? new Date(item.date_fin).toLocaleString('fr-FR') : 'En cours'}</td>
                            <td>{item.zone_intervention || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'partenaires' && (
              <div className="admin-table">
                <div className="section-heading">
                  <h2>Partenaires</h2>
                  <button className="primary" onClick={() => setShowForm(true)}>
                    + Nouveau partenaire
                  </button>
                </div>
                {showForm && (
                  <div className="admin-form">
                    <h3>Créer un partenaire</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit('/api/admin/partenaires', formData);
                      }}
                    >
                      <label>
                        Nom du partenaire *
                        <input
                          required
                          value={formData.nom_partenaire || ''}
                          onChange={(e) => setFormData({ ...formData, nom_partenaire: e.target.value })}
                        />
                      </label>
                      <label>
                        Service offert
                        <input
                          value={formData.service_offert || ''}
                          onChange={(e) => setFormData({ ...formData, service_offert: e.target.value })}
                        />
                      </label>
                      <label>
                        Adresse
                        <textarea
                          value={formData.adresse_partenaire || ''}
                          onChange={(e) => setFormData({ ...formData, adresse_partenaire: e.target.value })}
                        />
                      </label>
                      <label>
                        Téléphone
                        <input
                          value={formData.telephone || ''}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit" className="primary">
                          Créer
                        </button>
                        <button type="button" className="ghost" onClick={() => { setShowForm(false); setFormData({}); }}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {partenaires.length === 0 ? (
                  <p>Aucun partenaire enregistré.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Service</th>
                          <th>Adresse</th>
                          <th>Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partenaires.map((item) => (
                          <tr key={item.id_partenaire}>
                            <td>{item.nom_partenaire}</td>
                            <td>{item.service_offert || '—'}</td>
                            <td>{item.adresse_partenaire || '—'}</td>
                            <td>
                              {item.telephone && <div>{item.telephone}</div>}
                              {item.email && <div>{item.email}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem('touristique_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [searchParams, setSearchParams] = useState(null);
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('touristique_admin_token');
  });
  const [portal, setPortal] = useState(() => {
    if (typeof window === 'undefined') return 'client';
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'client';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('touristique_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('touristique_user');
    }
  }, [user]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('touristique_admin_token', adminToken);
    } else {
      localStorage.removeItem('touristique_admin_token');
    }
  }, [adminToken]);

  useEffect(() => {
    const handlePopState = () => {
      const mode = window.location.pathname.startsWith('/admin') ? 'admin' : 'client';
      setPortal(mode);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setSearchParams(null);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/admin');
      setPortal('admin');
    }
  };

  return (
    <div className="app">
      {portal === 'admin' ? (
        adminToken ? (
          <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />
        ) : (
          <AdminLogin
            onSuccess={(token) => {
              setAdminToken(token);
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/admin');
                setPortal('admin');
              }
            }}
            onBack={() => {
              window.history.pushState(null, '', '/');
              setPortal('client');
            }}
          />
        )
      ) : !user ? (
        <AuthSection
          onSuccess={(connectedUser) => {
            setUser(connectedUser);
            setSearchParams(null);
          }}
        />
      ) : !searchParams ? (
        <TravelSearch user={user} onLogout={handleLogout} onConfirm={(params) => setSearchParams(params)} />
      ) : (
        <Dashboard
          user={user}
          searchParams={searchParams}
          onResetSearch={() => setSearchParams(null)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
