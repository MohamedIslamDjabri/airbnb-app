import { useContext, useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import axios from "axios";
import { Navigate } from "react-router-dom";
import { UserContext } from "./UserContext.jsx";

export default function BookingWidget({ place }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [redirect, setRedirect] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useContext(UserContext);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  let numberOfNights = 0;

  if (checkIn && checkOut) {
    numberOfNights = differenceInCalendarDays(
      new Date(checkOut),
      new Date(checkIn)
    );
  }

  async function bookThisPlace() {
    // 🔴 VALIDATION FIRST
    if (!checkIn || !checkOut) {
      return alert("Please select check-in and check-out dates");
    }

    if (numberOfNights <= 0) {
      return alert("Check-out must be after check-in");
    }

    if (!name || !phone) {
      return alert("Please fill in your name and phone number");
    }

    try {
      setLoading(true);

      const response = await axios.post('/bookings', {
        checkIn,
        checkOut,
        numberOfGuests,
        name,
        phone,
        place: place._id,
        price: numberOfNights * place.price,
      });

      const bookingId = response.data._id;
      setRedirect(`/account/bookings/${bookingId}`);

    } catch (err) {
      console.error("Booking error:", err);
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  return (
    <div className="bg-white shadow p-4 rounded-2xl">

      {/* PRICE */}
      <div className="text-2xl text-center">
        Price: ${place.price} / per night
      </div>

      {/* FORM */}
      <div className="border rounded-2xl mt-4">

        {/* DATES */}
        <div className="flex">
          <div className="py-3 px-4">
            <label>Check in:</label>
            <input
              type="date"
              value={checkIn}
              onChange={ev => setCheckIn(ev.target.value)}
            />
          </div>

          <div className="py-3 px-4 border-l">
            <label>Check out:</label>
            <input
              type="date"
              value={checkOut}
              onChange={ev => setCheckOut(ev.target.value)}
            />
          </div>
        </div>

        {/* GUESTS */}
        <div className="py-3 px-4 border-t">
          <label>Number of guests:</label>
          <input
            type="number"
            value={numberOfGuests}
            onChange={ev => setNumberOfGuests(Number(ev.target.value))}
            min={1}
          />
        </div>

        {/* ONLY SHOW WHEN VALID DATES */}
        {numberOfNights > 0 && (
          <div className="py-3 px-4 border-t flex flex-col gap-2">
            <label>Your full name:</label>
            <input
              type="text"
              value={name}
              onChange={ev => setName(ev.target.value)}
            />

            <label>Phone number:</label>
            <input
              type="tel"
              value={phone}
              onChange={ev => setPhone(ev.target.value)}
            />
          </div>
        )}
      </div>

      {/* BUTTON */}
      <button
        onClick={bookThisPlace}
        disabled={loading}
        className="primary mt-4 w-full"
      >
        {loading ? "Processing..." : "Book this place"}

        {numberOfNights > 0 && (
          <span> ${numberOfNights * place.price}</span>
        )}
      </button>
    </div>
  );
}