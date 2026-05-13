import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { extractBloodReportText, warmUpBloodReportOcr } from "@/lib/bloodReportOcr";
import { Activity, AlertTriangle, ArrowLeft, Bell, Building2, ChevronDown, ChevronRight, ClipboardList, Droplets, Eraser, Eye, FileText, HeartHandshake, History, Loader2, Save, ShieldAlert, Sparkles, Trash2, Upload } from "lucide-react";

type DashboardResponse = {
  overview?: {
    bloodGroup?: string;
    totalDonations?: number;
    lastDonationDate?: string | null;
    isEligible?: boolean;
    eligibilityLabel?: string;
  };
  profile?: {
    name?: string;
    email?: string;
    age?: number | string;
    bloodGroup?: string;
    city?: string;
    phone?: string;
    isAvailable?: boolean;
    lastDonationDate?: string | null;
  };
  donationReminder?: {
    message?: string;
  };
  myRequests?: UserRequest[];
  donationHistory?: DonationRecord[];
  nearbyHospitals?: NearbyHospital[];
  availableBloodInfo?: BloodInfo[];
  emergencyRequests?: EmergencyRequest[];
  notifications?: NotificationItem[];
  recentActivities?: RecentActivity[];
  bloodReportAnalysis?: BloodReportAnalysis | null;
  bloodReportHistory?: BloodReportAnalysis[];
};

type UserRequest = {
  _id?: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  hospitalName: string;
  city?: string;
  notes?: string;
  status: string;
  createdAt?: string;
};

type DonationRecord = {
  _id?: string;
  hospitalName: string;
  bloodGroup: string;
  unitsDonated: number;
  donationDate?: string;
};

type NearbyHospital = {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
  availableBloodGroups?: string[];
};

type BloodInfo = {
  id: string;
  hospitalName: string;
  bloodGroup: string;
  units: number;
  location?: string;
  phone?: string;
  email?: string;
};

type EmergencyRequest = {
  id: string;
  hospitalName: string;
  bloodGroup: string;
  units: number;
  requestDate?: string;
  status: string;
  location?: string;
  phone?: string;
  email?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  details?: string;
};

type RecentActivity = {
  id: string;
  type: string;
  message: string;
  createdAt?: string;
};

type BloodReportParameter = {
  name: string;
  slug: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: "normal" | "high" | "low" | "borderline" | "unknown";
  explanation: string;
  confidence?: number;
};

type BloodReportAnalysis = {
  id?: string;
  fileName: string;
  mimeType: string;
  extractionMethod?: string;
  extractedTextPreview?: string;
  labName?: string;
  testDate?: string | null;
  summary: string;
  parameters: BloodReportParameter[];
  insights: string[];
  dietSuggestions: string[];
  lifestyleSuggestions: string[];
  precautions: string[];
  donationEligibility: {
    status: "eligible" | "needs_review" | "not_eligible";
    label: string;
    reasons: string[];
    nextStep?: string;
  };
  disclaimer?: string;
  createdAt?: string;
};

type AnalysisDetailState = {
  title: string;
  description?: string;
  body: string;
};

