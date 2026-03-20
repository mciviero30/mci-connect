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
    <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-slate-900 dark:text-white">{t('transactionList')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                <TableHead className="text-slate-700 dark:text-slate-300">{t('date')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('type')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('category')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('description')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('paymentMethod')}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{t('amount')}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500 dark:text-slate-400">{t('noTransactions')}</TableCell>
                </TableRow>
              ) : (
                transactions.map(transaction => (
                  <TableRow key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                    <TableCell className="text-slate-900 dark:text-slate-300">{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={transaction.type === 'income' ? 'soft-green-gradient' : 'soft-red-gradient'}>
                        {transaction.type === 'income' ? (
                          <><TrendingUp className="w-3 h-3 mr-1" />{t('income')}</>
                        ) : (
                          <><TrendingDown className="w-3 h-3 mr-1" />Expense</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-900 dark:text-slate-300 capitalize">{transaction.category.replace('_', ' ')}</TableCell>
                    <TableCell className="text-slate-900 dark:text-slate-300">{transaction.description}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 capitalize">{transaction.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell className={`text-right font-bold ${transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-slate-300'}`}>
                      ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          className="text-slate-600 dark:text-slate-400 hover:text-[#507DB4] hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(transaction.id)}
                          className="text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
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