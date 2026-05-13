import { Heart, Phone, Mail, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-8 w-8 text-primary" fill="currentColor" />
              <span className="text-xl font-bold">RedDrop</span>
            </div>
            <p className="text-background/70 text-sm">
              Connecting blood donors with hospitals. Every drop counts in saving lives.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="/#home" className="hover:text-primary transition-colors">Home</a></li>
              <li><a href="/#emergency" className="hover:text-primary transition-colors">Emergency</a></li>
              {isAuthenticated && (
                <li><a href="/#hospitals" className="hover:text-primary transition-colors">Hospitals</a></li>
              )}
              <li><a href="/about" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="#" className="hover:text-primary transition-colors">Blood Donation Guide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Eligibility Criteria</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-background/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>+91 1800 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>support@reddrop.org</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>
                  LDRP Institute of Technology & Research,
                  <br />
                  Near KH-5,
                  <br />
                  Sector-15,
                  <br />
                  Gandhinagar - 382015.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/50">
            © {currentYear} RedDrop. All rights reserved.
          </p>
          <p className="text-sm text-background/50 flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-primary" fill="currentColor" /> to save lives
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
