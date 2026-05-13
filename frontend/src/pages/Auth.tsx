import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  Phone,
  MapPin,
  FileBadge2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");
const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

type AuthRole = "user" | "hospital";

const Auth = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<AuthRole>("user");
  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    phone: "",
    location: "",
    licenseNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const parseResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    const text = await res.text();
    return { message: text || "Unexpected server response" };
  };

  useEffect(() => {
    const mode = searchParams.get("mode");
    const roleParam = searchParams.get("role");

    setActiveTab(mode === "signup" ? "signup" : "signin");
    setRole(roleParam === "hospital" ? "hospital" : "user");
    setErrors({});
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateForm = (isSignUp: boolean) => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;

    if (isSignUp) {
      if (role === "user") {
        const nameResult = nameSchema.safeParse(fullName);
        if (!nameResult.success) newErrors.name = nameResult.error.errors[0].message;
      } else {
        const hospitalNameResult = nameSchema.safeParse(hospitalForm.name);
        if (!hospitalNameResult.success) newErrors.name = hospitalNameResult.error.errors[0].message;

        const phoneResult = requiredText("Phone number").safeParse(hospitalForm.phone);
        if (!phoneResult.success) newErrors.phone = phoneResult.error.errors[0].message;

        const locationResult = requiredText("Location").safeParse(hospitalForm.location);
        if (!locationResult.success) newErrors.location = locationResult.error.errors[0].message;

        const licenseResult = requiredText("License number").safeParse(hospitalForm.licenseNumber);
        if (!licenseResult.success) newErrors.licenseNumber = licenseResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setIsSubmitting(true);
    try {
      const endpoint = role === "hospital" ? "/api/hospitals/auth/login" : "/api/login";
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponse(res);

      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        toast({
          title: "Welcome back!",
          description: role === "hospital" ? "Hospital login successful." : "Login successful.",
        });
        navigate("/");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data?.message || "Unable to sign in",
        });
      }
    } catch (error) {
      const description =
        error instanceof Error && error.message.includes("Failed to fetch")
          ? `Cannot connect to backend at ${apiUrl("/api/health")}`
          : "Server error. Try again.";
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const endpoint = role === "hospital" ? "/api/hospitals/auth/register" : "/api/register";
      const payload =
        role === "hospital"
          ? {
              name: hospitalForm.name,
              phone: hospitalForm.phone,
              email,
              location: hospitalForm.location,
              licenseNumber: hospitalForm.licenseNumber,
              password,
            }
          : {
              name: fullName,
              email,
              password,
            };

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(res);

      if (res.ok) {
        if (data?.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          toast({
            title: "Account Created!",
            description: "You are now logged in.",
          });
          navigate("/");
          return;
        }

        toast({
          title: "Account Created!",
          description:
            role === "hospital"
              ? "Hospital account created. You can now log in."
              : "You can now log in.",
        });
        setActiveTab("signin");
      } else {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: data?.message || "Unable to create account",
        });
      }
    } catch (error) {
      const description =
        error instanceof Error && error.message.includes("Failed to fetch")
          ? `Cannot connect to backend at ${apiUrl("/api/health")}`
          : "Server error. Try again.";
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-10 w-10 text-primary animate-heartbeat" fill="currentColor" />
          <span className="text-2xl font-bold text-gradient">RedDrop</span>
        </a>

        <div className="flex justify-center gap-2 mb-4">
          <Button
            variant={role === "user" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to={`/auth?mode=${activeTab}&role=user`}>User</Link>
          </Button>
          <Button
            variant={role === "hospital" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to={`/auth?mode=${activeTab}&role=hospital`}>Hospital</Link>
          </Button>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {role === "hospital" ? "Hospital Access" : "Welcome"}
            </CardTitle>
            <CardDescription>
              {role === "hospital"
                ? "Sign in or create a hospital account"
                : "Sign in or create a new account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label>{role === "hospital" ? "Hospital Email" : "Email"}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div>
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {role === "user" ? (
                    <div>
                      <Label>Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" />
                      </div>
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label>Hospital Name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={hospitalForm.name}
                            onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                            className="pl-10"
                            placeholder="Enter hospital name"
                          />
                        </div>
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                      </div>

                      <div>
                        <Label>Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            value={hospitalForm.phone}
                            onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                            className="pl-10"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      </div>

                      <div>
                        <Label>License Number</Label>
                        <div className="relative">
                          <FileBadge2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={hospitalForm.licenseNumber}
                            onChange={(e) =>
                              setHospitalForm({ ...hospitalForm, licenseNumber: e.target.value })
                            }
                            className="pl-10"
                            placeholder="Hospital license number"
                          />
                        </div>
                        {errors.licenseNumber && (
                          <p className="text-sm text-destructive">{errors.licenseNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label>Hospital Address</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={hospitalForm.location}
                            onChange={(e) => setHospitalForm({ ...hospitalForm, location: e.target.value })}
                            className="pl-10"
                            placeholder="Full hospital address"
                          />
                        </div>
                        {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                      </div>

                    </>
                  )}

                  <div>
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div>
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
