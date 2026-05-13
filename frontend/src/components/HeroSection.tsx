import { Heart, Users, Building2, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const stats = [
    { icon: Users, value: "10,000+", label: "Active Donors" },
    { icon: Building2, value: "500+", label: "Partner Hospitals" },
    { icon: Clock, value: "< 30min", label: "Avg Response Time" },
  ];

  return (
    <section id="home" className="relative hero-gradient overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary blur-3xl" />
      </div>

      <div className="container relative py-20 lg:py-32">
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground mb-6">
            <Heart className="h-4 w-4" fill="currentColor" />
            <span className="text-sm font-medium">Save Lives, Donate Blood</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Connecting <span className="text-gradient">Blood Donors</span> with{" "}
            <span className="text-gradient">Hospitals</span> in Need
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            RedDrop is your centralized platform for blood donation. Register as a donor, 
            find nearby hospitals, and help save lives during emergencies.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button variant="hero" size="xl" asChild>
              <Link to="/?tab=donor#register">
                <Heart className="h-5 w-5" />
                Register as Emergency Donor
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/?tab=hospital#register">
                <Building2 className="h-5 w-5" />
                Request for Blood
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="flex flex-col items-center p-6 rounded-2xl bg-card card-shadow transition-all duration-300 hover:card-shadow-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className="h-8 w-8 text-primary mb-3" />
                <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
