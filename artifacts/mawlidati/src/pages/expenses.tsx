import { useState } from "react";
import { 
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
  useListGenerators
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, WalletCards, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Expenses() {
  const { isOwner, isAdmin } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [generatorId, setGeneratorId] = useState<number | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: generators } = useListGenerators({ query: { enabled: isOwner || isAdmin } });
  const activeGenId = generatorId || (generators?.[0]?.id);

  const { data: expenses, isLoading } = useListExpenses(
    { generatorId: activeGenId, month },
    { query: { enabled: isOwner || isAdmin } }
  );

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  if (!isOwner && !isAdmin) {
    return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية للوصول لهذه الصفحة.</div>;
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!activeGenId) return;

    createExpense.mutate({
      data: {
        generatorId: activeGenId,
        expenseType: formData.get("expenseType") as string,
        amount: Number(formData.get("amount")),
        date: formData.get("date") as string,
        notes: (formData.get("notes") as string) || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "تم إضافة المصروف بنجاح" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  const totalExpenses = expenses?.reduce((sum, ex) => sum + ex.amount, 0) || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">إدارة المصروفات</h1>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-12">
              <Plus className="mr-2 h-5 w-5" />
              إضافة مصروف
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>مصروف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>نوع المصروف</Label>
                <Input name="expenseType" required className="h-12" placeholder="غاز، صيانة، رواتب..." />
              </div>
              <div className="space-y-2">
                <Label>المبلغ (د.ع)</Label>
                <Input name="amount" type="number" required className="h-12" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input name="date" type="date" required className="h-12" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Input name="notes" className="h-12" />
              </div>
              <Button type="submit" className="w-full h-12 mt-4" disabled={createExpense.isPending}>
                حفظ
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-xl shadow-sm">
        {generators && (
          <div className="flex-1 space-y-1">
            <Label className="text-xs">المولد</Label>
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
        <div className="flex-1 space-y-1">
          <Label className="text-xs">الشهر</Label>
          <Input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 text-left"
            dir="ltr"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : expenses?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <WalletCards className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>لا توجد مصروفات مسجلة لهذا الشهر.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-lg">سجل المصروفات</CardTitle>
            <div className="text-xl font-black text-destructive">{formatCurrency(totalExpenses)}</div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(ex.date)}</TableCell>
                      <TableCell className="font-bold">{ex.expenseType}</TableCell>
                      <TableCell className="font-bold text-destructive whitespace-nowrap">{formatCurrency(ex.amount)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {ex.notes || "-"}
                      </TableCell>
                      <TableCell className="text-left">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDelete(ex.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}