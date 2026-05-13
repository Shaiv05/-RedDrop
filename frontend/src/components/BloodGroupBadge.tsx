import { cn } from "@/lib/utils";

interface BloodGroupBadgeProps {
  bloodGroup: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BloodGroupBadge = ({ bloodGroup, size = "md", className }: BloodGroupBadgeProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  return (
    <div
      className={cn(
        "blood-gradient rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-md",
        sizeClasses[size],
        className
      )}
    >
      {bloodGroup}
    </div>
  );
};

export default BloodGroupBadge;
