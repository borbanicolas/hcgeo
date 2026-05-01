import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export function SessionTimeoutModal({ isOpen, onConfirm }: SessionTimeoutModalProps) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-[400px]">
        <AlertDialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4 mx-auto">
            <LogOut className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Sessão Expirada</AlertDialogTitle>
          <AlertDialogDescription className="text-center pt-2">
            Sessão expirada faça o login novamente
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center mt-4">
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
          >
            Fazer Login Novamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
