import mongoose, { Schema, models, model } from "mongoose";

export interface IBooking {
  _id?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending"
    },
  },
  { timestamps: true }
);

export const Booking = models.Booking || model<IBooking>("Booking", BookingSchema);
