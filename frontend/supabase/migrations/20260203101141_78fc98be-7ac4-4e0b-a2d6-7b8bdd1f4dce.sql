-- Create enum for blood groups
CREATE TYPE public.blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create donors table
CREATE TABLE public.donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    blood_group blood_group NOT NULL,
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    last_donation_date DATE,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create hospitals table
CREATE TABLE public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone TEXT,
    license_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create blood requirements table
CREATE TABLE public.blood_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
    blood_group blood_group NOT NULL,
    units_needed INTEGER NOT NULL CHECK (units_needed > 0),
    is_urgent BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'fulfilled', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create emergency requests table
CREATE TABLE public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
    blood_group blood_group NOT NULL,
    units_needed INTEGER NOT NULL CHECK (units_needed > 0),
    patient_info TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'responded', 'fulfilled', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create donation responses table
CREATE TABLE public.donation_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE NOT NULL,
    emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES public.blood_requirements(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT response_has_target CHECK (emergency_request_id IS NOT NULL OR requirement_id IS NOT NULL)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_responses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Donors policies (public read for finding donors)
CREATE POLICY "Anyone can view available donors" ON public.donors FOR SELECT USING (true);
CREATE POLICY "Users can update own donor profile" ON public.donors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own donor profile" ON public.donors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own donor profile" ON public.donors FOR DELETE USING (auth.uid() = user_id);

-- Hospitals policies (public read for finding hospitals)
CREATE POLICY "Anyone can view hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Users can update own hospital" ON public.hospitals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hospital" ON public.hospitals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own hospital" ON public.hospitals FOR DELETE USING (auth.uid() = user_id);

-- Blood requirements policies
CREATE POLICY "Anyone can view blood requirements" ON public.blood_requirements FOR SELECT USING (true);
CREATE POLICY "Hospital owners can manage requirements" ON public.blood_requirements FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND user_id = auth.uid()));
CREATE POLICY "Hospital owners can update requirements" ON public.blood_requirements FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND user_id = auth.uid()));
CREATE POLICY "Hospital owners can delete requirements" ON public.blood_requirements FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND user_id = auth.uid()));

-- Emergency requests policies
CREATE POLICY "Anyone can view emergency requests" ON public.emergency_requests FOR SELECT USING (true);
CREATE POLICY "Hospital owners can create emergencies" ON public.emergency_requests FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND user_id = auth.uid()));
CREATE POLICY "Hospital owners can update emergencies" ON public.emergency_requests FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND user_id = auth.uid()));

-- Donation responses policies
CREATE POLICY "Donors can view own responses" ON public.donation_responses FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.donors WHERE id = donor_id AND user_id = auth.uid()));
CREATE POLICY "Hospital owners can view responses to their requests" ON public.donation_responses FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.emergency_requests er JOIN public.hospitals h ON er.hospital_id = h.id WHERE er.id = emergency_request_id AND h.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.blood_requirements br JOIN public.hospitals h ON br.hospital_id = h.id WHERE br.id = requirement_id AND h.user_id = auth.uid())
);
CREATE POLICY "Donors can create responses" ON public.donation_responses FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.donors WHERE id = donor_id AND user_id = auth.uid()));
CREATE POLICY "Donors can update own responses" ON public.donation_responses FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.donors WHERE id = donor_id AND user_id = auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON public.donors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blood_requirements_updated_at BEFORE UPDATE ON public.blood_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_emergency_requests_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donation_responses_updated_at BEFORE UPDATE ON public.donation_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();