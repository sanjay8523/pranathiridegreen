import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  Star,
  MapPin,
  Calendar,
  Shield,
  TrendingUp,
  Award,
  Loader,
} from "lucide-react";

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

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}`);
      setProfile(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      alert("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">User not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-emerald-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { user, stats, recentRatings } = profile;

  return (
    <div className="min-h-screen pt-28 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-emerald-600 font-semibold"
        >
          ← Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture */}
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-5xl shadow-lg">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.name[0]
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-3xl font-black text-gray-800">
                  {user.name}
                </h1>
                {user.verified && (
                  <Shield className="text-blue-500" size={24} />
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={
                        i < Math.round(user.rating || 0)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
                <span className="text-xl font-bold text-gray-800">
                  {(user.rating || 0).toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({user.totalRatings || 0} ratings)
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-600 justify-center md:justify-start">
                  <Mail size={18} />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-gray-600 justify-center md:justify-start">
                    <Phone size={18} />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-gray-500 text-sm justify-center md:justify-start">
                <Calendar size={16} />
                <span>
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <MapPin className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-800">
                  {stats.ridesPosted}
                </div>
                <div className="text-sm text-gray-600">Rides Posted</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-800">
                  {stats.bookingsMade}
                </div>
                <div className="text-sm text-gray-600">Rides Taken</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Award className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-800">
                  {stats.ridesCompleted}
                </div>
                <div className="text-sm text-gray-600">Completed Rides</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Ratings */}
        {recentRatings && recentRatings.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-black mb-6 text-gray-800">
              Recent Reviews
            </h2>
            <div className="space-y-4">
              {recentRatings.map((rating) => (
                <div
                  key={rating._id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                      {rating.ratedBy?.profilePicture ? (
                        <img
                          src={rating.ratedBy.profilePicture}
                          alt={rating.ratedBy.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        rating.ratedBy?.name?.[0]
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800">
                            {rating.ratedBy?.name}
                          </p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < rating.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {rating.review && (
                        <p className="text-gray-700 text-sm">{rating.review}</p>
                      )}
                      {rating.tags && rating.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rating.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full"
                            >
                              {tag.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
                      {rating.ride && (
                        <p className="text-xs text-gray-500 mt-2">
                          {rating.ride.origin} → {rating.ride.destination} •{" "}
                          {rating.ride.date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
