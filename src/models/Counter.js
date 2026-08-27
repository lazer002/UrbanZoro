import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model(
  "Counter",
  CounterSchema
);

export async function getNextProductSeq() {
  const counter = await Counter.findOneAndUpdate(
    { name: "productSKU" },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.seq;
}

export async function getNextOrderSeq(
  year = new Date().getFullYear()
) {
  const counterName = `orderNumber-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.seq;
}