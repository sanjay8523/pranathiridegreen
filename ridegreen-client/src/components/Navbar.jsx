import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Car, LogOut } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold text-emerald-600"
        >
          <Car /> RideGreen
        </Link>
        <div className="flex gap-4">
          <Link
            to="/"
            className="text-gray-600 hover:text-emerald-600 font-medium"
          >
            Home
          </Link>
          <Link
            to="/rides"
            className="text-gray-600 hover:text-emerald-600 font-medium"
          >
            Find Rides
          </Link>
          {user ? (
            <>
              <Link
                to="/post"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                Post Ride
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-gray-600 hover:text-red-500"
              >
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-600 hover:text-emerald-600 font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="border border-emerald-600 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
