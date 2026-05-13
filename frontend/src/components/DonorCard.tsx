import { MapPin, Phone, Calendar, CheckCircle, User } from "lucide-react";
import BloodGroupBadge from "./BloodGroupBadge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";

interface DonorCardProps {
  name: string;
  bloodGroup: string;
  location: string;
  distance: string;
  lastDonation: string;
  isAvailable: boolean;
  phone?: string;
  email?: string;
}

const DonorCard = ({
  name,
  bloodGroup,
  location,
  distance,
  lastDonation,
  isAvailable,
  phone,
  email,
}: DonorCardProps) => {
  return (
    <div className="group bg-card rounded-2xl p-6 card-shadow transition-all duration-300 hover:card-shadow-hover hover:-translate-y-1">
      <div className="flex items-start gap-4">
        <BloodGroupBadge bloodGroup={bloodGroup} size="lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            {isAvailable && (
              <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-3 w-3" />
                Available
              </span>
            )}
          </div>
          
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{location}</span>
              <span className="text-primary font-medium">({distance})</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Last donation: {lastDonation}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex items-center gap-3">
        <Button variant="default" size="sm" className="flex-1" asChild disabled={!phone}>
          <a href={phone ? `tel:${phone}` : "#"} aria-disabled={!phone}>
            <Phone className="h-4 w-4" />
            Contact
          </a>
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              View Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {name}
              </DialogTitle>
              <DialogDescription>
                Donor details and contact information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Blood Group:</span> {bloodGroup}</p>
              <p><span className="font-medium">Location:</span> {location}</p>
              <p><span className="font-medium">Distance (from your location, approx.):</span> {distance}</p>
              <p><span className="font-medium">Last Donation:</span> {lastDonation}</p>
              <p><span className="font-medium">Availability:</span> {isAvailable ? "Available" : "Unavailable"}</p>
              <p><span className="font-medium">Phone:</span> {phone || "Not shared"}</p>
              <p><span className="font-medium">Email:</span> {email || "Not shared"}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DonorCard;
