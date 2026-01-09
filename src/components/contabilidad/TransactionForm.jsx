import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";

const incomeCategories = [
  { value: "sales", label: "Sales" },
  { value: "services", label: "Services" },
  { value: "other_income", label: "Other Income" },
];

const expenseCategories = [
  { value: "salaries", label: "Salaries" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "marketing", label: "Marketing" },
  { value: "taxes", label: "Taxes" },
  { value: "insurance", label: "Insurance" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other_expense", label: "Other Expenses" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "check", label: "Check" },
];

export default function TransactionForm({ transaction, onSubmit, onCancel, isProcessing }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(transaction || {
    type: "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    payment_method: "bank_transfer",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  const currentCategories = formData.type === "income" ? incomeCategories : expenseCategories;

  return (
    <Card className="border-0 shadow-none">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-0 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('transactionType')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="income" className="text-white hover:bg-slate-800">{t('income')}</SelectItem>
                  <SelectItem value="expense" className="text-white hover:bg-slate-800">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('amount')}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {currentCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-slate-800">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('date')}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('paymentMethod')}</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value} className="text-white hover:bg-slate-800">
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-300">{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-300">{t('notes')} ({t('optional')})</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="h-20 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 px-0 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            <X className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {transaction ? t('update') : t('save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}