import { MapPin, Phone, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface BloodRequirement {
  bloodGroup: string;
  units: number;
  isUrgent: boolean;
}

interface HospitalCardProps {
  name: string;
  location: string;
  distance: string;
  requirements: BloodRequirement[];
  phone?: string;
  email?: string;
}

const HospitalCard = ({
  name,
  location,
  distance,
  requirements,
  phone,
  email,
}: HospitalCardProps) => {
  const hasUrgent = requirements.some((r) => r.isUrgent);

  return (
    <div className={cn(
      "group bg-card rounded-2xl card-shadow transition-all duration-300 hover:card-shadow-hover hover:-translate-y-1",
      hasUrgent ? "p-5" : "p-6",
      hasUrgent && "ring-2 ring-urgent/50"
    )}>
      {hasUrgent && (
        <div className="flex items-center gap-1.5 text-urgent mb-3">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Urgent Requirement</span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold text-lg text-foreground mb-2">{name}</h3>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{location}</span>
            <span className="text-primary font-medium">({distance})</span>
          </div>
        </div>
      </div>

      {/* Blood Requirements */}
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground mb-3">Blood Required:</p>
        {requirements.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {requirements.map((req, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 rounded-full",
                  req.isUrgent
                    ? "bg-urgent/10 text-urgent font-medium px-2.5 py-1 text-xs"
                    : "bg-secondary text-secondary-foreground px-3 py-1.5 text-sm"
                )}
              >
                <span className="font-bold">{req.bloodGroup}</span>
                <span className="text-xs">({req.units} units)</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active blood requirements.</p>
        )}
      </div>

      <div className="pt-4 border-t flex items-center gap-3">
        <Button variant={hasUrgent ? "urgent" : "default"} size="sm" className="flex-1" asChild disabled={!phone}>
          <a href={phone ? `tel:${phone}` : "#"} aria-disabled={!phone}>
            <Phone className="h-4 w-4" />
            Respond Now
          </a>
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {name}
              </DialogTitle>
              <DialogDescription>
                Hospital details and current blood requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Location:</span> {location}</p>
              <p><span className="font-medium">Distance (from your location, approx.):</span> {distance}</p>
              <p><span className="font-medium">Phone:</span> {phone || "Not shared"}</p>
              <p><span className="font-medium">Email:</span> {email || "Not shared"}</p>
              <div>
                <p className="font-medium mb-2">Blood Requirements:</p>
                {requirements.length > 0 ? (
                  <ul className="space-y-1">
                    {requirements.map((req, index) => (
                      <li key={`${req.bloodGroup}-${index}`}>
                        {req.bloodGroup} - {req.units} units {req.isUrgent ? "(Urgent)" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No active blood requirements.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HospitalCard;
