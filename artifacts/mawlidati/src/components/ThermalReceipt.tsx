import React from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatus } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";

interface ThermalReceiptProps {
  id: number;
  generatorName: string;
  receiptDate: string;
  subscriberName: string;
  breakerOwnerName: string;
  amperes: number;
  pricePerAmpere: number;
  previousDebt: number;
  amountExpected: number;
  amountReceived: number;
  status: InvoiceStatus;
}

const statusText = {
  [InvoiceStatus.paid]: "مدفوع",
  [InvoiceStatus.partial]: "جزئي",
  [InvoiceStatus.unpaid]: "غير مدفوع",
};

export function ThermalReceipt({
  id,
  generatorName,
  receiptDate,
  subscriberName,
  breakerOwnerName,
  amperes,
  pricePerAmpere,
  previousDebt,
  amountExpected,
  amountReceived,
  status,
}: ThermalReceiptProps) {
  const balanceRemaining = amountExpected - amountReceived;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="receipt hidden print:block text-black bg-white p-4 w-[58mm] text-sm leading-tight text-center font-sans mx-auto border shadow-sm">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .receipt, .receipt * { visibility: visible; }
              .receipt { position: absolute; left: 0; top: 0; width: 58mm; padding: 0; margin: 0; }
            }
          `}
        </style>
        <h2 className="font-bold text-xl mb-1 border-b border-black pb-1">مولدتي</h2>
        <div className="mb-2 text-xs">
          <div>{generatorName}</div>
          <div>التاريخ: {formatDate(receiptDate)}</div>
        </div>
        
        <div className="text-right border-b border-black pb-2 mb-2 text-xs space-y-1">
          <div>المشترك: {subscriberName}</div>
          <div>أبو الخبطة: {breakerOwnerName}</div>
        </div>

        <table className="w-full text-right text-xs mb-2">
          <tbody>
            <tr>
              <td className="py-1">الأمبيرية</td>
              <td className="py-1 font-bold">{amperes}</td>
            </tr>
            <tr>
              <td className="py-1">سعر الأمبير</td>
              <td className="py-1">{formatCurrency(pricePerAmpere)}</td>
            </tr>
            <tr>
              <td className="py-1">الديون السابقة</td>
              <td className="py-1">{formatCurrency(previousDebt)}</td>
            </tr>
            <tr className="border-t border-black font-bold">
              <td className="py-1">المبلغ المطلوب</td>
              <td className="py-1">{formatCurrency(amountExpected)}</td>
            </tr>
            <tr>
              <td className="py-1">المبلغ المستلم</td>
              <td className="py-1">{formatCurrency(amountReceived)}</td>
            </tr>
            <tr className="border-t border-black font-bold">
              <td className="py-1">المتبقي</td>
              <td className="py-1">{formatCurrency(balanceRemaining)}</td>
            </tr>
            <tr>
              <td className="py-1">الحالة</td>
              <td className="py-1">{statusText[status]}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-center">
          <div className="border-2 border-black p-2 inline-block font-bold">
            رقم الفاتورة: {id}
          </div>
        </div>
        <div className="mt-4 text-[10px] text-center font-semibold">
          شكراً لتعاملكم معنا
        </div>
      </div>
      <Button onClick={handlePrint} className="w-full md:w-auto h-12" size="lg">
        <Printer className="w-5 h-5 ml-2" />
        طباعة الوصل
      </Button>
    </div>
  );
}