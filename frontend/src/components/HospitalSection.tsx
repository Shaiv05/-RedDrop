import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, MapPin, Building2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import HospitalCard from "./HospitalCard";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

const bloodGroups = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type ApiHospital = {
  _id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
};

type ApiRequest = {
  _id: string;
  hospital?: {
    _id?: string;
    name?: string;
    phone?: string;
  } | null;
  hospitalName?: string;
  bloodGroup: string;
  units: number;
  isUrgent: boolean;
  status?: string;
};

type HospitalView = {
  id: string;
  name: string;
  location: string;
  distance: string;
  distanceKm: number | null;
  phone?: string;
  email?: string;
  requirements: Array<{ bloodGroup: string; units: number; isUrgent: boolean }>;
};

const getHospitalDedupKey = (hospital: ApiHospital) => {
  const normalizedName = hospital.name.trim().toLowerCase();
  const normalizedLocation = hospital.location.trim().toLowerCase();
  const normalizedPhone = hospital.phone?.trim().toLowerCase();

  if (normalizedPhone) {
    return `name-location-phone:${normalizedName}::${normalizedLocation}::${normalizedPhone}`;
  }

  return `name-location:${normalizedName}::${normalizedLocation}`;
};

const HospitalSection = () => {
  const { user, isAuthenticated } = useAuth();
  const isDonorUser = isAuthenticated && user?.role === "user";
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState([15]);
  const [hospitals, setHospitals] = useState<HospitalView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchHospitalData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const authHeaders = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined;

      const [hospitalRes, requestResponses] = await Promise.all([
        fetch(apiUrl("/api/hospitals"), {
          headers: authHeaders,
        }),
        isDonorUser
          ? Promise.resolve([])
          : Promise.all([
              fetch(apiUrl("/api/requests?status=open"), {
                headers: authHeaders,
              }),
            ]),
      ]);

      const [requestRes] = requestResponses;

      const hospitalsData = await hospitalRes.json();
      const requestsData = requestRes ? await requestRes.json() : { requests: [] };

      if (!hospitalRes.ok) {
        throw new Error(hospitalsData?.message || "Failed to load hospitals");
      }
      if (requestRes && !requestRes.ok) {
        throw new Error(requestsData?.message || "Failed to load blood requests");
      }

      const apiHospitals: ApiHospital[] = Array.isArray(hospitalsData?.hospitals)
        ? hospitalsData.hospitals
        : [];
      const uniqueHospitals = Array.from(
        new Map(apiHospitals.map((hospital) => [getHospitalDedupKey(hospital), hospital])).values()
      );
      const apiRequests: ApiRequest[] = Array.isArray(requestsData?.requests)
        ? requestsData.requests
        : [];

      const requestsByHospital = new Map<string, Array<{ bloodGroup: string; units: number; isUrgent: boolean }>>();
      for (const req of apiRequests) {
        const hospitalId = req.hospital?._id;
        if (!hospitalId) continue;
        if (!requestsByHospital.has(hospitalId)) {
          requestsByHospital.set(hospitalId, []);
        }
        requestsByHospital.get(hospitalId)?.push({
          bloodGroup: req.bloodGroup,
          units: req.units,
          isUrgent: Boolean(req.isUrgent),
        });
      }

      const mapped: HospitalView[] = uniqueHospitals
        .map((hospital, index) => ({
          id: hospital._id,
          name: hospital.name,
          location: hospital.location,
          // Distance is not available in current API; keep a deterministic placeholder.
          distance: `${(2.5 + (index % 8) * 1.7).toFixed(1)} km`,
          distanceKm: 2.5 + (index % 8) * 1.7,
          phone: hospital.phone,
          email: hospital.email,
          requirements: requestsByHospital.get(hospital._id) || [],
        }));

      setHospitals(mapped);
    } catch (error) {
      setHospitals([]);
      setLoadError(error instanceof Error ? error.message : "Unable to load hospital data");
    } finally {
      setIsLoading(false);
    }
  }, [isDonorUser]);

  useEffect(() => {
    fetchHospitalData();
    const onDataUpdated = () => fetchHospitalData();
    window.addEventListener("reddrop:data-updated", onDataUpdated);
    return () => window.removeEventListener("reddrop:data-updated", onDataUpdated);
  }, [fetchHospitalData]);

  const visibleHospitals = useMemo(() => {
    if (!isAuthenticated || user?.role !== "hospital") {
      return hospitals;
    }

    const currentEmail = user.email.toLowerCase();
    return hospitals.filter(
      (hospital) =>
        hospital.id === user.id ||
        (hospital.email ? hospital.email.toLowerCase() === currentEmail : false)
    );
  }, [hospitals, isAuthenticated, user]);

  const filteredHospitals = useMemo(() => visibleHospitals.filter((hospital) => {
    const matchesBloodGroup = selectedBloodGroup === "All" || 
      hospital.requirements.some((r) => r.bloodGroup === selectedBloodGroup);
    const matchesSearch = hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hospital.location.toLowerCase().includes(searchQuery.toLowerCase());
    const withinRange = hospital.distanceKm === null || hospital.distanceKm <= range[0];
    return matchesBloodGroup && matchesSearch && withinRange;
  }), [visibleHospitals, selectedBloodGroup, searchQuery, range]);

  // Sort by urgent first
  const sortedHospitals = useMemo(() => [...filteredHospitals].sort((a, b) => {
    const aUrgent = a.requirements.some((r) => r.isUrgent);
    const bUrgent = b.requirements.some((r) => r.isUrgent);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return 0;
  }), [filteredHospitals]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBloodGroup("All");
    setRange([15]);
  };

  return (
    <section id="hospitals" className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Hospital</span> Blood Requirements
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            View blood requirements from hospitals near you. Urgent requests are highlighted for immediate attention.
          </p>
        </div>

        {/* Filters */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6 card-shadow mb-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Smart Filters</p>
              <h3 className="text-base font-semibold">Find the right hospital faster</h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-background/80 border px-3 py-1.5 text-muted-foreground">
                Radius: {range[0]} km
              </span>
              {!isDonorUser && (
                <span className="rounded-full bg-background/80 border px-3 py-1.5 text-muted-foreground">
                  Group: {selectedBloodGroup}
                </span>
              )}
            </div>
          </div>

          {isDonorUser ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px_auto] gap-3 lg:items-center">
              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Hospital Search
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by hospital name or location"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 border-border/70"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Distance Range
                </p>
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
                  <span className="text-sm font-semibold w-16 text-right">{range[0]} km</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="h-[62px] rounded-xl px-5 text-sm font-semibold border-border/70 hover:border-primary/40"
              >
                Reset
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_0.8fr_1fr_auto] gap-3">
              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Hospital Search
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by hospital name or location"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 border-border/70"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Blood Group
                </p>
                <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
                  <SelectTrigger className="h-10 border-border/70">
                    <SelectValue placeholder="Blood Group Needed" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group === "All" ? "All Blood Groups" : group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Distance Range
                </p>
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
                  <span className="text-sm font-semibold w-16 text-right">{range[0]} km</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="h-[62px] rounded-xl px-5 text-sm font-semibold border-border/70 hover:border-primary/40"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading hospitals..."
              : (
                <>
                  Found <span className="font-semibold text-foreground">{sortedHospitals.length}</span>{" "}
                  {isDonorUser ? "hospitals (non-emergency)" : "hospitals with blood requirements"}
                </>
              )}
          </p>
        </div>

        {/* Hospital Grid */}
        {!isLoading && loadError && (
          <div className="text-center py-8 text-destructive">{loadError}</div>
        )}

        {!isLoading && !loadError && !isDonorUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {sortedHospitals.map((hospital) => (
            <HospitalCard key={hospital.id} {...hospital} />
          ))}
          </div>
        )}

        {!isLoading && !loadError && isDonorUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {sortedHospitals.map((hospital) => (
              <HospitalCard key={hospital.id} {...hospital} />
            ))}
          </div>
        )}

        {!isLoading && !loadError && sortedHospitals.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hospitals found matching your criteria.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default HospitalSection;
