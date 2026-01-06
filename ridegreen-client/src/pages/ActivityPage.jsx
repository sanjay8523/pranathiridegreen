// Fixed ActivityPage.jsx with corrected rating logic
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Car,
  MapPin,
  Users,
  CheckCircle,
  TrendingUp,
  Loader,
  Star,
  Shield,
  Phone,
  Mail,
  Calendar,
  Clock,
  Navigation,
  AlertCircle,
} from "lucide-react";
import RatingModal from "../components/RatingModal";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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

const ActivityPage = () => {
  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const [ridesResponse, bookingsResponse] = await Promise.all([
        api.get(`/rides/driver/${user.id}`),
        api.get(`/bookings/passenger/${user.id}`),
      ]);
      setMyRides(ridesResponse.data);
      setMyBookings(bookingsResponse.data);
    } catch (error) {
      console.error("Error fetching activity:", error);
      alert("Failed to load activity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async (rideId) => {
    if (
      !window.confirm(
        "Mark this ride as completed? All passengers will be able to rate you after this."
      )
    )
      return;

    try {
      const response = await api.put(`/rides/${rideId}/complete`);
      alert(
        response.data.message ||
          "Ride marked as completed! Passengers can now rate their experience."
      );
      fetchActivity();
    } catch (error) {
      console.error("Error completing ride:", error);
      alert(error.response?.data?.error || "Failed to complete ride");
    }
  };

  const handleRateUser = async (booking) => {
    try {
      const response = await api.get(`/ratings/can-rate/${booking.id}`);
      if (!response.data.canRate) {
        alert(response.data.reason);
        return;
      }

      setSelectedRating({
        bookingId: booking.id,
        rideId: booking.ride?._id,
        userToRate: {
          id: response.data.ratedUserId,
          name: booking.driver || booking.passenger?.name,
          profilePicture: null,
        },
        ratingType: response.data.ratingType,
        rideDetails: booking.ride
          ? {
              origin: booking.origin,
              destination: booking.destination,
              date: booking.date,
              time: booking.time,
            }
          : null,
      });
      setShowRatingModal(true);
    } catch (error) {
      console.error("Error checking rating:", error);
      alert("Failed to open rating form");
    }
  };

  const handleRatingSuccess = () => {
    fetchActivity();
  };

  const viewUserProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black mb-8 text-gray-800">My Activity</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Rides I Posted (Driver View) */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Car className="text-emerald-600" size={32} />
              <h2 className="text-2xl font-bold text-gray-800">
                Rides I Posted
              </h2>
            </div>

            {myRides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No rides posted yet
              </p>
            ) : (
              <div className="space-y-4">
                {myRides.map((ride) => (
                  <div
                    key={ride._id}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 capitalize">
                          {ride.origin} → {ride.destination}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar size={14} />
                            {ride.date}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock size={14} />
                            {ride.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-600">
                          ₹{ride.totalEarnings || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total Earnings
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ride.status === "active"
                            ? "bg-green-100 text-green-700"
                            : ride.status === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ride.status.toUpperCase()}
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {ride.availableSeats}/{ride.seats} seats left
                      </span>
                    </div>

                    {/* Passengers List */}
                    {ride.bookings && ride.bookings.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="text-emerald-600" size={16} />
                          <span className="text-sm font-semibold text-gray-700">
                            Passengers ({ride.bookings.length})
                          </span>
                        </div>
                        {ride.bookings.map((booking, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-lg mb-2 border border-emerald-200"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {booking.passenger}
                                </p>
                                {booking.phone && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Phone size={12} />
                                    {booking.phone}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-gray-800">
                                  {booking.seats} seats
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  {booking.paid && (
                                    <span className="flex items-center gap-1 text-green-600 text-xs">
                                      <CheckCircle size={12} />
                                      Paid
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Complete Ride Button - Show for active rides OR completed rides with all seats booked */}
                    {((ride.status === "active" &&
                      ride.bookings &&
                      ride.bookings.length > 0) ||
                      (ride.status === "completed" &&
                        ride.availableSeats === 0)) && (
                      <button
                        onClick={() => handleCompleteRide(ride._id)}
                        disabled={ride.status === "completed"}
                        className={`w-full py-2 rounded-lg font-semibold transition ${
                          ride.status === "completed"
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        }`}
                      >
                        {ride.status === "completed"
                          ? "Ride Completed ✓"
                          : "Mark as Completed"}
                      </button>
                    )}

                    {ride.status === "completed" && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                        <p className="text-xs text-blue-800 flex items-center gap-1">
                          <Shield size={14} />
                          Ride completed. Funds will be released 2 days after
                          completion.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rides I Booked (Passenger View) */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="text-blue-600" size={32} />
              <h2 className="text-2xl font-bold text-gray-800">My Bookings</h2>
            </div>

            {myBookings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 capitalize">
                          {booking.origin} → {booking.destination}
                        </h3>
                        <div
                          onClick={() => viewUserProfile(booking.driverId)}
                          className="text-sm text-gray-600 mt-2 cursor-pointer hover:text-emerald-600 flex items-center gap-2"
                        >
                          <span>Driver: {booking.driver}</span>
                          {booking.driverRating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star
                                size={12}
                                className="text-yellow-500 fill-yellow-500"
                              />
                              <span>{booking.driverRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar size={14} />
                            {booking.date}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock size={14} />
                            {booking.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-blue-600">
                          ₹{booking.amount}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.seats} seats
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {booking.status.toUpperCase()}
                        </span>
                        {booking.paymentStatus === "completed" && (
                          <>
                            <CheckCircle className="text-green-600" size={16} />
                            <span className="text-sm font-semibold text-green-700">
                              Payment Confirmed
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rate Driver Button - Show ONLY for completed rides that haven't been rated */}
                    {booking.status === "completed" && !booking.rated && (
                      <button
                        onClick={() => handleRateUser(booking)}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                      >
                        <Star size={18} />
                        Rate Your Driver
                      </button>
                    )}

                    {booking.rated && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle size={16} />
                          You've rated this ride. Thank you for your feedback!
                        </p>
                      </div>
                    )}

                    {booking.status === "confirmed" && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-xs text-yellow-800 flex items-center gap-1">
                          <AlertCircle size={14} />
                          Ride confirmed. Rating will be available after driver
                          marks ride as completed.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        ratingData={selectedRating}
        onSuccess={handleRatingSuccess}
      />
    </div>
  );
};

export default ActivityPage;
