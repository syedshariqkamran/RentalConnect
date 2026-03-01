export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  phone?: string;
  status: 'active' | 'blocked';
  created_at: string;
  ads_count?: number;
}

export interface Property {
  id: number;
  agent_id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  pincode?: string;
  images: string[];
  bhk_type: string;
  bathrooms: number;
  status: 'available' | 'rented';
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  interest_count?: number;
  views?: number;
}

export interface Lead {
  type: 'view_number' | 'interested';
  created_at: string;
  property_title: string;
  property_image?: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  user_role?: string;
}
