import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PostRide = () => {
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    date: "",
    price: "",
    seats: "",
  });
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/rides", {
        ...formData,
        driver: user.id,
      });
      navigate("/rides");
    } catch (err) {
      alert("Error posting ride");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Post a New Ride</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="origin"
          placeholder="From (City)"
          onChange={handleChange}
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          name="destination"
          placeholder="To (City)"
          onChange={handleChange}
          className="w-full p-3 border rounded-lg"
          required
        />
        <input
          name="date"
          type="date"
          onChange={handleChange}
          className="w-full p-3 border rounded-lg"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            name="price"
            type="number"
            placeholder="Price"
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
          <input
            name="seats"
            type="number"
            placeholder="Seats"
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>
        <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold">
          Post Ride
        </button>
      </form>
    </div>
  );
};

export default PostRide;
