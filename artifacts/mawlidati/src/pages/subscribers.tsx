import { useState } from "react";
import { 
  useListSubscribers, 
  useCreateSubscriber, 
  useUpdateSubscriber, 
  useDeleteSubscriber,
  SubscriberStatus,
  getListSubscribersQueryKey,
  useListGenerators
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Zap, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Subscribers() {
  const { isWorker } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [generatorId, setGeneratorId] = useState<number | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: generators } = useListGenerators({
    query: { enabled: !isWorker }
  });

  const activeGenId = generatorId || (generators?.[0]?.id);

  const { data: subscribers, isLoading } = useListSubscribers(
    { search: debouncedSearch, generatorId: activeGenId },
    { query: { enabled: true } }
  );

  const createMutation = useCreateSubscriber();
  const updateMutation = useUpdateSubscriber();
  const deleteMutation = useDeleteSubscriber();

  const handleCreateOrUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!activeGenId) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار المولد" });
      return;
    }

    const data = {
      name: formData.get("name") as string,
      breakerOwnerName: formData.get("breakerOwnerName") as string,
      phoneNumber: (formData.get("phoneNumber") as string) || null,
      defaultAmperes: Number(formData.get("defaultAmperes")),
      status: (formData.get("status") as SubscriberStatus) || SubscriberStatus.active,
    };

    if (editingSub) {
      updateMutation.mutate({
        id: editingSub.id,
        data
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({ generatorId: activeGenId }) });
          setEditingSub(null);
          toast({ title: "تم التعديل بنجاح" });
        }
      });
    } else {
      createMutation.mutate({
        data: { ...data, generatorId: activeGenId }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({ generatorId: activeGenId }) });
          setIsCreateOpen(false);
          toast({ title: "تم الإضافة بنجاح" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟ لا يمكن استرجاع البيانات.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({ generatorId: activeGenId }) });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">المشتركين</h1>
        
        {!isWorker && (
          <Dialog open={isCreateOpen || !!editingSub} onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingSub(null);
            } else {
              setIsCreateOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-12">
                <Plus className="mr-2 h-5 w-5" />
                إضافة مشترك
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingSub ? "تعديل المشترك" : "مشترك جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4 pt-4">
                {!editingSub && generators && generators.length > 1 && (
                  <div className="space-y-2">
                    <Label>المولد</Label>
                    <Select value={String(activeGenId)} onValueChange={(v) => setGeneratorId(Number(v))}>
                      <SelectTrigger className="h-12">
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
                <div className="space-y-2">
                  <Label>اسم المشترك</Label>
                  <Input name="name" defaultValue={editingSub?.name} required className="h-12" placeholder="الاسم الكامل" />
                </div>
                <div className="space-y-2">
                  <Label>اسم أبو الخبطة (صاحب القاطع)</Label>
                  <Input name="breakerOwnerName" defaultValue={editingSub?.breakerOwnerName} required className="h-12" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الأمبيرية</Label>
                    <Input name="defaultAmperes" defaultValue={editingSub?.defaultAmperes} type="number" step="0.5" required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف (اختياري)</Label>
                    <Input name="phoneNumber" defaultValue={editingSub?.phoneNumber} type="tel" className="h-12 text-left" dir="ltr" />
                  </div>
                </div>
                {editingSub && (
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select name="status" defaultValue={editingSub.status}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SubscriberStatus.active}>فعال</SelectItem>
                        <SelectItem value={SubscriberStatus.paused}>متوقف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full h-12 mt-4" disabled={createMutation.isPending || updateMutation.isPending}>
                  حفظ
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن اسم أو أبو الخبطة..." 
            className="pl-3 pr-10 h-12 text-lg shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : subscribers?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <p>لا يوجد مشتركين مطابقين للبحث</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {subscribers?.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{sub.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          أبو الخبطة: <span className="font-semibold text-foreground">{sub.breakerOwnerName}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={sub.status === SubscriberStatus.active ? "default" : "secondary"}>
                          {sub.status === SubscriberStatus.active ? "فعال" : "متوقف"}
                        </Badge>
                        {!isWorker && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditingSub(sub)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(sub.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-md font-bold">
                        <Zap className="h-4 w-4" />
                        <span>{sub.defaultAmperes} أمبير</span>
                      </div>
                      
                      {sub.currentDebt > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground">الديون</span>
                          <span className="font-bold text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {formatCurrency(sub.currentDebt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">لا توجد ديون</span>
                      )}
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