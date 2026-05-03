import { useState } from "react";
import { 
  useListGenerators,
  useCreateGenerator,
  useUpdateGenerator,
  useDeleteGenerator,
  getListGeneratorsQueryKey
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Factory, MapPin, DollarSign, Users, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Generators() {
  const { isOwner } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: generators, isLoading } = useListGenerators({ query: { enabled: isOwner } });
  const createGen = useCreateGenerator();
  const deleteGen = useDeleteGenerator();

  if (!isOwner) {
    return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية للوصول لهذه الصفحة.</div>;
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createGen.mutate({
      data: {
        name: formData.get("name") as string,
        location: formData.get("location") as string,
        pricePerAmpereIqd: Number(formData.get("price")),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGeneratorsQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "تم إضافة المولد بنجاح" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المولد؟ لا يمكن التراجع عن هذه الخطوة.")) {
      deleteGen.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGeneratorsQueryKey() });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">إدارة المولدات</h1>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-12">
              <Plus className="mr-2 h-5 w-5" />
              إضافة مولد جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>مولد جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>اسم المولد</Label>
                <Input name="name" required className="h-12" placeholder="مثال: مولد الأمانة" />
              </div>
              <div className="space-y-2">
                <Label>الموقع / المنطقة</Label>
                <Input name="location" required className="h-12" placeholder="المحلة أو الشارع" />
              </div>
              <div className="space-y-2">
                <Label>سعر الأمبير (د.ع)</Label>
                <Input name="price" type="number" required className="h-12" placeholder="15000" />
              </div>
              <Button type="submit" className="w-full h-12 mt-4" disabled={createGen.isPending}>
                حفظ
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : generators?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <Factory className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>لا يوجد مولدات حالياً. أضف مولداً للبدء.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence>
            {generators?.map((gen, index) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-2 hover:border-primary/50 transition-colors group">
                  <CardContent className="p-0">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-3 rounded-xl">
                            <Factory className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl">{gen.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {gen.location}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(gen.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3" /> سعر الأمبير
                          </p>
                          <p className="font-bold text-lg">{formatCurrency(gen.pricePerAmpereIqd)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <Users className="h-3 w-3" /> المشتركين
                          </p>
                          <p className="font-bold text-lg">{gen.activeSubscribersCount || 0}</p>
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