type ManualParameterForm = {
  hemoglobin: string;
  wbc: string;
  rbc: string;
  platelets: string;
  cholesterol: string;
  glucose: string;
  hematocrit: string;
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const today = new Date().toISOString();

const dummyOverview = {
  bloodGroup: "O+",
  totalDonations: 4,
  lastDonationDate: "2026-01-18T00:00:00.000Z",
  isEligible: true,
  eligibilityLabel: "Eligible to donate now",
};

const dummyReminder = "You are currently eligible to donate. A nearby hospital may need your support this week.";

const dummyRecentActivities: RecentActivity[] = [
  {
    id: "dummy-activity-1",
    type: "profile_updated",
    message: "Profile synced with donor registry.",
    createdAt: today,
  },
  {
    id: "dummy-activity-2",
    type: "donation_completed",
    message: "Donation recorded at City Care Hospital.",
    createdAt: "2026-01-18T00:00:00.000Z",
  },
];

const dummyRequests: UserRequest[] = [
  {
    _id: "dummy-request-1",
    patientName: "Aarav Sharma",
    hospitalName: "City Care Hospital",
    bloodGroup: "O+",
    units: 2,
    city: "Bengaluru",
    status: "pending",
    createdAt: today,
  },
  {
    _id: "dummy-request-2",
    patientName: "Meera Nair",
    hospitalName: "LifeLine Medical Center",
    bloodGroup: "A-",
    units: 1,
    city: "Mysuru",
    status: "approved",
    createdAt: "2026-02-12T00:00:00.000Z",
  },
];

const dummyDonationHistory: Record<string, DonationRecord[]> = {
  "A+": [
    {
      _id: "dummy-donation-a-plus-1",
      hospitalName: "City Care Hospital",
      bloodGroup: "A+",
      unitsDonated: 1,
      donationDate: "2026-01-18T00:00:00.000Z",
    },
  ],
  "A-": [
    {
      _id: "dummy-donation-a-minus-1",
      hospitalName: "Sunrise Hospital",
      bloodGroup: "A-",
      unitsDonated: 1,
      donationDate: "2025-12-11T00:00:00.000Z",
    },
  ],
  "B+": [
    {
      _id: "dummy-donation-b-plus-1",
      hospitalName: "Civic Blood Center",
      bloodGroup: "B+",
      unitsDonated: 1,
      donationDate: "2025-11-20T00:00:00.000Z",
    },
  ],
  "B-": [
    {
      _id: "dummy-donation-b-minus-1",
      hospitalName: "Unity Hospital",
      bloodGroup: "B-",
      unitsDonated: 1,
      donationDate: "2025-10-05T00:00:00.000Z",
    },
  ],
  "AB+": [
    {
      _id: "dummy-donation-ab-plus-1",
      hospitalName: "LifeLine Medical Center",
      bloodGroup: "AB+",
      unitsDonated: 1,
      donationDate: "2025-12-28T00:00:00.000Z",
    },
  ],
  "AB-": [
    {
      _id: "dummy-donation-ab-minus-1",
      hospitalName: "Regional Care Hospital",
      bloodGroup: "AB-",
      unitsDonated: 1,
      donationDate: "2025-08-17T00:00:00.000Z",
    },
  ],
  "O+": [
    {
      _id: "dummy-donation-o-plus-1",
      hospitalName: "City Care Hospital",
      bloodGroup: "O+",
      unitsDonated: 1,
      donationDate: "2026-01-18T00:00:00.000Z",
    },
    {
      _id: "dummy-donation-o-plus-2",
      hospitalName: "Green Cross Hospital",
      bloodGroup: "O+",
      unitsDonated: 1,
      donationDate: "2025-09-21T00:00:00.000Z",
    },
  ],
  "O-": [
    {
      _id: "dummy-donation-o-minus-1",
      hospitalName: "Trauma Support Hospital",
      bloodGroup: "O-",
      unitsDonated: 1,
      donationDate: "2025-07-09T00:00:00.000Z",
    },
  ],
};

const donationGuidelines = [
  "Donor should not have diabetes or serious medical conditions.",
  "Donor should be 18 to 65 years old.",
  "Minimum weight should be 50 kg.",
  "Donor should not have donated blood in the last 90 days.",
  "Donor should not have fever, infection, or any major illness.",
  "Donor must be healthy and well-rested before donation.",
];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timer: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
};

const buildManualReportText = (values: ManualParameterForm) => {
  const lines = [
    values.hemoglobin ? `Hemoglobin: ${values.hemoglobin} g/dL` : "",
    values.wbc ? `WBC: ${values.wbc} /cumm` : "",
    values.rbc ? `RBC: ${values.rbc} million/uL` : "",
    values.platelets ? `Platelets: ${values.platelets} /cumm` : "",
    values.cholesterol ? `Cholesterol: ${values.cholesterol} mg/dL` : "",
    values.glucose ? `Glucose: ${values.glucose} mg/dL` : "",
    values.hematocrit ? `Hematocrit: ${values.hematocrit} %` : "",
  ].filter(Boolean);

  return lines.join("\n");
};

const emptyManualParameters = (): ManualParameterForm => ({
  hemoglobin: "",
  wbc: "",
  rbc: "",
  platelets: "",
  cholesterol: "",
  glucose: "",
  hematocrit: "",
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });

const getParameterBadgeVariant = (status: BloodReportParameter["status"]): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "normal") return "default";
  if (status === "borderline" || status === "unknown") return "secondary";
  return "destructive";
};

const getDonationBadgeVariant = (status?: BloodReportAnalysis["donationEligibility"]["status"]): "default" | "secondary" | "destructive" => {
  if (status === "eligible") return "default";
  if (status === "needs_review") return "secondary";
  return "destructive";
};

const getParameterTone = (status: BloodReportParameter["status"]) => {
  if (status === "normal") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-900";
  }
  if (status === "borderline" || status === "unknown") {
    return "border-amber-200 bg-amber-50/80 text-amber-900";
  }
  return "border-rose-200 bg-rose-50/80 text-rose-900";
};

const UserDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const location = useLocation();

  const [isBusy, setIsBusy] = useState(false);
  const [overview, setOverview] = useState({
    bloodGroup: "Not set",
    totalDonations: 0,
    lastDonationDate: null as string | null,
    isEligible: false,
    eligibilityLabel: "Loading",
  });
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    age: "",
    bloodGroup: "A+",
    city: "",
    phone: "",
    isAvailable: true,
    lastDonationDate: "",
  });
  const [savedAvailability, setSavedAvailability] = useState(true);
  const [donationReminder, setDonationReminder] = useState("Stay ready to support when needed.");
  const [myRequests, setMyRequests] = useState<UserRequest[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [availableBloodInfo, setAvailableBloodInfo] = useState<BloodInfo[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<BloodReportAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<BloodReportAnalysis[]>([]);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalysisGuidanceOpen, setIsAnalysisGuidanceOpen] = useState(false);
  const [analysisDetail, setAnalysisDetail] = useState<AnalysisDetailState | null>(null);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const analysisFileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualParameters, setManualParameters] = useState<ManualParameterForm>(emptyManualParameters);
  const [requestForm, setRequestForm] = useState({
    patientName: "",
    bloodGroup: "A+",
    units: "",
    hospitalName: "",
    city: "",
    reason: "",
    patientCondition: "",
    notes: "",
  });
  const [donationForm, setDonationForm] = useState({
    hospitalName: "",
    bloodGroup: "A+",
    unitsDonated: "",
    donationDate: new Date().toISOString().slice(0, 10),
  });

  const activeBloodGroup = profile.bloodGroup || overview.bloodGroup || dummyOverview.bloodGroup;
  const hasRealOverview =
    overview.bloodGroup !== "Not set" ||
    overview.totalDonations > 0 ||
    Boolean(overview.lastDonationDate);
  const displayOverview = hasRealOverview ? overview : dummyOverview;
  const displayDonationReminder = donationReminder !== "Stay ready to support when needed." ? donationReminder : dummyReminder;
  const displayNearbyHospitals = nearbyHospitals;
  const displayAvailableBloodInfo = availableBloodInfo;
  const displayNotifications = notifications;
  const displayEmergencyRequests = emergencyRequests.filter((item) => item.bloodGroup === activeBloodGroup);
  const displayRecentActivities = recentActivities.length > 0 ? recentActivities : dummyRecentActivities;
  const displayMyRequests = myRequests.length > 0 ? myRequests : dummyRequests;
  const displayDonationHistory = donationHistory.length > 0
    ? donationHistory.filter((record) => record.bloodGroup === activeBloodGroup)
    : dummyDonationHistory[activeBloodGroup] || [];
  const availabilityText = savedAvailability ? "Available" : "Unavailable";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    }),
    [token]
  );

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(apiUrl("/api/user-dashboard"), { headers });
      const data: DashboardResponse = await res.json();

      if (!res.ok) {
        throw new Error("Could not load user dashboard.");
      }

      if (data.overview) {
        setOverview({
          bloodGroup: data.overview.bloodGroup || "Not set",
          totalDonations: data.overview.totalDonations || 0,
          lastDonationDate: data.overview.lastDonationDate || null,
          isEligible: Boolean(data.overview.isEligible),
          eligibilityLabel: data.overview.eligibilityLabel || "Not available",
        });
      }

      if (data.profile) {
        setProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          age: data.profile.age !== undefined && data.profile.age !== null ? String(data.profile.age) : "",
          bloodGroup: data.profile.bloodGroup || "A+",
          city: data.profile.city || "",
          phone: data.profile.phone || "",
          isAvailable: data.profile.isAvailable ?? true,
          lastDonationDate: data.profile.lastDonationDate ? String(data.profile.lastDonationDate).slice(0, 10) : "",
        });
        setSavedAvailability(data.profile.isAvailable ?? true);
      }

      setDonationReminder(data.donationReminder?.message || "Stay ready to support when needed.");
      setMyRequests(Array.isArray(data.myRequests) ? data.myRequests : []);
      setDonationHistory(Array.isArray(data.donationHistory) ? data.donationHistory : []);
      setNearbyHospitals(Array.isArray(data.nearbyHospitals) ? data.nearbyHospitals : []);
      setAvailableBloodInfo(Array.isArray(data.availableBloodInfo) ? data.availableBloodInfo : []);
      setEmergencyRequests(Array.isArray(data.emergencyRequests) ? data.emergencyRequests : []);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setRecentActivities(Array.isArray(data.recentActivities) ? data.recentActivities : []);
      setAnalysisResult(data.bloodReportAnalysis || null);
      setAnalysisHistory(Array.isArray(data.bloodReportHistory) ? data.bloodReportHistory : []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Dashboard load failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }, [headers, toast, token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (location.hash !== "#dashboard-notifications") return;
    const timer = window.setTimeout(() => {
      const section = document.getElementById("dashboard-notifications");
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const saveProfile = async () => {
    setIsBusy(true);
    try {
      const payload = {
        ...profile,
        age: profile.age === "" ? "" : Number(profile.age),
        lastDonationDate: profile.lastDonationDate || null,
      };

      const res = await fetch(apiUrl("/api/user-dashboard/profile"), {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Profile update failed");

      setSavedAvailability(profile.isAvailable);
      await loadDashboard();
      toast({ title: "Profile updated", description: "Your donor details were saved." });
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

  const analyzeBloodReport = async () => {
    const manualReportText = buildManualReportText(manualParameters);

    if (!analysisFile && !analysisText.trim() && !manualReportText.trim()) {
      toast({
        variant: "destructive",
        title: "Upload required",
        description: "Upload a report, paste report text, or enter blood values manually.",
      });
      return;
    }

    setIsAnalyzingReport(true);
    try {
      let fileDataUrl = "";
      let fileName = analysisFile?.name || "pasted-report.txt";
      let mimeType = analysisFile?.type || "text/plain";
      let extractedReportText = analysisText.trim() || manualReportText.trim();
      const isImageFile = Boolean(analysisFile?.type.startsWith("image/"));
      const isPdfFile = analysisFile?.type === "application/pdf";
      const needsOcr =
        analysisFile &&
        !extractedReportText &&
        (isImageFile || isPdfFile);

      if (needsOcr && analysisFile) {
        setIsExtractingText(true);
        try {
          const extractedText = await withTimeout(
            extractBloodReportText(analysisFile),
            isImageFile ? 120000 : 45000,
            isImageFile
              ? "Image text extraction is taking longer than expected."
              : "Text extraction took too long on this device. Trying server-side analysis next."
          );

          if (!extractedText) {
            throw new Error("No readable report text was found in the selected file.");
          }

          extractedReportText = extractedText.trim();
          setAnalysisText(extractedText);
        } catch (error) {
          if (isPdfFile) {
            fileDataUrl = await readFileAsDataUrl(analysisFile);
          } else {
            throw new Error(
              error instanceof Error && error.message
                ? `${error.message} Please upload a clearer blood report image or paste the report text manually.`
                : "Could not read text from this image. Please upload a clearer blood report image or paste the report text manually."
            );
          }
        } finally {
          setIsExtractingText(false);
        }
      }

      const shouldUsePdfFallback = Boolean(
        analysisFile && !extractedReportText && isPdfFile
      );

      if (!analysisFile && manualReportText.trim()) {
        fileName = "manual-blood-report.txt";
      }

      if (analysisFile && (shouldUsePdfFallback || !extractedReportText)) {
        fileDataUrl = await readFileAsDataUrl(analysisFile);
      }

      const res = await fetch(apiUrl("/api/user-dashboard/blood-report-analyzer"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName,
          mimeType,
          fileDataUrl,
          reportText: extractedReportText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Blood report analysis failed");

      setAnalysisResult(data.analysis || null);
      resetAnalyzerForm();
      toast({
        title: "Analysis ready",
        description: "The blood report has been interpreted and added to your dashboard.",
      });
      await loadDashboard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  const extractTextFromFile = async () => {
    if (!analysisFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Choose an image or PDF first.",
      });
      return;
    }

    if (!analysisFile.type.startsWith("image/") && analysisFile.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Only images and PDFs can be used for text extraction.",
      });
      return;
    }

    setIsExtractingText(true);
    try {
      const extractedText = await withTimeout(
        extractBloodReportText(analysisFile),
        analysisFile.type.startsWith("image/") ? 120000 : 45000,
        analysisFile.type.startsWith("image/")
          ? "Image text extraction is taking longer than expected. Try a clearer blood report image."
          : "Text extraction took too long. Try a clearer file or paste the report text manually."
      );

      if (!extractedText) {
        throw new Error("No readable report text was found in the selected file.");
      }

      setAnalysisText(extractedText);
      toast({
        title: "Text extracted",
        description: "Review the extracted text, then run analysis.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Text extraction failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsExtractingText(false);
    }
  };

  const resetAnalyzerForm = () => {
    setAnalysisFile(null);
    setAnalysisText("");
    setManualParameters(emptyManualParameters());
    setAnalysisResult(null);
    if (analysisFileInputRef.current) {
      analysisFileInputRef.current.value = "";
    }
  };

  const deleteSavedAnalysis = async (analysisId?: string) => {
    if (!analysisId) return;

    try {
      const res = await fetch(apiUrl(`/api/user-dashboard/blood-report-analyzer/${analysisId}`), {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Could not delete saved report");

      setAnalysisHistory((current) => current.filter((item) => item.id !== analysisId));
      setAnalysisResult((current) => (current?.id === analysisId ? null : current));
      toast({
        title: "Report deleted",
        description: "The saved blood report analysis was removed.",
      });
      await loadDashboard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const submitRequest = async () => {
    setIsBusy(true);
    try {
      const payload = {
        patientName: requestForm.patientName,
        bloodGroup: requestForm.bloodGroup,
        units: Number(requestForm.units || 0),
        hospitalName: requestForm.hospitalName,
        city: requestForm.city,
        reason: requestForm.reason,
        patientCondition: requestForm.patientCondition,
        notes: requestForm.notes,
      };

      const res = await fetch(apiUrl("/api/user-dashboard/requests"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request submission failed");

      setRequestForm({
        patientName: "",
        bloodGroup: profile.bloodGroup || "A+",
        units: "",
        hospitalName: "",
        city: profile.city || "",
        reason: "",
        patientCondition: "",
        notes: "",
      });
      await loadDashboard();
      toast({ title: "Request submitted", description: "Your blood request has been created." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Request submission failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const saveDonation = async () => {
    setIsBusy(true);
    try {
      const payload = {
        hospitalName: donationForm.hospitalName,
        bloodGroup: donationForm.bloodGroup,
        unitsDonated: Number(donationForm.unitsDonated || 0),
        donationDate: donationForm.donationDate,
      };

      const res = await fetch(apiUrl("/api/user-dashboard/donations"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Donation record save failed");

      setDonationForm({
        hospitalName: "",
        bloodGroup: profile.bloodGroup || "A+",
        unitsDonated: "",
        donationDate: new Date().toISOString().slice(0, 10),
      });
      await loadDashboard();
      toast({ title: "Donation recorded", description: "Your donation history has been updated." });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "user") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Hey {user?.name || "User"}, welcome to your dashboard
            </h1>
            <p className="text-muted-foreground">Track eligibility, requests, donations, nearby hospitals, and alerts.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Blood Group</CardDescription>
              <CardTitle>{displayOverview.bloodGroup}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Donations</CardDescription>
              <CardTitle>{displayOverview.totalDonations}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Donation</CardDescription>
              <CardTitle>{formatDate(displayOverview.lastDonationDate)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Availability Status</CardDescription>
              <CardTitle className="text-foreground">
                {availabilityText}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className={displayOverview.isEligible ? "border-emerald-500/40" : "border-amber-500/40"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" />
              Donation Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{displayDonationReminder}</CardContent>
        </Card>

        <button
          type="button"
          onClick={() => setIsAnalyzerOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(225,29,72,0.35)] transition hover:scale-[1.02] hover:shadow-[0_24px_55px_rgba(225,29,72,0.42)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">Report Analyzer</span>
        </button>

        {isAnalyzerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,#eef2f7_0%,#f7f2f2_100%)] shadow-2xl">
        <div className="py-2">
          <div className="pb-5">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsAnalyzerOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </button>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  AI Blood Report Analyzer
                </CardTitle>
                <CardDescription className="max-w-3xl text-slate-600">
                  Upload a blood report, paste report text, or enter manual values. The analyzer extracts major biomarkers, compares them with reference ranges, and summarizes donation readiness.
                </CardDescription>
              </div>
              {analysisResult?.donationEligibility?.label ? (
                <Badge variant={getDonationBadgeVariant(analysisResult.donationEligibility.status)} className="w-fit self-start lg:self-center">
                  {analysisResult.donationEligibility.label}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="px-0 py-4 sm:py-6">
            <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="p-1">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <Upload className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900">Upload Your Blood Report</p>
                      <p className="text-xs text-slate-500">Supported formats: PDF, JPG, PNG</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="blood-report-file">Blood report file</Label>
                    <Input
                      ref={analysisFileInputRef}
                      id="blood-report-file"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const nextFile = e.target.files?.[0] || null;
                        setAnalysisFile(nextFile);
                        setAnalysisText("");
                        setManualParameters(emptyManualParameters());
                        if (nextFile && (nextFile.type.startsWith("image/") || nextFile.type === "application/pdf")) {
                          void warmUpBloodReportOcr().catch(() => undefined);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {analysisFile ? analysisFile.name : "No file selected yet. You can still paste text or enter values manually."}
                    </p>
                  </div>
                </div>

                <div className="p-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-900">Paste report text</p>
                  </div>
                  <Textarea
                    id="blood-report-text"
                    className="mt-3 min-h-[150px] border-slate-200 bg-slate-50/70"
                    placeholder="OCR text will appear here automatically for images/PDFs. You can also paste report text manually to improve accuracy."
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                  />
                </div>

                <div className="p-1">
                  <p className="text-sm font-semibold text-slate-900">Or Enter Values Manually</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Input placeholder="Hemoglobin" value={manualParameters.hemoglobin} onChange={(e) => setManualParameters((prev) => ({ ...prev, hemoglobin: e.target.value }))} />
                    <Input placeholder="WBC" value={manualParameters.wbc} onChange={(e) => setManualParameters((prev) => ({ ...prev, wbc: e.target.value }))} />
                    <Input placeholder="RBC" value={manualParameters.rbc} onChange={(e) => setManualParameters((prev) => ({ ...prev, rbc: e.target.value }))} />
                    <Input placeholder="Platelets" value={manualParameters.platelets} onChange={(e) => setManualParameters((prev) => ({ ...prev, platelets: e.target.value }))} />
                    <Input placeholder="Cholesterol" value={manualParameters.cholesterol} onChange={(e) => setManualParameters((prev) => ({ ...prev, cholesterol: e.target.value }))} />
                    <Input placeholder="Glucose" value={manualParameters.glucose} onChange={(e) => setManualParameters((prev) => ({ ...prev, glucose: e.target.value }))} />
                    <Input placeholder="Hematocrit" value={manualParameters.hematocrit} onChange={(e) => setManualParameters((prev) => ({ ...prev, hematocrit: e.target.value }))} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Manual entry remains available as the fastest fallback when OCR is unclear.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={extractTextFromFile}
                    disabled={!analysisFile || isExtractingText || isAnalyzingReport}
                    className="w-full"
                  >
                    {isExtractingText ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting text
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Extract Text From File
                      </>
                    )}
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={analyzeBloodReport} disabled={isAnalyzingReport || isBusy} className="w-full bg-blue-600 hover:bg-blue-700">
                      {isAnalyzingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing report
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Analyze Report
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetAnalyzerForm} disabled={isAnalyzingReport} className="w-full">
                      <Eraser className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="px-1 py-2 text-xs leading-5 text-slate-600">
                  The analyzer compares hemoglobin, WBC, RBC, platelets, cholesterol, glucose, and other detected values against common adult reference ranges.
                </div>

                <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="p-1">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <History className="h-4 w-4 text-rose-600" />
                        Previous Results
                      </span>
                      {isHistoryOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {analysisHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Saved analyses will appear here.</p>
                    ) : (
                      analysisHistory.map((item) => (
                        <div
                          key={item.id || `${item.fileName}-${item.createdAt}`}
                          className={`rounded-2xl border p-3 transition-colors ${
                            analysisResult?.id === item.id ? "border-rose-300 bg-rose-50/70" : "border-slate-200 bg-slate-50/60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setAnalysisResult(item)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{item.fileName}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)} | {item.donationEligibility.label}</p>
                              </div>
                              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                              {(item.parameters || []).slice(0, 3).map((parameter) => (
                                <p key={`${item.id || item.fileName}-${parameter.slug}`} className="truncate">
                                  {parameter.name}: {parameter.value} {parameter.unit} ({parameter.status})
                                </p>
                              ))}
                              {item.parameters.length > 3 ? <p className="text-slate-500">Click to view full result</p> : null}
                            </div>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => void deleteSavedAnalysis(item.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="space-y-4">
                {analysisResult ? (
                  <div className="overflow-hidden rounded-[30px] border border-slate-300 bg-white shadow-sm">
                    <div className="border-b border-slate-300 bg-slate-100/90 px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-slate-900">{analysisResult.fileName}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 sm:p-6">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Parameters</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">{analysisResult.parameters.length}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500">Out of range</p>
                              <p className="mt-1 text-lg font-semibold text-rose-700">
                                {analysisResult.parameters.filter((parameter) => parameter.status !== "normal").length}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Saved on</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(analysisResult.createdAt)}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setAnalysisDetail({ title: "Plain-language summary", description: "Full report summary", body: analysisResult.summary })}
                            className="w-full rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                          >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Health Summary</p>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{analysisResult.summary}</p>
                          </div>
                          <Eye className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </button>

                          <div className="overflow-hidden rounded-[24px] border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">Detected Parameters</p>
                              <p className="text-xs text-slate-500">Click result to get more explanation.</p>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {analysisResult.parameters.map((parameter) => (
                                <button
                                  key={parameter.slug}
                              type="button"
                              onClick={() => setAnalysisDetail({
                                title: parameter.name,
                                description: `${parameter.value} ${parameter.unit} | ${parameter.referenceRange} | ${parameter.status}`,
                                body: parameter.explanation,
                              })}
                              className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[1.3fr_1fr_1fr_auto]"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">{parameter.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{parameter.referenceRange}</p>
                              </div>
                              <p className="text-sm text-slate-700">{parameter.value} {parameter.unit}</p>
                              <p className="text-sm text-slate-600 line-clamp-2">{parameter.explanation}</p>
                              <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getParameterTone(parameter.status)}`}>
                                  {parameter.status}
                                </span>
                                <Eye className="h-4 w-4 text-slate-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                          <Collapsible open={isAnalysisGuidanceOpen} onOpenChange={setIsAnalysisGuidanceOpen} className="rounded-[24px] border border-slate-200 bg-slate-50/70">
                            <CollapsibleTrigger asChild>
                              <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Detailed Guidance</p>
                                  <p className="text-xs text-slate-500">Open for eligibility notes, insights, diet, lifestyle, and disclaimer.</p>
                                </div>
                                {isAnalysisGuidanceOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 border-t border-slate-200 px-4 py-4">
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                                    Donation Eligibility
                                  </p>
                                  <div className="mt-3 space-y-2">
                                    {analysisResult.donationEligibility.reasons.map((item, index) => (
                                      <button
                                        key={`${item}-${index}`}
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Donation eligibility note", description: analysisResult.donationEligibility.label, body: item })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white"
                                      >
                                        <span>{item}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ))}
                                    {analysisResult.donationEligibility.nextStep ? (
                                      <button
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Recommended next step", description: analysisResult.donationEligibility.label, body: analysisResult.donationEligibility.nextStep || "" })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-100/70 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-amber-100"
                                      >
                                        <span>{analysisResult.donationEligibility.nextStep}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="rounded-[24px] border border-rose-200 bg-rose-50/60 p-4">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <Sparkles className="h-4 w-4 text-rose-600" />
                                    Health Insights
                                  </p>
                                  <div className="mt-3 space-y-2">
                                    {analysisResult.insights.map((item, index) => (
                                      <button
                                        key={`${item}-${index}`}
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Health insight", description: analysisResult.fileName, body: item })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white"
                                      >
                                        <span>{item}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ))}
                                    {analysisResult.precautions.map((item, index) => (
                                      <button
                                        key={`${item}-${index}`}
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Precaution", description: "Follow-up safety note", body: item })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                                      >
                                        <span>{item}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-4">
                                  <p className="text-sm font-semibold text-slate-900">Diet Recommendations</p>
                                  <div className="mt-3 space-y-2">
                                    {analysisResult.dietSuggestions.map((item, index) => (
                                      <button
                                        key={`${item}-${index}`}
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Diet recommendation", description: analysisResult.fileName, body: item })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/70 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white"
                                      >
                                        <span>{item}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-[24px] border border-sky-200 bg-sky-50/60 p-4">
                                  <p className="text-sm font-semibold text-slate-900">Lifestyle Tips</p>
                                  <div className="mt-3 space-y-2">
                                    {analysisResult.lifestyleSuggestions.map((item, index) => (
                                      <button
                                        key={`${item}-${index}`}
                                        type="button"
                                        onClick={() => setAnalysisDetail({ title: "Lifestyle tip", description: analysisResult.fileName, body: item })}
                                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-white/70 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white"
                                      >
                                        <span>{item}</span>
                                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {analysisResult.disclaimer ? (
                                <button
                                  type="button"
                                  onClick={() => setAnalysisDetail({ title: "Medical disclaimer", description: "Important note", body: analysisResult.disclaimer || "" })}
                                  className="flex w-full items-start justify-between gap-3 rounded-[24px] border border-amber-200 bg-amber-50/90 p-4 text-left text-xs leading-6 text-amber-900 transition hover:bg-amber-50"
                                >
                                  <span className="line-clamp-3">{analysisResult.disclaimer}</span>
                                  <Eye className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                                </button>
                              ) : null}
                            </CollapsibleContent>
                          </Collapsible>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                    <div className="max-w-md space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <FileText className="h-7 w-7 text-rose-600" />
                      </div>
                      <p className="text-lg font-semibold text-slate-900">No analyzed report yet</p>
                      <p className="text-sm text-muted-foreground">
                        Upload a blood test report to generate a structured interpretation, health insights, and a blood donation suggestion.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
        )}

        <Dialog open={Boolean(analysisDetail)} onOpenChange={(open) => !open && setAnalysisDetail(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{analysisDetail?.title}</DialogTitle>
              <DialogDescription>{analysisDetail?.description}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {analysisDetail?.body}
            </div>
          </DialogContent>
        </Dialog>


        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                Profile Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input value={profile.age} placeholder="24" type="number" min={18} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={profile.bloodGroup} onValueChange={(value) => setProfile((p) => ({ ...p, bloodGroup: value }))}>
                    <SelectTrigger><SelectValue placeholder="Blood group" /></SelectTrigger>
                    <SelectContent>{bloodGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={profile.city} placeholder="Bengaluru" onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={profile.phone} placeholder="+91 98765 43210" onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Last Donation Date</Label>
                  <Input type="date" value={profile.lastDonationDate} onChange={(e) => setProfile((p) => ({ ...p, lastDonationDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Available to Donate</Label>
                  <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={profile.isAvailable}
                      aria-label="Toggle donor availability"
                      onClick={() => setProfile((p) => ({ ...p, isAvailable: !p.isAvailable }))}
                      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        profile.isAvailable ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
                          profile.isAvailable ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-sm text-muted-foreground">{profile.isAvailable ? "Available" : "Unavailable"}</span>
                  </div>
                </div>
              </div>
              <Button onClick={saveProfile} disabled={isBusy}>Save Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Create Blood Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Patient name"
                  value={requestForm.patientName}
                  onChange={(e) => setRequestForm((p) => ({ ...p, patientName: e.target.value }))}
                />
                <Select value={requestForm.bloodGroup} onValueChange={(value) => setRequestForm((p) => ({ ...p, bloodGroup: value }))}>
                  <SelectTrigger><SelectValue placeholder="Blood group" /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent>
                </Select>
                <Input
                  placeholder="Units needed"
                  type="number"
                  min={1}
                  value={requestForm.units}
                  onChange={(e) => setRequestForm((p) => ({ ...p, units: e.target.value }))}
                />
                <Input
                  placeholder="Hospital name"
                  value={requestForm.hospitalName}
                  onChange={(e) => setRequestForm((p) => ({ ...p, hospitalName: e.target.value }))}
                />
                <Input
                  placeholder="Reason (e.g. surgery, accident)"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm((p) => ({ ...p, reason: e.target.value }))}
                />
                <Input
                  placeholder="City"
                  value={requestForm.city}
                  onChange={(e) => setRequestForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <Textarea
                className="min-h-[64px]"
                placeholder="Patient condition (e.g. emergency surgery tomorrow, ICU support needed)"
                value={requestForm.patientCondition}
                onChange={(e) => setRequestForm((p) => ({ ...p, patientCondition: e.target.value }))}
              />
              <Textarea
                placeholder="Additional notes"
                value={requestForm.notes}
                onChange={(e) => setRequestForm((p) => ({ ...p, notes: e.target.value }))}
              />
              <Button onClick={submitRequest} disabled={isBusy}>Submit Request</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card id="dashboard-notifications" className="h-[380px] flex flex-col scroll-mt-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Nearby Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto pr-1 text-sm">
              {displayNearbyHospitals.length === 0 && (
                <p className="text-muted-foreground">No nearby hospitals available for your current city.</p>
              )}
              {displayNearbyHospitals.map((hospital) => (
                <Dialog key={hospital.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <p className="font-medium">{hospital.name}</p>
                      <p className="text-muted-foreground">{hospital.location || "Location not shared"}</p>
                      <p className="text-muted-foreground">{hospital.phone || "Phone not shared"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Stock: {hospital.availableBloodGroups?.length ? hospital.availableBloodGroups.join(", ") : "No stock data"}
                      </p>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{hospital.name}</DialogTitle>
                      <DialogDescription>Hospital contact and blood stock details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{hospital.location || "Not shared"}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground">{hospital.phone || "Not shared"}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{hospital.email || "Not shared"}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Available Blood Groups</p>
                        <p className="text-muted-foreground">
                          {hospital.availableBloodGroups?.length ? hospital.availableBloodGroups.join(", ") : "No stock data"}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>

          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Available Blood Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground sticky top-0 bg-background">
                    <tr><th className="py-2">Hospital</th><th>Group</th><th>Units</th><th className="text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {displayAvailableBloodInfo.map((item) => (
                      <tr
                        key={item.id}
                        className="group border-t transition-colors hover:bg-rose-50/70"
                      >
                        <td className="py-3 font-medium transition-colors group-hover:text-rose-700">{item.hospitalName}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{item.bloodGroup}</td>
                        <td className="py-3 transition-colors group-hover:text-foreground">{item.units}</td>
                        <td className="py-3 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="transition-colors group-hover:border-rose-300 group-hover:bg-white"
                              >
                                Contact
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{item.hospitalName}</DialogTitle>
                                <DialogDescription>Blood inventory contact details</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Available Blood</p>
                                  <p className="text-muted-foreground">{item.bloodGroup} - {item.units} units</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Location</p>
                                  <p className="text-muted-foreground">{item.location || "Not shared"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Phone</p>
                                  <p className="text-muted-foreground">{item.phone || "Not shared"}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                  <p className="font-medium">Email</p>
                                  <p className="text-muted-foreground">{item.email || "Not shared"}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto pr-1 text-sm">
              {displayNotifications.map((item) => (
                <Dialog key={item.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-muted-foreground">{item.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{item.title}</DialogTitle>
                      <DialogDescription>Notification details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Summary</p>
                        <p className="text-muted-foreground">{item.message}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Date</p>
                        <p className="text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Details</p>
                        <p className="text-muted-foreground">{item.details || "No additional details available."}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>

          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Emergency Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto pr-1 text-sm">
              {displayEmergencyRequests.length === 0 && (
                <p className="text-muted-foreground">No emergency matches available right now for your blood group.</p>
              )}
              {displayEmergencyRequests.map((item) => (
                <Dialog key={item.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-red-400/30 p-3 text-left transition-colors hover:border-red-400/50 hover:bg-red-50/40"
                    >
                      <p className="font-medium">{item.hospitalName}</p>
                      <p>{item.bloodGroup} - {item.units} units</p>
                      <p className="text-muted-foreground">{item.location || "Location not shared"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Requested: {formatDate(item.requestDate)}</p>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{item.hospitalName}</DialogTitle>
                      <DialogDescription>Emergency request details and hospital contact information.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Blood Requirement</p>
                        <p className="text-muted-foreground">{item.bloodGroup} - {item.units} units</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Status</p>
                        <p className="text-muted-foreground capitalize">{item.status}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Requested On</p>
                        <p className="text-muted-foreground">{formatDate(item.requestDate)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{item.location || "Not shared"}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground">{item.phone || "Not shared"}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{item.email || "Not shared"}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-primary" />
                Add Donation Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Hospital name"
                  value={donationForm.hospitalName}
                  onChange={(e) => setDonationForm((p) => ({ ...p, hospitalName: e.target.value }))}
                />
                <Select value={donationForm.bloodGroup} onValueChange={(value) => setDonationForm((p) => ({ ...p, bloodGroup: value }))}>
                  <SelectTrigger><SelectValue placeholder="Blood group" /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent>
                </Select>
                <Input
                  placeholder="Units donated"
                  type="number"
                  min={1}
                  value={donationForm.unitsDonated}
                  onChange={(e) => setDonationForm((p) => ({ ...p, unitsDonated: e.target.value }))}
                />
                <Input
                  type="date"
                  value={donationForm.donationDate}
                  onChange={(e) => setDonationForm((p) => ({ ...p, donationDate: e.target.value }))}
                />
              </div>
              <Button onClick={saveDonation} disabled={isBusy}>Save Donation</Button>
            </CardContent>
          </Card>

          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle>Donation History</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground sticky top-0 bg-background">
                    <tr><th className="py-2">Hospital</th><th>Group</th><th>Units</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {displayDonationHistory.map((record, index) => (
                      <tr key={record._id || `${record.hospitalName}-${index}`} className="border-t">
                        <td className="py-2">{record.hospitalName}</td>
                        <td>{record.bloodGroup}</td>
                        <td>{record.unitsDonated}</td>
                        <td>{formatDate(record.donationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto pr-1 text-sm">
              {displayRecentActivities.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p>{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(item.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="h-[380px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Blood Donation Guidelines
              </CardTitle>
              <CardDescription>Important health information to review before donating blood.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-1">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <div className="border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pre-Donation Advisory</p>
                    <p className="text-xs text-slate-500">Review these standard safety checks before proceeding.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {donationGuidelines.map((guideline) => (
                    <div key={guideline} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <p className="text-sm leading-6 text-slate-700">{guideline}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
