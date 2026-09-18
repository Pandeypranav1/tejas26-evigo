import mongoose, { Schema, models, model } from "mongoose";

export interface IUser {
  _id?: mongoose.Types.ObjectId;
  phone: string;
  role: "client" | "provider";
  profileImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    role: { type: String, required: true, enum: ["client", "provider"] },
    profileImage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
