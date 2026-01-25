import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    photo: { type: String, default: "" }, // URL or path to the category image
  },
  { timestamps: true }
);

// Pre-save hook to generate slug
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  next();
});

export const Category = mongoose.model("Category", categorySchema);
