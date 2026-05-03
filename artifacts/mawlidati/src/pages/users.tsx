import { useState } from "react";
import { 
  useListUsers,
  useCreateUser,
  useDeleteUser,
  getListUsersQueryKey,
  useListGenerators,
  UserRole
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Shield, Trash2 } from "lucide-react";

export default function UsersPage() {
  const { isOwner } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.worker);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListUsers({ query: { enabled: isOwner } });
  const { data: generators } = useListGenerators({ query: { enabled: isOwner } });
  
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  if (!isOwner) {
    return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية للوصول لهذه الصفحة.</div>;
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const genIdStr = formData.get("generatorId") as string;
    
    createUser.mutate({
      data: {
        name: formData.get("name") as string,
        username: formData.get("username") as string,
        password: formData.get("password") as string,
        role: role,
        assignedGeneratorId: genIdStr ? Number(genIdStr) : null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "تم إضافة المستخدم بنجاح" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "خطأ", description: "تأكد من إدخال بيانات صحيحة وعدم تكرار اسم المستخدم" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      deleteUser.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case UserRole.owner: return "مالك";
      case UserRole.admin: return "مدير";
      case UserRole.worker: return "جابي";
      default: return r;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-12">
              <Plus className="mr-2 h-5 w-5" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>مستخدم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input name="name" required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>اسم المستخدم للدخول (Username)</Label>
                <Input name="username" required className="h-12 text-left" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input name="password" required type="password" className="h-12 text-left" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.worker}>جابي</SelectItem>
                    <SelectItem value={UserRole.admin}>مدير</SelectItem>
                    <SelectItem value={UserRole.owner}>مالك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {role === UserRole.worker && generators && (
                <div className="space-y-2">
                  <Label>تخصيص لمولد (اختياري)</Label>
                  <Select name="generatorId">
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="اختر المولد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">لا يوجد تخصيص</SelectItem>
                      {generators.map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button type="submit" className="w-full h-12 mt-4" disabled={createUser.isPending}>
                حفظ
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : users?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>لا يوجد مستخدمين.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {users?.map((u) => (
            <Card key={u.id} className="overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{u.name}</h3>
                      <p className="text-sm text-muted-foreground" dir="ltr">@{u.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left hidden sm:block">
                      <Badge variant={u.role === UserRole.owner ? "default" : u.role === UserRole.admin ? "secondary" : "outline"}>
                        {getRoleLabel(u.role)}
                      </Badge>
                      {u.assignedGeneratorId && <p className="text-xs text-muted-foreground mt-1">تخصيص: مولد {u.assignedGeneratorId}</p>}
                    </div>
                    {u.role !== UserRole.owner && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}