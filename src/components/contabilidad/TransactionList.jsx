import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function TransactionList({ transactions, onEdit, onDelete, loading }) {
  const { t } = useLanguage();

  return (
    <Card className="glass-card shadow-xl">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-white">{t('transactionList')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800/50 border-slate-800">
                <TableHead className="text-slate-400">{t('date')}</TableHead>
                <TableHead className="text-slate-400">{t('type')}</TableHead>
                <TableHead className="text-slate-400">{t('category')}</TableHead>
                <TableHead className="text-slate-400">{t('description')}</TableHead>
                <TableHead className="text-slate-400">{t('paymentMethod')}</TableHead>
                <TableHead className="text-right text-slate-400">{t('amount')}</TableHead>
                <TableHead className="text-right text-slate-400">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('noTransactions')}</TableCell>
                </TableRow>
              ) : (
                transactions.map(transaction => (
                  <TableRow key={transaction.id} className="hover:bg-slate-800/30 border-slate-800">
                    <TableCell className="text-slate-300">{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={transaction.type === 'income' ? 'bg-[#3B9FF3]/20 border-[#3B9FF3] text-[#3B9FF3]' : 'bg-slate-700/50 border-slate-600 text-slate-300'}>
                        {transaction.type === 'income' ? (
                          <><TrendingUp className="w-3 h-3 mr-1" />{t('income')}</>
                        ) : (
                          <><TrendingDown className="w-3 h-3 mr-1" />Expense</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300 capitalize">{transaction.category.replace('_', ' ')}</TableCell>
                    <TableCell className="text-slate-300">{transaction.description}</TableCell>
                    <TableCell className="text-slate-400 capitalize">{transaction.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell className={`text-right font-bold ${transaction.type === 'income' ? 'text-[#3B9FF3]' : 'text-slate-300'}`}>
                      ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          className="text-slate-400 hover:text-[#3B9FF3] hover:bg-slate-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(transaction.id)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}