import React from "react";
import { Link } from "react-router-dom";
import { Car } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-emerald-100 p-4 rounded-full mb-6">
        <Car size={64} className="text-emerald-600" />
      </div>
      <h1 className="text-5xl font-bold text-gray-800 mb-4">
        Eco-Friendly <span className="text-emerald-600">Carpooling</span>
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        Save money, reduce traffic, and help the environment by sharing rides.
      </p>
      <div className="flex gap-4">
        <Link
          to="/register"
          className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition"
        >
          Get Started
        </Link>
        <Link
          to="/rides"
          className="bg-white text-gray-800 border border-gray-200 px-8 py-3 rounded-xl text-lg font-semibold hover:shadow-lg transition"
        >
          Find a Ride
        </Link>
      </div>
    </div>
  );
};

export default Home;
