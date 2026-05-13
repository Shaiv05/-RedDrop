import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Phone, Clock, Heart, Building2, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import BloodGroupBadge from "./BloodGroupBadge";
import { apiUrl } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

type ApiEmergencyRequest = {
  _id?: string;
  id?: string;
  hospitalName?: string;
  hospital?: {
    name?: string;
    phone?: string;
    location?: string;
  } | null;
  bloodGroup: string;
  units: number;
  patientNote?: string;
  neededBy?: string;
  createdAt?: string;
};

const toRelativeTime = (dateString?: string) => {
  if (!dateString) return "Recently posted";
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return "Recently posted";

  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const toReadableDateTime = (dateString?: string) => {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const EmergencySection = () => {
  const [requests, setRequests] = useState<ApiEmergencyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchEmergencyRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiUrl("/api/requests?urgentOnly=true&status=open"));
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load emergency requests");
      }

      const list = Array.isArray(data?.requests) ? data.requests : [];
      setRequests(list);
    } catch (error) {
      setRequests([]);
      setLoadError(error instanceof Error ? error.message : "Unable to load emergency requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencyRequests();
    const onUpdated = () => {
      fetchEmergencyRequests();
    };
    window.addEventListener("reddrop:data-updated", onUpdated);
    return () => window.removeEventListener("reddrop:data-updated", onUpdated);
  }, [fetchEmergencyRequests]);

  const emergencyRequests = useMemo(() => {
    // Keep only the newest open emergency card per hospital for cleaner UX.
    const latestByHospital = new Map<string, ApiEmergencyRequest>();
    for (const request of requests) {
      const hospitalKey = (
        request.hospitalName ||
        request.hospital?.name ||
        "Unknown Hospital"
      ).trim().toLowerCase();
      const current = latestByHospital.get(hospitalKey);
      if (!current) {
        latestByHospital.set(hospitalKey, request);
        continue;
      }
      const currentTs = new Date(current.createdAt || 0).getTime();
      const nextTs = new Date(request.createdAt || 0).getTime();
      if (nextTs > currentTs) {
        latestByHospital.set(hospitalKey, request);
      }
    }

    return Array.from(latestByHospital.values()).map((request, index) => ({
      id: String(request._id ?? request.id ?? index),
      hospital:
        request.hospitalName ||
        request.hospital?.name ||
        "Unknown Hospital",
      bloodGroup: request.bloodGroup,
      units: request.units,
      patient: request.patientNote || "Emergency",
      timePosted: toRelativeTime(request.createdAt),
      postedAt: toReadableDateTime(request.createdAt),
      neededBy: toReadableDateTime(request.neededBy),
      phone: request.hospital?.phone || "",
      location: request.hospital?.location || "Location not shared",
    }));
  }, [requests]);

  return (
    <section id="emergency" className="py-20 bg-urgent/5">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-urgent/10 text-urgent mb-4">
            <AlertTriangle className="h-4 w-4 animate-pulse-urgent" />
            <span className="text-sm font-semibold">Emergency Requests</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Urgent Blood <span className="text-gradient">Needed Now</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            These are critical emergencies requiring immediate blood donation. Your quick response can save a life.
          </p>
        </div>

        {/* Emergency Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {isLoading && (
            <div className="col-span-full text-center text-muted-foreground">
              Loading emergency requests...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="col-span-full text-center text-destructive">
              {loadError}
            </div>
          )}

          {emergencyRequests.map((request) => (
            <div
              key={request.id}
              className="bg-card rounded-2xl p-6 card-shadow ring-2 ring-urgent/30 animate-pulse-urgent hover:animate-none transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <BloodGroupBadge bloodGroup={request.bloodGroup} size="lg" />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {request.timePosted}
                </div>
              </div>

              <h3 className="font-semibold text-lg text-foreground mb-1">{request.hospital}</h3>
              <p className="text-sm text-muted-foreground mb-3">{request.patient}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-urgent">
                  {request.units} units needed urgently
                </span>
              </div>

              <div className="pt-2 border-t flex items-center gap-3">
                <Button variant="urgent" className="flex-1" asChild disabled={!request.phone}>
                  <a href={request.phone ? `tel:${request.phone}` : "#"} aria-disabled={!request.phone}>
                    <Phone className="h-4 w-4" />
                    Respond Now
                  </a>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {request.hospital}
                      </DialogTitle>
                      <DialogDescription>
                        Emergency request details and contact information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Blood Group:</span> {request.bloodGroup}</p>
                      <p><span className="font-medium">Units Needed:</span> {request.units}</p>
                      <p><span className="font-medium">Priority:</span> Urgent</p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Location:</span> {request.location}</span>
                      </p>
                      <p><span className="font-medium">Reason / Patient Note:</span> {request.patient}</p>
                      <p><span className="font-medium">Posted:</span> {request.postedAt} ({request.timePosted})</p>
                      <p><span className="font-medium">Needed By:</span> {request.neededBy}</p>
                      <p><span className="font-medium">Hospital Phone:</span> {request.phone || "Not shared"}</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}

          {!isLoading && !loadError && emergencyRequests.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">
              No active emergency requests right now.
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-card rounded-2xl p-8 card-shadow max-w-2xl mx-auto">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4 animate-heartbeat" fill="currentColor" />
          <h3 className="text-xl font-semibold mb-2">Every Second Counts</h3>
          <p className="text-muted-foreground mb-6">
            Register as a donor today and be ready to save lives when emergencies happen.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="hero" size="lg" asChild>
              <a href="/?tab=donor#register">Register as Emergency Donor</a>
            </Button>
            <Button variant="destructive" size="lg" asChild>
                    <a href="/?tab=hospital#register">Request Blood</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmergencySection;
