
'use client'

import DropZone from "@/components/upload/DropZone";
import { BarChart2, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/50">
      <div className="max-w-3xl w-full text-center space-y-8 mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Autonomous Data Analysis. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Free Forever.</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Upload your CSV &rarr; AI cleans, analyzes, and generates insights in 60 seconds
        </p>
      </div>
      
      <div className="w-full max-w-2xl mb-16">
        <DropZone />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
            <BarChart2 className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">Auto EDA</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">Smart Charts</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
            <Lightbulb className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">AI Insights</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">Trend Forecasting</span>
        </div>
      </div>

      {!user && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <Link href="/signup" className="underline underline-offset-4 text-primary font-medium hover:text-primary/80">
            Create a free account
          </Link>
          {' '}to save your analyses and access them from anywhere.
        </div>
      )}
    </div>
  );
}
