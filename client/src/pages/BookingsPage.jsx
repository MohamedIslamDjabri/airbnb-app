import AccountNav from "../AccountNav";
import { useEffect, useState } from "react";
import axios from "axios";
import PlaceImg from "../PlaceImg";
import { Link } from "react-router-dom";
import BookingDates from "../BookingDates";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/bookings')
      .then(response => {
        setBookings(response.data);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load bookings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 mt-10">{error}</div>;
  }

  return (
    <div>
      <AccountNav />

      <div className="space-y-4 mt-4">
        {bookings.length === 0 && (
          <div className="text-center text-gray-500">
            No bookings yet
          </div>
        )}

        {bookings.map(booking => (
          <Link
            key={booking._id}
            to={`/account/bookings/${booking._id}`}
            className="flex gap-4 bg-gray-200 rounded-2xl overflow-hidden hover:bg-gray-300 transition"
          >
            <div className="w-48 shrink-0">
              <PlaceImg place={booking.place} />
            </div>

            <div className="py-3 pr-3 grow">
              <h2 className="text-xl font-semibold">
                {booking.place.title}
              </h2>

              <BookingDates
                booking={booking}
                className="mb-2 mt-2 text-gray-500"
              />

              <div className="flex gap-2 items-center mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>

                <span className="text-lg font-bold">
                  ${booking.price}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}