import { useState } from "react";
import { 
  useListInvoices,
  useCreateInvoice,
  useBulkGenerateInvoices,
  useListSubscribers,
  useListGenerators,
  InvoiceStatus,
  getListInvoicesQueryKey,
  Subscriber
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Receipt, Plus, CheckCircle2, FileText } from "lucide-react";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

export default function Invoices() {
  const { isWorker, user } = useAuth();
  const currentMonthYear = new Date().toISOString().slice(0, 7);
  
  const [monthFilter, setMonthFilter] = useState(currentMonthYear);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generatorId, setGeneratorId] = useState<number | undefined>(user?.assignedGeneratorId || undefined);
  
  const { data: generators } = useListGenerators({ query: { enabled: !isWorker } });
  const activeGenId = generatorId || (generators?.[0]?.id);

  const { data: invoices, isLoading } = useListInvoices(
    { 
      generatorId: activeGenId, 
      monthYear: monthFilter,
      status: statusFilter !== "all" ? statusFilter as InvoiceStatus : undefined
    },
    { query: { enabled: true } }
  );

  const bulkGenerate = useBulkGenerateInvoices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleBulkGenerate = () => {
    if (!activeGenId) return;
    if (confirm(`هل تريد بالتأكيد توليد فواتير شهر ${monthFilter} لجميع المشتركين؟`)) {
      bulkGenerate.mutate({
        data: {
          generatorId: activeGenId,
          monthYear: monthFilter
        }
      }, {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "تم التوليد بنجاح", description: `تم توليد ${res.generated} فاتورة، وتخطي ${res.skipped}.` });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">الفواتير والجباية</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {!isWorker && (
            <Button onClick={handleBulkGenerate} disabled={bulkGenerate.isPending} variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12">
              <FileText className="mr-2 h-5 w-5" />
              توليد للشهر
            </Button>
          )}
          <RecordPaymentModal activeGenId={activeGenId} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-xl shadow-sm">
        {!isWorker && generators && (
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
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-10 text-left"
            dir="ltr"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">الحالة</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value={InvoiceStatus.paid}>مدفوع</SelectItem>
              <SelectItem value={InvoiceStatus.partial}>جزئي</SelectItem>
              <SelectItem value={InvoiceStatus.unpaid}>غير مدفوع</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : invoices?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <Receipt className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>لا توجد فواتير مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {invoices?.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{invoice.subscriber?.name}</h3>
                          <Badge variant="outline" className={
                            invoice.status === InvoiceStatus.paid ? "bg-green-50 text-green-700 border-green-200" :
                            invoice.status === InvoiceStatus.partial ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }>
                            {invoice.status === InvoiceStatus.paid ? "مدفوع" :
                             invoice.status === InvoiceStatus.partial ? "جزئي" : "غير مدفوع"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          رقم الفاتورة: {invoice.id} • التاريخ: {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex sm:flex-col justify-between sm:justify-center items-end bg-muted/30 p-3 rounded-lg min-w-[150px]">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">المطلوب</p>
                          <p className="font-bold">{formatCurrency(invoice.amountExpected)}</p>
                        </div>
                        <div className="text-right mt-2 sm:mt-1">
                          <p className="text-xs text-muted-foreground">المستلم</p>
                          <p className="font-black text-primary">{formatCurrency(invoice.amountReceived)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function RecordPaymentModal({ activeGenId }: { activeGenId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: generators } = useListGenerators();
  const generatorPrice = generators?.find(g => g.id === activeGenId)?.pricePerAmpereIqd || 0;
  const generatorName = generators?.find(g => g.id === activeGenId)?.name || "";

  const { data: subscribers } = useListSubscribers(
    { search: debouncedSearch, generatorId: activeGenId },
    { query: { enabled: isOpen && debouncedSearch.length > 0 && !selectedSub } }
  );

  const createInvoice = useCreateInvoice();

  const amountExpected = selectedSub 
    ? (selectedSub.defaultAmperes * generatorPrice) + selectedSub.currentDebt 
    : 0;

  const currentAmountReceived = Number(amountReceived) || 0;
  const currentBalance = amountExpected - currentAmountReceived;
  let computedStatus = InvoiceStatus.unpaid;
  if (currentAmountReceived >= amountExpected && amountExpected > 0) computedStatus = InvoiceStatus.paid;
  else if (currentAmountReceived > 0) computedStatus = InvoiceStatus.partial;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !activeGenId) return;

    createInvoice.mutate({
      data: {
        subscriberId: selectedSub.id,
        generatorId: activeGenId,
        amperes: selectedSub.defaultAmperes,
        previousDebt: selectedSub.currentDebt,
        amountReceived: currentAmountReceived,
        monthYear: new Date().toISOString().slice(0, 7),
        notes: notes || null
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        setCreatedInvoice(data);
        toast({ title: "تم تسجيل الدفعة بنجاح" });
      }
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedSub(null);
      setSearch("");
      setAmountReceived("");
      setNotes("");
      setCreatedInvoice(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto h-14 sm:h-12 text-lg sm:text-base font-bold shadow-lg bg-primary text-primary-foreground">
          <Plus className="mr-2 h-6 w-6" />
          تسجيل دفعة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{createdInvoice ? "تم التسجيل بنجاح" : "تسجيل دفعة جديدة"}</DialogTitle>
        </DialogHeader>

        {createdInvoice ? (
          <div className="py-4 space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            
            <ThermalReceipt
              id={createdInvoice.id}
              generatorName={generatorName}
              receiptDate={createdInvoice.createdAt}
              subscriberName={selectedSub?.name || ""}
              breakerOwnerName={selectedSub?.breakerOwnerName || ""}
              amperes={createdInvoice.amperes}
              pricePerAmpere={generatorPrice}
              previousDebt={createdInvoice.previousDebt}
              amountExpected={createdInvoice.amountExpected}
              amountReceived={createdInvoice.amountReceived}
              status={createdInvoice.status}
            />
            
            <Button onClick={() => handleClose(false)} variant="outline" className="w-full h-12">
              إغلاق
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {!selectedSub ? (
              <div className="space-y-2 relative">
                <Label>البحث عن المشترك</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-3 pr-9 h-12 text-lg"
                    placeholder="أدخل اسم المشترك..."
                    autoFocus
                  />
                </div>
                {debouncedSearch && subscribers && subscribers.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
                    <div className="max-h-60 overflow-y-auto p-1">
                      {subscribers.map(sub => (
                        <div 
                          key={sub.id} 
                          className="p-3 hover:bg-muted cursor-pointer rounded-md transition-colors"
                          onClick={() => {
                            setSelectedSub(sub);
                            setAmountReceived("");
                          }}
                        >
                          <div className="font-bold">{sub.name}</div>
                          <div className="text-xs text-muted-foreground">أبو الخبطة: {sub.breakerOwnerName}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-bold">{selectedSub.name}</p>
                    <p className="text-xs text-muted-foreground">أبو الخبطة: {selectedSub.breakerOwnerName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSub(null)}>تغيير</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg bg-card">
                    <p className="text-xs text-muted-foreground">الأمبيرية</p>
                    <p className="font-bold">{selectedSub.defaultAmperes} أمبير</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <p className="text-xs text-muted-foreground">الديون السابقة</p>
                    <p className="font-bold text-destructive">{formatCurrency(selectedSub.currentDebt)}</p>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
                  <p className="text-sm font-medium text-primary mb-1">المبلغ المطلوب الكلي</p>
                  <p className="text-3xl font-black text-primary">{formatCurrency(amountExpected)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">المبلغ المستلم</Label>
                  <Input 
                    type="number" 
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="h-14 text-xl font-bold"
                    placeholder="0"
                    dir="ltr"
                    required
                    min="0"
                  />
                  <div className="flex justify-between items-center px-1">
                    <Badge variant={computedStatus === InvoiceStatus.paid ? "default" : computedStatus === InvoiceStatus.partial ? "secondary" : "destructive"}>
                      {computedStatus === InvoiceStatus.paid ? "مدفوع" : computedStatus === InvoiceStatus.partial ? "جزئي" : "غير مدفوع"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      المتبقي: <span className="font-bold">{formatCurrency(currentBalance)}</span>
                    </span>
                  </div>
                </div>
                
                <Button type="submit" className="w-full h-14 text-lg font-bold mt-6" disabled={createInvoice.isPending}>
                  حفظ الدفعة
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}