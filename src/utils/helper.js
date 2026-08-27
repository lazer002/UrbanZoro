// utils/helper.js

import { supabase } from "../config/supabase.js";

export const deleteSupabaseImages = async (
  images = [],
  bucket = process.env.SUPABASE_BUCKET || "product-images"
) => {
  if (!Array.isArray(images) || !images.length) {
    return [];
  }

  const marker =
    `/storage/v1/object/public/${bucket}/`;

  const paths = images
    .map((url) => {
      try {
        if (!url || typeof url !== "string") {
          return null;
        }

        const pathname = new URL(url).pathname;

        const index = pathname.indexOf(marker);

        if (index === -1) {
          return null;
        }

        return decodeURIComponent(
          pathname.slice(index + marker.length)
        );
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!paths.length) {
    return [];
  }

  console.log("DELETE BUCKET:", bucket);
  console.log("DELETE PATHS:", paths);

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    console.error(
      "SUPABASE DELETE ERROR:",
      error
    );

    throw error;
  }

  console.log("DELETE RESULT:", data);

  return data || [];
};


// # SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXZ2Y2RuZ3FveHdwYnVsYWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTcyOTgsImV4cCI6MjA3MzU5MzI5OH0.Y2MWagRrxraS2ecKSqfe9p8LZ9YFEBic_qpcI1TSVRg
