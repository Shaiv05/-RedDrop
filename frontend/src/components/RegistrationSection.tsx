import { useState, useEffect, useRef } from "react";
import { Heart, Building2, User, Phone, MapPin, Droplets } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const RegistrationSection = () => {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [donorForm, setDonorForm] = useState({
    name: "",
    phone: "",
    email: "",
    bloodGroup: "",
    location: "",
    lastDonationDate: "",
  });

  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    licenseNumber: "",
    bloodGroup: "",
    units: "",
    emergencyReason: "",
  });
  const [isDonorSubmitting, setIsDonorSubmitting] = useState(false);
  const [isHospitalSubmitting, setIsHospitalSubmitting] = useState(false);
  const location = useLocation();

  const handleDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDonorSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/donors/public-register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donorForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register donor");
      }

      toast({
        title: "Registration Successful!",
        description: "Donor details were saved to MongoDB.",
      });
      setDonorForm({
        name: "",
        phone: "",
        email: "",
        bloodGroup: "",
        location: "",
        lastDonationDate: "",
      });
      window.dispatchEvent(new Event("reddrop:data-updated"));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Donor registration failed",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      });
    } finally {
      setIsDonorSubmitting(false);
    }
  };

  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsHospitalSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/hospitals/public-register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hospitalForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register hospital");
      }

      toast({
        title: "Emergency request submitted!",
        description: "Hospital details and urgent blood request were saved.",
      });
      setHospitalForm({
        name: "",
        phone: "",
        email: "",
        location: "",
        licenseNumber: "",
        bloodGroup: "",
        units: "",
        emergencyReason: "",
      });
      window.dispatchEvent(new Event("reddrop:data-updated"));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hospital registration failed",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      });
    } finally {
      setIsHospitalSubmitting(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"donor" | "hospital">("donor");
  const canShowDonorRegistration = !isAuthenticated || user?.role === "user";
  const canShowHospitalRegistration = !isAuthenticated || user?.role === "hospital";
  const visibleRegistrationTabsCount =
    Number(canShowDonorRegistration) + Number(canShowHospitalRegistration);
  const registrationHeading =
    isAuthenticated && user?.role === "user"
      ? "Donor Registration"
      : isAuthenticated && user?.role === "hospital"
        ? "Hospital Registration"
        : "Join the RedDrop Network";
  const registrationDescription =
    isAuthenticated && user?.role === "user"
      ? "Register as a donor to help save lives during emergencies."
      : isAuthenticated && user?.role === "hospital"
        ? "Register your hospital and submit blood requirements quickly."
        : "Register as a donor to help save lives or register your hospital to connect with available donors.";

  useEffect(() => {
    if (!isAuthenticated) return;

    if (user?.role === "user") {
      setActiveTab("donor");
      return;
    }

    if (user?.role === "hospital") {
      setActiveTab("hospital");
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");

    if (tab === "hospital" && canShowHospitalRegistration) {
      setActiveTab("hospital");
      return;
    }

    if (tab === "donor" && canShowDonorRegistration) {
      setActiveTab(tab);
    }
  }, [location.search, canShowDonorRegistration, canShowHospitalRegistration]);

  useEffect(() => {
    if (location.hash !== "#register") return;
    const scrollToRegister = () => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const timer = window.setTimeout(scrollToRegister, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.search]);

  return (
    <section id="register" ref={sectionRef} className="py-20 bg-muted/30 scroll-mt-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isAuthenticated ? registrationHeading : <>Join the <span className="text-gradient">RedDrop</span> Network</>}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {registrationDescription}
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "donor" | "hospital")} className="w-full">
            <TabsList className={`grid w-full mb-8 ${visibleRegistrationTabsCount === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {canShowDonorRegistration && (
                <TabsTrigger value="donor" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Donor Registration
                </TabsTrigger>
              )}
              {canShowHospitalRegistration && (
                <TabsTrigger value="hospital" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Hospital Registration
                </TabsTrigger>
              )}
            </TabsList>

            {/* Donor Registration Form */}
            {canShowDonorRegistration && <TabsContent value="donor">
              <form onSubmit={handleDonorSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="donor-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="donor-name"
                      placeholder="Enter your full name"
                      value={donorForm.name}
                      onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="donor-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="donor-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={donorForm.phone}
                        onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donor-blood">Blood Group</Label>
                    <Select
                      value={donorForm.bloodGroup}
                      onValueChange={(value) => setDonorForm({ ...donorForm, bloodGroup: value })}
                      required
                    >
                      <SelectTrigger id="donor-blood">
                        <Droplets className="h-4 w-4 text-muted-foreground mr-2" />
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donor-email">Email Address</Label>
                  <Input
                    id="donor-email"
                    type="email"
                    placeholder="your@email.com"
                    value={donorForm.email}
                    onChange={(e) => setDonorForm({ ...donorForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donor-location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="donor-location"
                      placeholder="Your area or city"
                      value={donorForm.location}
                      onChange={(e) => setDonorForm({ ...donorForm, location: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donor-last-donation">Last Donation Date</Label>
                  <Input
                    id="donor-last-donation"
                    type="date"
                    value={donorForm.lastDonationDate}
                    onChange={(e) => setDonorForm({ ...donorForm, lastDonationDate: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isDonorSubmitting}>
                  <Heart className="h-5 w-5" />
                  {isDonorSubmitting ? "Registering..." : "Register as Donor"}
                </Button>
              </form>
            </TabsContent>}

            {/* Hospital Registration Form */}
            {canShowHospitalRegistration && <TabsContent value="hospital">
              <form onSubmit={handleHospitalSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="hospital-name">Hospital Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hospital-name"
                      placeholder="Enter hospital name"
                      value={hospitalForm.name}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospital-phone">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="hospital-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={hospitalForm.phone}
                        onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospital-license">License Number</Label>
                    <Input
                      id="hospital-license"
                      placeholder="Hospital license"
                      value={hospitalForm.licenseNumber}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, licenseNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital-email">Email Address</Label>
                  <Input
                    id="hospital-email"
                    type="email"
                    placeholder="hospital@email.com"
                    value={hospitalForm.email}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospital-blood">Required Blood Group</Label>
                    <Select
                      value={hospitalForm.bloodGroup}
                      onValueChange={(value) => setHospitalForm({ ...hospitalForm, bloodGroup: value })}
                      required
                    >
                      <SelectTrigger id="hospital-blood">
                        <Droplets className="h-4 w-4 text-muted-foreground mr-2" />
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospital-units">Units Needed</Label>
                    <Input
                      id="hospital-units"
                      type="number"
                      min={1}
                      placeholder="e.g. 2"
                      value={hospitalForm.units}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, units: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital-location">Hospital Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hospital-location"
                      placeholder="Full hospital address"
                      value={hospitalForm.location}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, location: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital-reason">Why blood is needed in emergency</Label>
                  <Input
                    id="hospital-reason"
                    placeholder="E.g., emergency surgery, trauma case, critical care"
                    value={hospitalForm.emergencyReason}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, emergencyReason: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isHospitalSubmitting}>
                  <Building2 className="h-5 w-5" />
                    {isHospitalSubmitting ? "Submitting..." : "Request Blood"}
                </Button>
              </form>
            </TabsContent>}
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default RegistrationSection;
