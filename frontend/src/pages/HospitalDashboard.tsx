import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Droplets,
  History,
  Save,
  UserCircle2,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Overview = {
  totalDonors: number;
  totalBloodUnits: number;
  totalRequests: number;
  pendingRequests: number;
  completedDonations: number;
};

type InventoryItem = {
  _id: string;
  bloodGroup: string;
  units: number;
  minLevel: number;
};

type RequestItem = {
  _id: string;
  bloodGroup: string;
  units: number;
  patientNote?: string;
  createdAt: string;
  status: "open" | "fulfilled" | "cancelled";
  isUrgent: boolean;
};

type DonorItem = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  location: string;
  isAvailable: boolean;
  lastDonationDate?: string;
};

type DonationRecord = {
  _id: string;
  donorName: string;
  bloodGroup: string;
  unitsDonated: number;
  donationDate: string;
};

type ActivityItem = {
  _id: string;
  message: string;
  createdAt: string;
};

type Reports = {
  totalDonations: number;
  totalUnitsDonated: number;
  mostRequestedBloodGroup: string;
  monthlyDonationData: Array<{ month: string; units: number }>;
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const fmtDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const HospitalDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isBusy, setIsBusy] = useState(false);
  const [overview, setOverview] = useState<Overview>({
    totalDonors: 0,
    totalBloodUnits: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedDonations: 0,
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [donors, setDonors] = useState<DonorItem[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [reports, setReports] = useState<Reports>({
    totalDonations: 0,
    totalUnitsDonated: 0,
    mostRequestedBloodGroup: "N/A",
    monthlyDonationData: [],
  });
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });
  const [inventoryForm, setInventoryForm] = useState({
    bloodGroup: "A+",
    units: "",
    minLevel: "5",
  });
  const [donationForm, setDonationForm] = useState({
    donorName: "",
    bloodGroup: "A+",
    unitsDonated: "",
    donationDate: new Date().toISOString().slice(0, 10),
  });

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const [
        overviewRes,
        inventoryRes,
        requestsRes,
        donorsRes,
        donationsRes,
        notificationsRes,
        activitiesRes,
        profileRes,
        reportsRes,
      ] = await Promise.all([
        fetch(apiUrl("/api/dashboard/overview"), { headers }),
        fetch(apiUrl("/api/dashboard/inventory"), { headers }),
        fetch(apiUrl("/api/requests"), { headers }),
        fetch(apiUrl("/api/donors"), { headers }),
        fetch(apiUrl("/api/dashboard/donations"), { headers }),
        fetch(apiUrl("/api/dashboard/notifications"), { headers }),
        fetch(apiUrl("/api/dashboard/activities"), { headers }),
        fetch(apiUrl("/api/dashboard/profile"), { headers }),
        fetch(apiUrl("/api/dashboard/reports"), { headers }),
      ]);

      const overviewData = await overviewRes.json();
      const inventoryData = await inventoryRes.json();
      const requestsData = await requestsRes.json();
      const donorsData = await donorsRes.json();
      const donationsData = await donationsRes.json();
      const notificationsData = await notificationsRes.json();
      const activitiesData = await activitiesRes.json();
      const profileData = await profileRes.json();
      const reportsData = await reportsRes.json();

      setOverview(overviewData?.overview || overview);
      setInventory(Array.isArray(inventoryData?.inventory) ? inventoryData.inventory : []);
      setRequests(Array.isArray(requestsData?.requests) ? requestsData.requests : []);
      setDonors(Array.isArray(donorsData?.donors) ? donorsData.donors : []);
      setDonations(Array.isArray(donationsData?.records) ? donationsData.records : []);
      setNotifications(Array.isArray(notificationsData?.notifications) ? notificationsData.notifications : []);
      setActivities(Array.isArray(activitiesData?.activities) ? activitiesData.activities : []);
      if (profileData?.hospital) {
        setProfile({
          name: profileData.hospital.name || "",
          email: profileData.hospital.email || "",
          phone: profileData.hospital.phone || "",
          location: profileData.hospital.location || "",
        });
      }
      if (reportsData?.reports) setReports(reportsData.reports);
    } catch {
      toast({
        variant: "destructive",
        title: "Dashboard load failed",
        description: "Could not fetch hospital dashboard data.",
      });
    }
  }, [token, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (location.hash !== "#dashboard-notifications") return;
    const timer = window.setTimeout(() => {
      const section = document.getElementById("dashboard-notifications");
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const emergencyRequests = useMemo(
    () => requests.filter((r) => r.isUrgent && r.status === "open"),
    [requests]
  );
  const lowStock = useMemo(() => inventory.filter((i) => i.units <= i.minLevel), [inventory]);
  const notificationItems = useMemo(
    () =>
      notifications.map((text, index) => {
        const lower = text.toLowerCase();
        const priority = lower.includes("urgent") || lower.includes("low stock") ? "High" : "Normal";
        const title = lower.includes("urgent")
          ? "Urgent Blood Request Alert"
          : lower.includes("low stock")
            ? "Low Stock Warning"
            : lower.includes("donor")
              ? "New Donor Activity"
              : "System Notification";
        return {
          id: `notification-${index}`,
          title,
          summary: text,
          priority,
          details:
            `${text}\n\nPlease review the related section in dashboard and take action if needed.\n` +
            `Suggested next step: verify current status and update records.`,
          timestamp: new Date().toLocaleString("en-IN"),
        };
      }),
    [notifications]
  );

  const setRequestStatus = async (requestId: string, status: "open" | "fulfilled" | "cancelled") => {
    setIsBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/status`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request update failed");
      await loadDashboardData();
      toast({ title: "Request updated", description: `Request marked as ${status}.` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const addInventory = async () => {
    setIsBusy(true);
    try {
      const res = await fetch(apiUrl("/api/dashboard/inventory"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          bloodGroup: inventoryForm.bloodGroup,
          units: Number(inventoryForm.units || 0),
          minLevel: Number(inventoryForm.minLevel || 5),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Inventory update failed");
      setInventoryForm((prev) => ({ ...prev, units: "" }));
      await loadDashboardData();
      toast({ title: "Inventory updated", description: "Blood stock saved." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Inventory action failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const removeInventory = async (inventoryId: string) => {
    setIsBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/dashboard/inventory/${inventoryId}`), {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Inventory delete failed");
      await loadDashboardData();
      toast({ title: "Inventory removed", description: "Stock item deleted." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const saveDonation = async () => {
    setIsBusy(true);
    try {
      const res = await fetch(apiUrl("/api/dashboard/donations"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          donorName: donationForm.donorName,
          bloodGroup: donationForm.bloodGroup,
          unitsDonated: Number(donationForm.unitsDonated || 0),
          donationDate: donationForm.donationDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Donation save failed");
      setDonationForm({
        donorName: "",
        bloodGroup: "A+",
        unitsDonated: "",
        donationDate: new Date().toISOString().slice(0, 10),
      });
      await loadDashboardData();
      toast({ title: "Donation recorded", description: "Donation history updated." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Donation save failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const saveProfile = async () => {
    setIsBusy(true);
    try {
      const res = await fetch(apiUrl("/api/dashboard/profile"), {
        method: "PATCH",
        headers,
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Profile update failed");
      await loadDashboardData();
      toast({ title: "Profile updated", description: "Hospital details saved." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "hospital") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Hey {user?.name || "Hospital"}, welcome to your dashboard
            </h1>
            <p className="text-muted-foreground">Manage requests, inventory, donors, profile, and reports from one place.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Total Donors</CardDescription><CardTitle>{overview.totalDonors}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Blood Units Available</CardDescription><CardTitle>{overview.totalBloodUnits}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Total Blood Requests</CardDescription><CardTitle>{overview.totalRequests}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Pending Requests</CardDescription><CardTitle>{overview.pendingRequests}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Completed Donations</CardDescription><CardTitle>{overview.completedDonations}</CardTitle></CardHeader></Card>
        </div>

        {lowStock.length > 0 && (
          <Card className="border-amber-500/40 max-h-[220px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Blood Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm overflow-y-auto pr-1">
              {lowStock.map((item) => (
                <p key={item._id}>
                  {item.bloodGroup}: {item.units} units (minimum {item.minLevel})
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="h-[420px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Blood Inventory Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={inventoryForm.bloodGroup} onValueChange={(value) => setInventoryForm((p) => ({ ...p, bloodGroup: value }))}>
                  <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Units to add" type="number" min={0} value={inventoryForm.units} onChange={(e) => setInventoryForm((p) => ({ ...p, units: e.target.value }))} />
                <Input placeholder="Min level" type="number" min={0} value={inventoryForm.minLevel} onChange={(e) => setInventoryForm((p) => ({ ...p, minLevel: e.target.value }))} />
                <Button onClick={addInventory} disabled={isBusy}>Add / Update</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Group</th><th>Units</th><th>Min Level</th><th className="text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item._id} className="border-t">
                        <td className="py-2 font-medium">{item.bloodGroup}</td>
                        <td>{item.units}</td>
                        <td>{item.minLevel}</td>
                        <td className="text-right">
                          <Button variant="outline" size="sm" onClick={() => removeInventory(item._id)} disabled={isBusy}>Remove</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="h-[420px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Emergency Blood Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm overflow-y-auto pr-1">
              {emergencyRequests.map((r) => (
                <div key={r._id} className="rounded-lg border border-red-400/40 p-3">
                  <p className="font-medium">{r.bloodGroup} - {r.units} units</p>
                  <p className="text-muted-foreground">{r.patientNote || "Emergency case"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Requested: {fmtDate(r.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="h-[420px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Blood Request Management</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground sticky top-0 bg-background z-10">
                    <tr><th className="py-2">Patient / Note</th><th>Group</th><th>Units</th><th>Date</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r._id} className="border-t">
                        <td className="py-1.5">{r.patientNote || "Emergency"}</td>
                        <td>{r.bloodGroup}</td>
                        <td>{r.units}</td>
                        <td>{fmtDate(r.createdAt)}</td>
                        <td className="capitalize">{r.status}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRequestStatus(r._id, "open")}
                              disabled={isBusy || r.status === "open"}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRequestStatus(r._id, "cancelled")}
                              disabled={isBusy || r.status === "cancelled"}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setRequestStatus(r._id, "fulfilled")}
                              disabled={isBusy || r.status === "fulfilled"}
                            >
                              Complete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          No real blood requests found for this hospital yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="h-[420px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Donor Management</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground sticky top-0 bg-background z-10">
                    <tr><th className="py-2">Name</th><th>Group</th><th>Location</th><th>Available</th><th>Last Donation</th><th className="text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {donors.map((d) => (
                      <tr key={d._id} className="group border-t transition-colors hover:bg-rose-50/70">
                        <td className="py-3 font-medium transition-colors group-hover:text-rose-700">{d.name}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{d.bloodGroup}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{d.location}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{d.isAvailable ? "Yes" : "No"}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{fmtDate(d.lastDonationDate)}</td>
                        <td className="py-3 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="transition-colors group-hover:border-rose-300 group-hover:bg-white">
                                Contact
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{d.name}</DialogTitle>
                                <DialogDescription>Donor contact and availability details.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Blood Group</p>
                                  <p className="text-muted-foreground">{d.bloodGroup}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Phone</p>
                                  <p className="text-muted-foreground">{d.phone || "Not shared"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Email</p>
                                  <p className="text-muted-foreground">{d.email || "Not shared"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Location</p>
                                  <p className="text-muted-foreground">{d.location || "Not shared"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Availability</p>
                                  <p className="text-muted-foreground">{d.isAvailable ? "Available" : "Unavailable"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Last Donation</p>
                                  <p className="text-muted-foreground">{fmtDate(d.lastDonationDate)}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                    {donors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          No donors available right now.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Donation Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Donor name" value={donationForm.donorName} onChange={(e) => setDonationForm((p) => ({ ...p, donorName: e.target.value }))} />
                <Select value={donationForm.bloodGroup} onValueChange={(value) => setDonationForm((p) => ({ ...p, bloodGroup: value }))}>
                  <SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Units" type="number" min={1} value={donationForm.unitsDonated} onChange={(e) => setDonationForm((p) => ({ ...p, unitsDonated: e.target.value }))} />
                <Input
                  type="date"
                  className="w-full min-w-0 pr-8"
                  value={donationForm.donationDate}
                  onChange={(e) => setDonationForm((p) => ({ ...p, donationDate: e.target.value }))}
                />
              </div>
              <Button onClick={saveDonation} disabled={isBusy}>Save Donation Record</Button>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground sticky top-0 bg-background z-10">
                    <tr><th className="py-2">Donor</th><th>Group</th><th>Units</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d._id} className="border-t">
                        <td className="py-2">{d.donorName}</td>
                        <td>{d.bloodGroup}</td>
                        <td>{d.unitsDonated}</td>
                        <td>{fmtDate(d.donationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle2 className="h-5 w-5 text-primary" /> Hospital Profile Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Hospital Name</Label><Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Address</Label><Input value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} /></div>
              <div className="pt-1">
                <Button onClick={saveProfile} disabled={isBusy}><Save className="h-4 w-4 mr-2" />Save Profile</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card id="dashboard-notifications" className="h-[360px] flex flex-col scroll-mt-24">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications Panel</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm overflow-y-auto pr-1">
              {notifications.length === 0 && <p className="text-muted-foreground">No new notifications.</p>}
              {notificationItems.map((n) => (
                <Dialog key={n.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-left rounded-md border p-2 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                    >
                      {n.summary}
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{n.title}</DialogTitle>
                      <DialogDescription>
                        Priority: <span className="font-medium">{n.priority}</span> · {n.timestamp}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      {n.details.split("\n").map((line, idx) => (
                        <p key={`${n.id}-line-${idx}`}>{line}</p>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>

          <Card className="h-[360px] flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Recent Activity Log</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm overflow-y-auto pr-1">
              {activities.length === 0 && <p className="text-muted-foreground">No recent activity.</p>}
              {activities.map((a) => (
                <div key={a._id} className="rounded-md border p-2">
                  <p>{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="h-[360px] flex flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Reports & Analytics</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm overflow-y-auto pr-1">
              <p><span className="font-medium">Total Donations:</span> {reports.totalDonations}</p>
              <p><span className="font-medium">Total Units Donated:</span> {reports.totalUnitsDonated}</p>
              <p><span className="font-medium">Most Requested Group:</span> {reports.mostRequestedBloodGroup}</p>
              <div>
                <p className="font-medium mb-1">Monthly Donation Data</p>
                {reports.monthlyDonationData.length === 0 && <p className="text-muted-foreground">No monthly data yet.</p>}
                {reports.monthlyDonationData.map((m) => (
                  <p key={m.month}>{m.month}: {m.units} units</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HospitalDashboard;
