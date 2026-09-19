import { Suspense } from "react";
import { BabyGrowthPage } from "@/components/baby-growth-page";
import { BabyGrowthPageSkeleton } from "@/components/baby-page-skeleton";

export default function BabyGrowthRoute() {
  return (
    <Suspense fallback={<BabyGrowthPageSkeleton />}>
      <BabyGrowthPage />
    </Suspense>
  );
}
