import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapPin, Calendar, DollarSign } from "lucide-react";

const AllRides = () => {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/rides")
      .then((res) => setRides(res.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">Available Rides</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {rides.map((ride) => (
          <div
            key={ride._id}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition"
          >
            <div className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-800">
              <MapPin className="text-emerald-600" /> {ride.origin} ➝{" "}
              {ride.destination}
            </div>
            <div className="space-y-2 text-gray-600 mb-4">
              <div className="flex gap-2">
                <Calendar size={18} />{" "}
                {new Date(ride.date).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <DollarSign size={18} /> ₹{ride.price} per seat
              </div>
            </div>
            <button className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800">
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllRides;
