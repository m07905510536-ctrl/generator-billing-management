import { useState } from "react";
import { 
  useGetFinancialHistory, 
  useListGenerators
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function FinancialHistory() {
  const { isOwner } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [generatorId, setGeneratorId] = useState<number | undefined>();

  const { data: generators } = useListGenerators({ query: { enabled: isOwner } });
  const activeGenId = generatorId || (generators?.[0]?.id);

  const { data: history, isLoading } = useGetFinancialHistory(
    { generatorId: activeGenId, year },
    { query: { enabled: isOwner } }
  );

  if (!isOwner) {
    return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية للوصول لهذه الصفحة.</div>;
  }

  const yearlyRevenue = history?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const yearlyExpenses = history?.reduce((sum, item) => sum + item.expenses, 0) || 0;
  const yearlyProfit = history?.reduce((sum, item) => sum + item.netProfit, 0) || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">التاريخ المالي</h1>
        
        <div className="flex gap-4">
          <div className="w-32">
            <Label className="sr-only">السنة</Label>
            <Input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-10 text-center font-bold"
              dir="ltr"
            />
          </div>
          
          {generators && (
            <div className="w-48">
              <Label className="sr-only">المولد</Label>
              <Select value={activeGenId ? String(activeGenId) : ""} onValueChange={(v) => setGeneratorId(Number(v))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر المولد" />
                </SelectTrigger>
                <SelectContent>
                  {generators.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary">{formatCurrency(yearlyRevenue)}</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصروفات ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-destructive">{formatCurrency(yearlyExpenses)}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">صافي الأرباح ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-green-600 dark:text-green-400">{formatCurrency(yearlyProfit)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>الأداء المالي الشهري</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                {history && history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={history}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="monthYear" 
                        tickFormatter={(val) => val.split("-")[1]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `شهر ${label}`}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      />
                      <Legend />
                      <Bar name="الإيرادات" dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar name="المصروفات" dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Bar name="صافي الربح" dataKey="netProfit" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات مالية لهذه السنة
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}