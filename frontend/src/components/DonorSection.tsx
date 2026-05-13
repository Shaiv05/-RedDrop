import { useEffect, useMemo, useState } from "react";
import { Search, Filter, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import DonorCard from "./DonorCard";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

const bloodGroups = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type ApiDonor = {
  _id?: string;
  id?: string;
  user?: string | { _id?: string; id?: string } | null;
  name: string;
  bloodGroup: string;
  location: string;
  isAvailable: boolean;
  phone?: string;
  email?: string;
  lastDonationDate?: string | null;
};

type DonorView = {
  id: string;
  userId: string | null;
  name: string;
  bloodGroup: string;
  location: string;
  distance: string;
  lastDonation: string;
  isAvailable: boolean;
  phone?: string;
  email?: string;
};

const toApproxDistance = (id: string) => {
  const hash = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const km = ((hash % 240) + 10) / 10; // 1.0 to 24.9 km
  return `${km.toFixed(1)} km`;
};

const toRelativeLastDonation = (dateString?: string | null) => {
  if (!dateString) return "Not provided";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not provided";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return `${Math.max(1, diffDays)} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} months ago`;
};

const DonorSection = () => {
  const { user, isAuthenticated } = useAuth();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState([25]);
  const [donors, setDonors] = useState<DonorView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchDonors = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error("Please login to view donor details");
      }

      const res = await fetch(apiUrl("/api/donors"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load donors");
      }
      const data = await res.json();
      const apiDonors: ApiDonor[] = Array.isArray(data?.donors) ? data.donors : [];
      const mapped = apiDonors.map((donor, index) => {
        const id = String(donor._id ?? donor.id ?? index + 1);
        return {
          id,
          userId:
            typeof donor.user === "string"
              ? donor.user
              : donor.user?._id || donor.user?.id || null,
          name: donor.name,
          bloodGroup: donor.bloodGroup,
          location: donor.location,
          distance: toApproxDistance(id),
          lastDonation: toRelativeLastDonation(donor.lastDonationDate),
          isAvailable: Boolean(donor.isAvailable),
          phone: donor.phone,
          email: donor.email,
        };
      });
      setDonors(mapped);
    } catch (error) {
      setDonors([]);
      setLoadError(error instanceof Error ? error.message : "Unable to fetch donors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
    const handler = () => {
      fetchDonors();
    };
    window.addEventListener("reddrop:data-updated", handler);
    return () => window.removeEventListener("reddrop:data-updated", handler);
  }, []);

  const visibleDonors = useMemo(() => {
    if (!isAuthenticated || user?.role !== "user") {
      return donors;
    }

    const currentEmail = user.email.toLowerCase();
    return donors.filter(
      (donor) =>
        donor.userId === user.id ||
        (donor.email ? donor.email.toLowerCase() === currentEmail : false)
    );
  }, [donors, isAuthenticated, user]);

  const filteredDonors = useMemo(
    () =>
      visibleDonors.filter((donor) => {
        const matchesBloodGroup = selectedBloodGroup === "All" || donor.bloodGroup === selectedBloodGroup;
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          donor.name.toLowerCase().includes(query) || donor.location.toLowerCase().includes(query);
        const withinRange = parseFloat(donor.distance) <= range[0];
        return matchesBloodGroup && matchesSearch && withinRange;
      }),
    [visibleDonors, selectedBloodGroup, searchQuery, range]
  );

  const clearFilters = () => {
    setSelectedBloodGroup("All");
    setSearchQuery("");
    setRange([25]);
  };

  return (
    <section id="donors" className="py-20 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Find <span className="text-gradient">Blood Donors</span> Near You
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search for available blood donors in your area. Filter by blood group and distance to find the perfect match.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl p-6 card-shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by donor name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Blood Group Filter */}
            <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group === "All" ? "All Blood Groups" : group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Range Filter */}
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={range}
                onValueChange={setRange}
                max={25}
                min={1}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-right">{range[0]} km</span>
            </div>

            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Loading donors..."
            ) : (
              <>
                Found <span className="font-semibold text-foreground">{filteredDonors.length}</span> donors
              </>
            )}
          </p>
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Donor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonors.map((donor) => (
            <DonorCard key={donor.id} {...donor} />
          ))}
        </div>

        {!isLoading && loadError && (
          <div className="text-center py-6">
            <p className="text-destructive">{loadError}</p>
          </div>
        )}

        {!isLoading && !loadError && filteredDonors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No donors found matching your criteria.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DonorSection;
