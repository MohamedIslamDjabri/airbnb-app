import axios from "axios";
import { useState } from "react";
import Image from "./Image.jsx";

export default function PhotosUploader({ addedPhotos, onChange }) {
  const [photoLink, setPhotoLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function addPhotoByLink(ev) {
    ev.preventDefault();

    if (!photoLink.trim()) return;

    try {
      setLoading(true);

      const { data: filename } = await axios.post('/upload-by-link', {
        link: photoLink,
      });

      onChange(prev => [...prev, filename]);
      setPhotoLink('');

    } catch (err) {
      console.error("Upload by link failed:", err);
      alert("Failed to upload image");
    } finally {
      setLoading(false);
    }
  }

  async function uploadPhoto(ev) {
    const files = ev.target.files;
    if (!files.length) return;

    const data = new FormData();

    for (let i = 0; i < files.length; i++) {
      data.append('photos', files[i]);
    }

    try {
      setLoading(true);

      const { data: filenames } = await axios.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onChange(prev => [...prev, ...filenames]);

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function removePhoto(ev, filename) {
    ev.preventDefault();
    onChange(prev => prev.filter(photo => photo !== filename));
  }

  function selectAsMainPhoto(ev, filename) {
    ev.preventDefault();
    onChange(prev => [
      filename,
      ...prev.filter(photo => photo !== filename),
    ]);
  }

  return (
    <>
      {/* LINK UPLOAD */}
      <div className="flex gap-2">
        <input
          value={photoLink}
          onChange={ev => setPhotoLink(ev.target.value)}
          type="text"
          placeholder="Add using a link...jpg"
          className="border rounded-2xl px-3 py-1 w-full"
        />
        <button
          onClick={addPhotoByLink}
          disabled={loading}
          className="bg-gray-200 px-4 rounded-2xl"
        >
          {loading ? "Adding..." : "Add photo"}
        </button>
      </div>

      {/* PHOTOS GRID */}
      <div className="mt-2 grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {addedPhotos.map(link => (
          <div className="h-32 flex relative" key={link}>
            <Image
              className="rounded-2xl w-full object-cover"
              src={link}
              alt=""
            />

            {/* DELETE */}
            <button
              onClick={ev => removePhoto(ev, link)}
              className="absolute bottom-1 right-1 text-white bg-black/50 rounded-2xl p-2"
            >
              ❌
            </button>

            {/* MAIN PHOTO */}
            <button
              onClick={ev => selectAsMainPhoto(ev, link)}
              className="absolute bottom-1 left-1 text-white bg-black/50 rounded-2xl p-2"
            >
              {link === addedPhotos[0] ? "⭐" : "☆"}
            </button>
          </div>
        ))}

        {/* UPLOAD BUTTON */}
        <label className="h-32 cursor-pointer flex items-center justify-center border rounded-2xl text-gray-600">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={uploadPhoto}
          />
          {loading ? "Uploading..." : "Upload"}
        </label>
      </div>
    </>
  );
}