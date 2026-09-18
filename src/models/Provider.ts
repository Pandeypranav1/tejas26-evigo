import mongoose, { Schema, models, model } from "mongoose";

export interface IProvider {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | string;
  ownerUid?: string;
  businessName: string;
  ownerName: string;
  category: string;
  startingPrice: number;
  city: string;
  phone: string;
  experienceYears: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
  services: string[];
  pricing: number;
  location: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProviderSchema = new Schema<IProvider>(
  {
    userId:         { type: Schema.Types.Mixed, required: true },
    ownerUid:       { type: String },
    businessName:   { type: String, required: true, trim: true },
    ownerName:      { type: String, required: true, trim: true },
    category:       { type: String, required: true, enum: ["Catering", "Photography", "DJ", "Mehendi & Makeup", "Restaurant", "Cultural"] },
    startingPrice:  { type: Number, required: true, min: 0 },
    city:           { type: String, required: true, trim: true },
    phone:          { type: String, default: "" },
    experienceYears:{ type: Number, default: 0 },
    description:    { type: String, default: "" },
    imageUrl:       { type: String, default: "" },
    isActive:       { type: Boolean, default: true },
    services:       { type: [String], default: [] },
    pricing:        { type: Number, default: 0 },
    location:       { type: String, default: "" },
  },
  { timestamps: true }
);

// Prevent model re-compilation during Next.js HMR
export const Provider = models.Provider || model<IProvider>("Provider", ProviderSchema);
