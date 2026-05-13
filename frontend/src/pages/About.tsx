import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HeartPulse, Users, Building2, ShieldCheck } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-16">
        <section className="max-w-3xl mx-auto text-center mb-14">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            About <span className="text-gradient">RedDrop</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            RedDrop connects blood donors, hospitals, and people in urgent need through one reliable platform.
            Our mission is to make blood availability faster, safer, and easier to access.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-6 card-shadow">
            <div className="flex items-center gap-3 mb-3">
              <HeartPulse className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground">
            Reduce delays in urgent blood requirements by helping recipients quickly find available donors nearby.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 card-shadow">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">For Donors</h2>
            </div>
            <p className="text-muted-foreground">
              Donors can register in minutes and become visible to people and hospitals looking for matching blood groups.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 card-shadow">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">For Hospitals</h2>
            </div>
            <p className="text-muted-foreground">
              Hospitals can connect with a broader donor network and respond faster during critical patient needs.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 card-shadow">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Trust & Reliability</h2>
            </div>
            <p className="text-muted-foreground">
              We prioritize reliable information flow and clear communication so every request reaches the right people.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
