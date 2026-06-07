"use client";

import { useState } from "react";

export default function ImageGallery({ images }: { images: string[] }) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center bg-gray-200 text-gray-500">
        صورة المنتج
      </div>
    );
  }

  return (
    <div>
      <img
        src={selectedImage}
        alt="Product image"
        className="h-80 w-full object-cover"
      />

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3 p-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(image)}
              className="overflow-hidden rounded-xl border"
            >
              <img
                src={image}
                alt={`Product image ${index + 1}`}
                className="h-20 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}