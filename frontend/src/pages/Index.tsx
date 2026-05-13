import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EmergencySection from "@/components/EmergencySection";
import HospitalSection from "@/components/HospitalSection";
import DonorSection from "@/components/DonorSection";
import RegistrationSection from "@/components/RegistrationSection";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const isHospital = isAuthenticated && user?.role === "hospital";
  const isUser = isAuthenticated && user?.role === "user";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        {isHospital && <DonorSection />}
        <EmergencySection />
        {isUser && <HospitalSection />}
        <RegistrationSection />
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
