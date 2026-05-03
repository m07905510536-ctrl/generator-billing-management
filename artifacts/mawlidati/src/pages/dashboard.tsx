import { useState } from "react";
import { 
  useGetDashboardSummary, 
  useGetRecentTransactions, 
  useGetInvoiceStatusBreakdown,
  InvoiceStatus
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, DollarSign, TrendingUp, Users, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function Dashboard() {
  const { isOwner, isAdmin, isWorker } = useAuth();
  
  const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(
    { monthYear: currentMonthYear },
    { query: { enabled: isOwner || isAdmin } }
  );

  const { data: recentTransactions, isLoading: loadingTransactions } = useGetRecentTransactions(
    { limit: 10 },
    { query: { enabled: true } }
  );

  const { data: breakdown, isLoading: loadingBreakdown } = useGetInvoiceStatusBreakdown(
    { monthYear: currentMonthYear },
    { query: { enabled: isOwner || isAdmin } }
  );

  if (isWorker) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">الرئيسية</h1>
        <Card>
          <CardHeader>
            <CardTitle>آخر الجبايات</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentTransactions?.length ? (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div>
                      <p className="font-bold">{tx.subscriberName}</p>
                      <p className="text-sm text-muted-foreground">أبو الخبطة: {tx.breakerOwnerName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-primary">{formatCurrency(tx.amountReceived)}</p>
                      <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                        مستلم
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">لا توجد حركات حديثة</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner/Admin Dashboard
  const pieData = breakdown ? [
    { name: "مدفوع", value: breakdown.paid, color: "hsl(var(--chart-2))" },
    { name: "جزئي", value: breakdown.partial, color: "hsl(var(--chart-3))" },
    { name: "غير مدفوع", value: breakdown.unpaid, color: "hsl(var(--chart-4))" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ملخص الإيرادات - {currentMonthYear}</h1>
      </div>

      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المتوقع كلياً</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-black">{formatCurrency(summary.totalExpectedRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المُحصّل</CardTitle>
              <Wallet className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-black">{formatCurrency(summary.totalCollected)}</div>
              <p className="text-xs opacity-80 mt-1">
                نسبة التحصيل: {summary.collectionRate}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">المتبقي ديون</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-black text-destructive">{formatCurrency(summary.totalOutstanding)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">صافي الأرباح</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-black text-green-600 dark:text-green-400">{formatCurrency(summary.netProfit)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>حالة القوائم الحالية</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loadingBreakdown ? (
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            ) : breakdown && (
              <>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, "فاتورة"]} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 w-full gap-2 mt-4 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <div className="font-bold text-green-700 dark:text-green-400">{breakdown.paid}</div>
                    <div className="text-xs text-muted-foreground">مدفوع</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                    <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                    <div className="font-bold text-amber-700 dark:text-amber-400">{breakdown.partial}</div>
                    <div className="text-xs text-muted-foreground">جزئي</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                    <AlertCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                    <div className="font-bold text-red-700 dark:text-red-400">{breakdown.unpaid}</div>
                    <div className="text-xs text-muted-foreground">غير مدفوع</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>أحدث عمليات الجباية</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentTransactions?.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المشترك</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right hidden md:table-cell">الجابي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="font-medium">{tx.subscriberName}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</div>
                        </TableCell>
                        <TableCell className="font-bold text-primary">{formatCurrency(tx.amountReceived)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            tx.status === InvoiceStatus.paid ? "bg-green-50 text-green-700 border-green-200" :
                            tx.status === InvoiceStatus.partial ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }>
                            {tx.status === InvoiceStatus.paid ? "مدفوع" :
                             tx.status === InvoiceStatus.partial ? "جزئي" : "غير مدفوع"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{tx.workerName || "المدير"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">لا توجد حركات حديثة</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}