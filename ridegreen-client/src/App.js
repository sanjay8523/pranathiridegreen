// Save as: src/App.js

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import {
  Car,
  MapPin,
  Search,
  LogOut,
  Navigation,
  Star,
  Shield,
  LocateFixed,
  Phone,
  Mail,
  AlertCircle,
  Loader,
  User as UserIcon,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Note: Ensure these components exist in your project structure
// or create placeholder files for them to avoid build errors.
import ActivityPage from "./pages/ActivityPage";
import UserProfile from "./pages/UserProfile";

// --- API Configuration ---
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID;

// Axios instance
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Leaflet Icon Fixes ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const carIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -15],
});

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -15],
});

// --- Helper Functions ---

async function geocodeLocation(locationName) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationName
      )}&limit=1`
    );
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

// --- Components ---

const MapView = ({ from, to, userLoc, showRoute = true }) => {
  function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
      if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    }, [bounds, map]);
    return null;
  }

  const points = [];
  if (from) points.push(from);
  if (to) points.push(to);
  if (userLoc) points.push([userLoc.lat, userLoc.lng]);

  const bounds = points.length > 1 ? L.latLngBounds(points) : null;

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/20 z-0 relative">
      <MapContainer
        center={from || [12.9716, 77.5946]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap"
        />
        {bounds && <ChangeView bounds={bounds} />}

        {from && (
          <Marker position={from} icon={carIcon}>
            <Popup>
              <div className="font-semibold">Driver Pickup Point</div>
            </Popup>
          </Marker>
        )}

        {to && (
          <Marker position={to}>
            <Popup>
              <div className="font-semibold">Destination</div>
            </Popup>
          </Marker>
        )}

        {userLoc && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Popup>
              <div className="font-semibold text-blue-600">You are here</div>
            </Popup>
          </Marker>
        )}

        {showRoute && from && to && (
          <Polyline
            positions={[from, to]}
            color="#10b981"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}

        {showRoute && userLoc && from && (
          <Polyline
            positions={[[userLoc.lat, userLoc.lng], from]}
            color="#3b82f6"
            weight={3}
            opacity={0.6}
            dashArray="5, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

const Navbar = ({ user, logout }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-r from-emerald-600 to-teal-600 backdrop-blur-xl border-b border-white/10 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div
          onClick={() => navigate(user ? "/search" : "/")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-white p-2.5 rounded-xl group-hover:scale-110 transition-transform">
            <Car className="text-emerald-600" size={28} />
          </div>
          <span className="text-3xl font-black text-white tracking-tight">
            RideGreen
          </span>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <button
                onClick={() => navigate("/search")}
                className="text-white/90 hover:text-white font-semibold transition flex items-center gap-2"
              >
                <Search size={18} />
                Find Rides
              </button>
              <button
                onClick={() => navigate("/activity")}
                className="text-white/90 hover:text-white font-semibold transition"
              >
                My Activity
              </button>
              <button
                onClick={() => navigate("/post")}
                className="bg-white text-emerald-600 px-6 py-2.5 rounded-full hover:bg-emerald-50 transition font-bold shadow-lg"
              >
                Post Ride
              </button>
              <button
                onClick={() => navigate(`/profile/${user.id}`)}
                className="text-white/90 hover:text-white transition"
                title="My Profile"
              >
                <UserIcon size={20} />
              </button>
              <button
                onClick={logout}
                className="text-white/90 hover:text-red-300 transition"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="text-white/90 hover:text-white font-semibold transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/register")}
                className="bg-white text-emerald-600 px-6 py-2.5 rounded-full font-bold hover:bg-emerald-50 transition shadow-lg"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const SearchRides = () => {
  const [rides, setRides] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRides();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error("Location access denied:", err)
      );
    }
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await api.get("/rides");
      setRides(response.data);
      setFilteredRides(response.data);
    } catch (error) {
      console.error("Error fetching rides:", error);
      alert("Failed to load rides. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = rides.filter(
      (ride) =>
        ride.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.origin.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRides(filtered);
  }, [searchTerm, rides]);

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <Loader className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by destination or pickup location..."
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-gray-800">
              Available Rides
            </h2>
            <p className="text-gray-600 mb-6">
              {filteredRides.length} rides found • Distances calculated from
              your location
            </p>

            <div className="space-y-4">
              {filteredRides.length === 0 ? (
                <div className="p-12 bg-white rounded-2xl text-center shadow-lg">
                  <AlertCircle
                    className="mx-auto mb-4 text-gray-400"
                    size={48}
                  />
                  <p className="text-gray-600 text-lg">
                    No rides match your search
                  </p>
                </div>
              ) : (
                filteredRides.map((ride) => {
                  const dist = userLoc
                    ? getDistance(
                        userLoc.lat,
                        userLoc.lng,
                        ride.fromCoords.lat,
                        ride.fromCoords.lng
                      )
                    : "...";

                  return (
                    <div
                      key={ride._id}
                      className="bg-white p-6 rounded-2xl hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-emerald-500 group"
                      onClick={() =>
                        navigate(`/ride/${ride._id}`, {
                          state: { ride, userLoc },
                        })
                      }
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 flex-1">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${ride.driver._id}`);
                            }}
                            className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg cursor-pointer hover:scale-110 transition"
                          >
                            {ride.driver?.name?.[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className="font-bold text-lg text-gray-800 cursor-pointer hover:text-emerald-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${ride.driver._id}`);
                                }}
                              >
                                {ride.driver?.name}
                              </h3>
                              {ride.verified && (
                                <Shield className="text-blue-500" size={16} />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500 mb-2">
                              <Star size={14} fill="currentColor" />
                              <span className="text-sm font-semibold">
                                {(ride.driver?.rating || 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({ride.driver?.totalRatings || 0})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold capitalize">
                                {dist} km away
                              </span>
                              <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
                                {ride.availableSeats} seats
                              </span>
                              <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold">
                                {ride.time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-emerald-600">
                            ₹{ride.price}
                          </div>
                          <div className="text-xs text-gray-500">per seat</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm bg-gray-50 p-4 rounded-xl">
                        <MapPin size={18} className="text-emerald-500" />
                        <span className="font-semibold text-gray-700 capitalize">
                          {ride.origin}
                        </span>
                        <Navigation size={16} className="text-gray-400" />
                        <MapPin size={18} className="text-red-500" />
                        <span className="font-semibold text-gray-700 capitalize">
                          {ride.destination}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="hidden lg:block sticky top-24 h-[600px]">
            <MapView
              userLoc={userLoc}
              from={null}
              to={null}
              showRoute={false}
            />
            <div className="mt-4 bg-white p-4 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <Navigation size={18} />
                <span>Your current location shown on map</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RideDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ride = state?.ride;
  const userLoc = state?.userLoc;

  const [seats, setSeats] = useState(1);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setEmail(user.email);
    }
  }, []);

  if (!ride) return <Navigate to="/search" />;

  const totalPrice = ride.price * seats;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!phone || !email) {
      alert("Please fill in your contact details");
      return;
    }

    if (!RAZORPAY_KEY) {
      alert("Razorpay key not configured");
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const orderResponse = await api.post("/payments/create-order", {
        rideId: ride._id,
        seatsBooked: seats,
        passengerName: user.name,
        passengerPhone: phone,
        passengerEmail: email,
      });

      const { orderId, amount, currency, bookingId, key } = orderResponse.data;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Failed to load payment gateway. Please try again.");
        setLoading(false);
        return;
      }

      const options = {
        key: key,
        amount: amount * 100,
        currency: currency,
        order_id: orderId,
        name: "RideGreen",
        description: `${ride.origin} → ${ride.destination}`,
        image: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
        handler: async function (response) {
          try {
            const verifyResponse = await api.post("/payments/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingId,
            });

            if (verifyResponse.data.success) {
              alert("Payment successful! Booking confirmed.");
              navigate("/activity");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user.name,
          email: email,
          contact: phone,
        },
        theme: {
          color: "#10b981",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);
    } catch (error) {
      console.error("Payment error:", error);
      alert(error.response?.data?.error || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-emerald-600 font-semibold flex items-center gap-2"
        >
          ← Back to Search
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <div
                  onClick={() => navigate(`/profile/${ride.driver._id}`)}
                  className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg cursor-pointer hover:scale-110 transition"
                >
                  {ride.driver?.name?.[0]}
                </div>
                <div>
                  <h3
                    className="text-xl font-bold text-gray-800 cursor-pointer hover:text-emerald-600"
                    onClick={() => navigate(`/profile/${ride.driver._id}`)}
                  >
                    {ride.driver?.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Star
                      size={16}
                      fill="#fbbf24"
                      className="text-yellow-500"
                    />
                    <span className="font-semibold">
                      {(ride.driver?.rating || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({ride.driver?.totalRatings || 0} ratings)
                    </span>
                    {ride.verified && (
                      <>
                        <Shield className="text-blue-500 ml-2" size={16} />
                        <span className="text-sm text-gray-600">Verified</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {ride.driver?.ridesCompleted || 0} rides completed
                  </p>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-4 text-gray-800">
                Book Your Ride
              </h1>
              <p className="text-gray-600 mb-6">
                Payment is held securely until ride completion
              </p>

              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl space-y-3 border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">
                      Price per seat
                    </span>
                    <span className="text-xl font-bold text-gray-800">
                      ₹{ride.price}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">
                      Seats required
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={ride.availableSeats}
                      value={seats}
                      onChange={(e) =>
                        setSeats(
                          Math.min(
                            parseInt(e.target.value) || 1,
                            ride.availableSeats
                          )
                        )
                      }
                      className="w-20 bg-white border-2 border-emerald-300 rounded-lg p-2 text-center text-gray-800 font-bold"
                    />
                  </div>
                  <div className="h-px bg-emerald-300 my-2"></div>
                  <div className="flex justify-between text-2xl font-black text-emerald-600">
                    <span>Total Amount</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-gray-700 font-semibold">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      className="w-full pl-12 bg-gray-50 border-2 border-gray-200 p-3 rounded-xl text-gray-800 focus:border-emerald-500 outline-none"
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-gray-700 font-semibold">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      className="w-full pl-12 bg-gray-50 border-2 border-gray-200 p-3 rounded-xl text-gray-800 focus:border-emerald-500 outline-none"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </button>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="text-blue-600 mt-1" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Secure Escrow Payment</p>
                    <p>
                      Your payment is held safely until the ride is completed.
                      Funds will be released to the driver 2 days after trip
                      completion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[700px]">
            <MapView
              from={[ride.fromCoords.lat, ride.fromCoords.lng]}
              to={[ride.toCoords.lat, ride.toCoords.lng]}
              userLoc={userLoc}
              showRoute={true}
            />
            <div className="mt-4 bg-white p-4 rounded-xl shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold">Green line:</span>
                <span className="text-gray-600">Driver's route</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="font-semibold">Blue line:</span>
                <span className="text-gray-600">Your distance to pickup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostRide = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    date: "",
    time: "",
    price: "",
    seats: "",
  });
  const [coords, setCoords] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const detectLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords((prev) => ({
          ...prev,
          from: { lat: latitude, lng: longitude },
        }));
        setForm((prev) => ({ ...prev, origin: "My Current Location" }));
        setGeoLoading(false);
      },
      () => {
        alert("Please enable location access");
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coords.from && form.origin === "My Current Location") {
      alert("Please detect your location first.");
      return;
    }

    setLoading(true);

    try {
      const destCoords = await geocodeLocation(form.destination);
      if (!destCoords) {
        alert("Could not find destination location. Please check the name.");
        setLoading(false);
        return;
      }

      let originCoords = coords.from;
      if (form.origin !== "My Current Location") {
        originCoords = await geocodeLocation(form.origin);
        if (!originCoords) {
          alert("Could not find origin location. Please check the name.");
          setLoading(false);
          return;
        }
      }

      await api.post("/rides", {
        origin: form.origin,
        destination: form.destination,
        fromCoords: originCoords,
        toCoords: destCoords,
        date: form.date,
        time: form.time,
        price: parseInt(form.price),
        seats: parseInt(form.seats),
      });

      alert("Ride posted successfully!");
      navigate("/activity");
    } catch (error) {
      console.error("Error posting ride:", error);
      alert(
        error.response?.data?.error || "Failed to post ride. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white p-10 rounded-3xl shadow-2xl">
        <h2 className="text-4xl font-black mb-2 text-gray-800">Post a Ride</h2>
        <p className="text-gray-600 mb-8">
          Share your journey and earn money while helping others
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-gray-700 text-sm font-semibold mb-2 block">
              Pickup Location
            </label>
            <div className="flex gap-3">
              <input
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className="flex-1 bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                placeholder="Enter city or use GPS"
                required
              />
              <button
                type="button"
                onClick={detectLocation}
                className="bg-emerald-500 text-white p-4 rounded-xl hover:bg-emerald-600 transition disabled:opacity-50"
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader className="animate-spin" />
                ) : (
                  <LocateFixed />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-gray-700 text-sm font-semibold mb-2 block">
              Destination
            </label>
            <input
              placeholder="Bangalore"
              value={form.destination}
              onChange={(e) =>
                setForm({ ...form, destination: e.target.value })
              }
              className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 text-sm font-semibold mb-2 block">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-gray-700 text-sm font-semibold mb-2 block">
                Time
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 text-sm font-semibold mb-2 block">
                Price per Seat (₹)
              </label>
              <input
                type="number"
                placeholder="300"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-gray-700 text-sm font-semibold mb-2 block">
                Available Seats
              </label>
              <input
                type="number"
                placeholder="3"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Posting Ride...
              </>
            ) : (
              "Post Ride"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const Auth = ({ type, setUser }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("One lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("One number");
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      errors.push("No special characters");
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation for registration
    if (type === "register") {
      if (form.name.length < 3) {
        setErrors({ name: "Name must be at least 3 characters" });
        return;
      }
      if (!/^[A-Za-z\s]+$/.test(form.name)) {
        setErrors({ name: "Name must contain only letters" });
        return;
      }

      const passwordErrors = validatePassword(form.password);
      if (passwordErrors.length > 0) {
        setErrors({ password: passwordErrors.join(", ") });
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = type === "login" ? "/auth/login" : "/auth/register";
      const response = await api.post(endpoint, form);

      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      navigate("/search");
    } catch (err) {
      console.error("Auth error:", err);
      setErrors({
        general:
          err.response?.data?.error ||
          err.response?.data?.msg ||
          "Authentication failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
            <Car className="text-emerald-600" size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-800">
            {type === "login" ? "Welcome Back" : "Join RideGreen"}
          </h2>
          <p className="text-gray-600 mt-2">
            {type === "login" ? "Login to continue" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "register" && (
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <div>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-xl text-gray-800 outline-none focus:border-emerald-500"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            {type === "register" && (
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>No special characters</li>
                </ul>
              </div>
            )}
          </div>
          {errors.general && (
            <p className="text-red-500 text-sm text-center">{errors.general}</p>
          )}
          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                {type === "login" ? "Logging in..." : "Signing up..."}
              </>
            ) : (
              <>{type === "login" ? "Login" : "Sign Up"}</>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          {type === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() => navigate(type === "login" ? "/register" : "/login")}
            className="text-emerald-600 font-semibold hover:underline"
          >
            {type === "login" ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Main App Component ---

function App() {
  const [user, setUser] = useState(
    localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null
  );

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const Protected = ({ children }) =>
    user ? children : <Navigate to="/login" />;

  return (
    <Router>
      <Navbar user={user} logout={logout} />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/search" /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={<Auth type="login" setUser={setUser} />}
        />
        <Route
          path="/register"
          element={<Auth type="register" setUser={setUser} />}
        />
        <Route
          path="/search"
          element={
            <Protected>
              <SearchRides />
            </Protected>
          }
        />
        <Route
          path="/ride/:id"
          element={
            <Protected>
              <RideDetails />
            </Protected>
          }
        />
        <Route
          path="/post"
          element={
            <Protected>
              <PostRide />
            </Protected>
          }
        />
        <Route
          path="/activity"
          element={
            <Protected>
              <ActivityPage />
            </Protected>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <Protected>
              <UserProfile />
            </Protected>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
